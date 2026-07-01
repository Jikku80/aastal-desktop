import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SyncMeta } from './entities/sync-meta.entity';
import { SYNC_REGISTRY, SyncRegistryEntry } from './sync-registry';
import { runInsideSyncApply } from './sync-context';

const LAST_SYNC_KEY = 'lastSyncAt';

export interface ChangesResponse {
  serverTime: string;
  entities: Record<string, any[]>;
}

export interface PushResult {
  applied: string[];
  conflicts: string[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SyncMeta) private readonly metaRepo: Repository<SyncMeta>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private getRepo(entry: SyncRegistryEntry) {
    return this.dataSource.getRepository(entry.entity as any);
  }

  private getRemoteBaseUrl(): string | null {
    return this.config.get<string>('SYNC_REMOTE_BASE_URL') ?? null;
  }

  private syncSecretHeaders(): Record<string, string> {
    const secret = this.config.get<string>('SYNC_SHARED_SECRET');
    return secret ? { 'X-Sync-Secret': secret } : {};
  }

  async getLastSyncAt(): Promise<Date | null> {
    const row = await this.metaRepo.findOne({ where: { key: LAST_SYNC_KEY } });
    return row?.value ? new Date(row.value) : null;
  }

  private async setLastSyncAt(iso: string): Promise<void> {
    await this.metaRepo.save({ key: LAST_SYNC_KEY, value: iso });
  }

  // ---------------------------------------------------------------------
  // Server-side of the protocol — these run on WHICHEVER instance holds
  // the canonical data being asked about. Both the hosted/online server and
  // the Electron-bundled local server run this same code; "client" vs
  // "server" here is a role per sync operation, not a fixed instance type.
  // ---------------------------------------------------------------------

  /** GET /sync/changes — return all registered-entity rows changed since `since`. */
  async generateChangesSince(since: Date | null): Promise<ChangesResponse> {
    const entities: Record<string, any[]> = {};
    for (const entry of SYNC_REGISTRY) {
      const repo = this.getRepo(entry);
      const rows = since
        ? await repo.find({ where: { [entry.timestampField]: MoreThan(since) } as any })
        : await repo.find();
      entities[entry.name] = rows;
    }
    return { serverTime: new Date().toISOString(), entities };
  }

  /**
   * POST /sync/push — apply incoming records for one entity type using
   * last-write-wins on `timestampField`. Returns which ids were applied vs.
   * which lost to a newer local version (logged as conflicts for visibility
   * — LWW still resolves automatically, nothing blocks on this).
   */
  async applyIncoming(entityName: string, records: any[]): Promise<PushResult> {
    const entry = SYNC_REGISTRY.find((e) => e.name === entityName);
    if (!entry) throw new Error(`Unknown sync entity: ${entityName}`);
    const repo = this.getRepo(entry);
    const applied: string[] = [];
    const conflicts: string[] = [];

    // Everything written in here is the sync engine applying an
    // already-resolved record — PendingSyncSubscriber and the
    // Repository.update() patch both check isInsideSyncApply() and skip
    // their normal "mark pending" behavior for writes made inside this
    // block. Without this, every pull would immediately re-queue the same
    // rows for push, and every push confirmation would re-flag the row it
    // just confirmed — an infinite sync loop.
    await runInsideSyncApply(async () => {
      for (const incoming of records) {
        const existing = await repo.findOne({ where: { id: incoming.id } as any });
        if (!existing) {
          await repo.save({ ...incoming, syncStatus: 'synced' });
          applied.push(incoming.id);
          continue;
        }
        const incomingTs = new Date(incoming[entry.timestampField]).getTime();
        const existingTs = new Date((existing as any)[entry.timestampField]).getTime();
        if (incomingTs >= existingTs) {
          await repo.save({ ...incoming, id: incoming.id, syncStatus: 'synced' });
          applied.push(incoming.id);
        } else {
          // Local copy is newer — incoming write loses. Flag, don't overwrite.
          await repo.update({ id: incoming.id } as any, { syncStatus: 'conflict' } as any);
          conflicts.push(incoming.id);
        }
      }
    });
    return { applied, conflicts };
  }

  /** Local-instance view of sync health, used by the status endpoint and Phase 5 UI banners. */
  async getStatus() {
    const lastSyncAt = await this.getLastSyncAt();
    const perEntity: Record<string, { pending: number; conflict: number }> = {};
    let totalPending = 0;
    let totalConflict = 0;
    for (const entry of SYNC_REGISTRY) {
      const repo = this.getRepo(entry);
      const pending = await repo.count({ where: { syncStatus: 'pending' } as any });
      const conflict = await repo.count({ where: { syncStatus: 'conflict' } as any });
      perEntity[entry.name] = { pending, conflict };
      totalPending += pending;
      totalConflict += conflict;
    }
    return { lastSyncAt, totalPending, totalConflict, perEntity, remoteConfigured: !!this.getRemoteBaseUrl() };
  }

  // ---------------------------------------------------------------------
  // Client-side of the protocol — only meaningful on the offline-capable
  // (Electron-bundled local) instance, calling out to SYNC_REMOTE_BASE_URL.
  // ---------------------------------------------------------------------

  /** Pull remote changes since last sync and apply them locally. */
  async pullChanges(): Promise<{ pulled: number; conflicts: number }> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) throw new Error('SYNC_REMOTE_BASE_URL not configured — cannot pull');
    const since = await this.getLastSyncAt();
    // remote is the bare origin — every route sits under the global
    // 'api/v1' prefix (setGlobalPrefix has no exclude list). Omitting it
    // here previously made every pull 404 even with a correctly configured
    // remote URL and a live server.
    const url = `${remote}/api/v1/sync/changes${since ? `?since=${since.toISOString()}` : ''}`;
    const { data } = await firstValueFrom(
      this.http.get<ChangesResponse>(url, { headers: this.syncSecretHeaders() }),
    );

    let pulled = 0;
    let conflicts = 0;
    for (const [entityName, rows] of Object.entries(data.entities)) {
      if (!rows.length) continue;
      const result = await this.applyIncoming(entityName, rows);
      pulled += result.applied.length;
      conflicts += result.conflicts.length;
    }
    await this.setLastSyncAt(data.serverTime);
    return { pulled, conflicts };
  }

  /** Push all locally-pending records to remote. */
  async pushPending(): Promise<{ pushed: number; conflicts: number }> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) throw new Error('SYNC_REMOTE_BASE_URL not configured — cannot push');

    let pushed = 0;
    let conflicts = 0;
    for (const entry of SYNC_REGISTRY) {
      const repo = this.getRepo(entry);
      const rows = await repo.find({ where: { syncStatus: 'pending' } as any });
      if (!rows.length) continue;
      const { data } = await firstValueFrom(
        this.http.post<PushResult>(
          `${remote}/api/v1/sync/push`,
          { entityName: entry.name, records: rows },
          { headers: this.syncSecretHeaders() },
        ),
      );
      if (data.applied.length) {
        await repo.update(data.applied as any, { syncStatus: 'synced' } as any);
        pushed += data.applied.length;
      }
      if (data.conflicts.length) {
        await repo.update(data.conflicts as any, { syncStatus: 'conflict' } as any);
        conflicts += data.conflicts.length;
      }
    }
    return { pushed, conflicts };
  }

  /**
   * Pull-then-push: pulling first means a remote update to a record we're
   * about to push gets seen before we push, so the push's LWW comparison
   * (done remotely, in applyIncoming) has the freshest local updatedAt to
   * compare against. Order doesn't change correctness here — LWW is commutative
   * on timestamps — but it does avoid one extra round of conflict-flagging.
   */
  async fullSync() {
    this.logger.log('Starting full sync (pull then push)');
    const pull = await this.pullChanges();
    const push = await this.pushPending();
    this.logger.log(`Sync complete: pulled ${pull.pulled} (${pull.conflicts} conflicts), pushed ${push.pushed} (${push.conflicts} conflicts)`);
    return { pull, push };
  }
}
