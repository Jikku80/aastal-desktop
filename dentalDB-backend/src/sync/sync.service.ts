import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan, In } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as os from 'os';
import { SyncMeta } from './entities/sync-meta.entity';
import { SYNC_REGISTRY, SyncRegistryEntry, ClinicScope } from './sync-registry';
import { runInsideSyncApply } from './sync-context';
import { SyncConfigStore } from './sync-config-store';

const LAST_SYNC_KEY = 'lastSyncAt';

export interface ChangesResponse {
  serverTime: string;
  entities: Record<string, any[]>;
}

export interface PushResult {
  applied: string[];
  conflicts: string[];
  /** Records dropped because they didn't belong to the pushing device's clinic — see SyncService.recordBelongsToClinic. */
  rejected: string[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SyncMeta) private readonly metaRepo: Repository<SyncMeta>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly syncConfigStore: SyncConfigStore,
  ) {}

  private getRepo(entry: SyncRegistryEntry) {
    return this.dataSource.getRepository(entry.entity as any);
  }

  private getRemoteBaseUrl(): string | null {
    return this.config.get<string>('SYNC_REMOTE_BASE_URL') ?? null;
  }

  /**
   * Header sent on every outbound /sync/changes and /sync/push call.
   * Replaces the old static X-Sync-Secret — the token here is the
   * per-clinic credential minted by POST /sync/register-device (see
   * SyncDevicesService), read from the same file AuthService.login writes
   * to after a successful auto-registration (SyncConfigStore).
   */
  private syncDeviceHeaders(): Record<string, string> {
    const token = this.syncConfigStore.getDeviceToken();
    return token ? { 'X-Sync-Device-Token': token } : {};
  }

  async getLastSyncAt(): Promise<Date | null> {
    const row = await this.metaRepo.findOne({ where: { key: LAST_SYNC_KEY } });
    return row?.value ? new Date(row.value) : null;
  }

  private async setLastSyncAt(iso: string): Promise<void> {
    await this.metaRepo.save({ key: LAST_SYNC_KEY, value: iso });
  }

  // ---------------------------------------------------------------------
  // Clinic scoping — turns a SyncRegistryEntry's ClinicScope declaration
  // into an actual TypeORM `where` fragment / per-record check. See the
  // ClinicScope docstring in sync-registry.ts for what each variant means.
  // ---------------------------------------------------------------------

  /** Build the `where` fragment that restricts a query to one clinic's rows for this entity. */
  private async buildClinicWhere(scope: ClinicScope, clinicId: string): Promise<Record<string, any>> {
    switch (scope.type) {
      case 'direct':
        return { [scope.field ?? 'clinicId']: clinicId };
      case 'self':
        return { id: clinicId };
      case 'global':
        // Deliberately unfiltered — see ClinicScope docstring for why
        // (system-wide config, or data not owned by any single clinic).
        return {};
      case 'via': {
        const viaRepo = this.dataSource.getRepository(scope.viaEntity as any);
        const clinicField = scope.viaClinicField ?? 'clinicId';
        const parents = await viaRepo.find({ where: { [clinicField]: clinicId } as any });
        const ids = parents.map((p: any) => p.id);
        // An empty IN() is invalid/ambiguous across drivers — substitute a
        // value that can never match rather than omitting the filter
        // (omitting it would leak every clinic's rows for this entity).
        return { [scope.localField]: In(ids.length ? ids : ['__no_match__']) };
      }
    }
  }

  /** Per-record check used by applyIncoming to reject a pushed row that isn't the pushing device's own clinic's. */
  private recordBelongsToClinic(scope: ClinicScope, record: any, clinicId: string): boolean {
    if (scope.type === 'direct') return record[scope.field ?? 'clinicId'] === clinicId;
    if (scope.type === 'self') return record.id === clinicId;
    // 'via' and 'global' entities aren't cheaply verifiable per-record
    // without an extra query per row — allowed through for now. Flagging
    // rather than silently pretending this is fully closed: a compromised
    // device could still push a mismatched ConsentSubmission/IntakeFormSubmission/
    // UserRole row referencing another clinic's appointment/user. Those three
    // are the only 'via' entries in SYNC_REGISTRY today.
    return true;
  }

  // ---------------------------------------------------------------------
  // Server-side of the protocol — these run on WHICHEVER instance holds
  // the canonical data being asked about. Both the hosted/online server and
  // the Electron-bundled local server run this same code; "client" vs
  // "server" here is a role per sync operation, not a fixed instance type.
  //
  // When called via the guarded controller endpoints, `clinicId` is the
  // clinic SyncDeviceGuard resolved from the caller's device token, and
  // every entity's rows get filtered to just that clinic (see
  // buildClinicWhere). When called locally by this same instance's own
  // pullChanges/pushPending (client role, no clinicId), nothing is
  // filtered — correct there because the local SQLite database already
  // only ever holds one clinic's data to begin with.
  // ---------------------------------------------------------------------

  /** GET /sync/changes — return all registered-entity rows changed since `since`. */
  async generateChangesSince(since: Date | null, clinicId?: string): Promise<ChangesResponse> {
    const entities: Record<string, any[]> = {};
    for (const entry of SYNC_REGISTRY) {
      const repo = this.getRepo(entry);
      const clinicWhere = clinicId ? await this.buildClinicWhere(entry.clinicScope, clinicId) : {};
      const timeWhere = since ? { [entry.timestampField]: MoreThan(since) } : {};
      const where = { ...clinicWhere, ...timeWhere };
      const rows = await repo.find(Object.keys(where).length ? { where: where as any } : {});
      entities[entry.name] = rows;
    }
    return { serverTime: new Date().toISOString(), entities };
  }

  /**
   * POST /sync/push — apply incoming records for one entity type using
   * last-write-wins on `timestampField`. Returns which ids were applied vs.
   * which lost to a newer local version (logged as conflicts for visibility
   * — LWW still resolves automatically, nothing blocks on this) vs. which
   * were rejected outright for not belonging to the pushing clinic.
   */
  async applyIncoming(entityName: string, records: any[], clinicId?: string): Promise<PushResult> {
    const entry = SYNC_REGISTRY.find((e) => e.name === entityName);
    if (!entry) throw new Error(`Unknown sync entity: ${entityName}`);
    const repo = this.getRepo(entry);
    const applied: string[] = [];
    const conflicts: string[] = [];
    const rejected: string[] = [];

    // Everything written in here is the sync engine applying an
    // already-resolved record — PendingSyncSubscriber and the
    // Repository.update() patch both check isInsideSyncApply() and skip
    // their normal "mark pending" behavior for writes made inside this
    // block. Without this, every pull would immediately re-queue the same
    // rows for push, and every push confirmation would re-flag the row it
    // just confirmed — an infinite sync loop.
    await runInsideSyncApply(async () => {
      for (const incoming of records) {
        if (clinicId && !this.recordBelongsToClinic(entry.clinicScope, incoming, clinicId)) {
          // A device pushing a row outside its own clinic — exactly the
          // cross-clinic write the old shared secret couldn't prevent.
          // Drop it rather than applying it or 500ing the whole batch.
          rejected.push(incoming.id);
          continue;
        }

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
    return { applied, conflicts, rejected };
  }

  /** Local-instance view of sync health, used by the status endpoint and Phase 5 UI banners. */
  async getStatus(clinicId?: string) {
    const lastSyncAt = await this.getLastSyncAt();
    const perEntity: Record<string, { pending: number; conflict: number }> = {};
    let totalPending = 0;
    let totalConflict = 0;
    for (const entry of SYNC_REGISTRY) {
      const repo = this.getRepo(entry);
      const clinicWhere = clinicId ? await this.buildClinicWhere(entry.clinicScope, clinicId) : {};
      const pending = await repo.count({ where: { ...clinicWhere, syncStatus: 'pending' } as any });
      const conflict = await repo.count({ where: { ...clinicWhere, syncStatus: 'conflict' } as any });
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

  /**
   * Called from AuthService.login right after a successful local login on
   * an offline-capable (Electron/SQLite) instance. Replaces the old manual
   * "type in the shared secret" step — see SyncDeviceGuard/SyncDevicesService
   * for what this token now does.
   *
   * No-ops (returns false) when: this isn't an offline-capable instance
   * (no SYNC_REMOTE_BASE_URL), a device token is already stored, or the
   * remote is unreachable/rejects the call — any of those just leaves the
   * existing "not yet registered" state in place and this runs again on
   * the next login attempt, so failures here are silent by design rather
   * than blocking login.
   *
   * IMPORTANT: this POSTs the *local* backend's own just-issued JWT to the
   * remote as Bearer auth. That only verifies if both instances sign JWTs
   * with the same JWT_SECRET — the local Electron backend must be
   * configured with the SAME JWT_SECRET as the remote/hosted backend (see
   * electron/main.js). If they differ, the remote returns 401 here and
   * this device simply stays unregistered until that's fixed — it does
   * NOT fall back to re-sending the user's plaintext password to remote.
   */
  async autoRegisterDeviceIfNeeded(accessToken: string): Promise<boolean> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) return false; // hosted/Postgres instance — nothing to register itself as
    if (this.syncConfigStore.getDeviceToken()) return false; // already registered

    try {
      const deviceName = `${os.hostname()} / ${process.platform}`;
      const { data } = await firstValueFrom(
        this.http.post<{ token: string }>(
          `${remote}/api/v1/sync/register-device`,
          { deviceName },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );
      this.syncConfigStore.writeDeviceToken(data.token);
      this.logger.log('Sync device auto-registered against remote backend');
      return true;
    } catch (err: any) {
      this.logger.warn(
        `Sync device auto-registration failed (will retry on next login): ${err?.response?.status ?? ''} ${err?.message ?? err}`,
      );
      return false;
    }
  }

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
      this.http.get<ChangesResponse>(url, { headers: this.syncDeviceHeaders() }),
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
          { headers: this.syncDeviceHeaders() },
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
      // data.rejected (rows the remote refused as out-of-clinic) are left
      // as 'pending' on purpose — that's a config/security problem
      // (this device's token doesn't match the clinic these rows say they
      // belong to), not a transient sync failure, so silently marking
      // them 'synced' or endlessly retrying would both be wrong. Surface
      // via logs for now.
      if (data.rejected?.length) {
        this.logger.warn(`Remote rejected ${data.rejected.length} ${entry.name} row(s) as out-of-clinic — left pending`);
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