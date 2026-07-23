import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, MoreThan, In } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as os from 'os';
import { SyncMeta } from './entities/sync-meta.entity';
import { SYNC_REGISTRY, SyncRegistryEntry, ClinicScope } from './sync-registry';
import { runInsideSyncApply } from './sync-context';
import { SyncConfigStore } from './sync-config-store';
import { Clinic } from '../clinics/entities/clinic.entity';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

const LAST_SYNC_KEY = 'lastSyncAt';
const NEVER_MATCH_UUID = '00000000-0000-0000-0000-000000000000';


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

  private getRepo(entry: SyncRegistryEntry, manager?: EntityManager) {
    return (manager ?? this.dataSource).getRepository(entry.entity as any);
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
        return { [scope.localField]: In(ids.length ? ids : [NEVER_MATCH_UUID]) };
      }
    }
  }

  /**
   * Look up a different local row already holding one of `incoming`'s
   * declared unique-field values. Used only when `incoming.id` itself
   * wasn't found locally — i.e. a genuine "same logical record, different
   * id" collision (see uniqueFields docstring in sync-registry.ts), not a
   * normal update. Returns null for entities with no declared uniqueFields
   * (the overwhelming majority), so this is a no-op for everything except
   * Clinic today.
   */
  private async findByAlternateUniqueField(
    entry: SyncRegistryEntry,
    repo: Repository<any>,
    incoming: any,
  ): Promise<any | null> {
    if (!entry.uniqueFields?.length) return null;
    for (const field of entry.uniqueFields) {
      const value = incoming[field];
      if (value == null) continue;
      const match = await repo.findOne({ where: { [field]: value } as any });
      if (match) return match;
    }
    return null;
  }

  /** True for a DB-level unique/duplicate-key violation, across both the Postgres and better-sqlite3 drivers. */
  private isUniqueConstraintError(err: any): boolean {
    const code = err?.code ?? err?.driverError?.code;
    if (code === '23505') return true; // Postgres unique_violation
    const message: string = err?.message ?? err?.driverError?.message ?? '';
    return /UNIQUE constraint failed/i.test(message);
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
      // Same problem as the push side (see SELECT_FALSE_FIELDS_TO_SYNC /
      // attachSelectFalseFields below), just in the opposite direction:
      // User.password is `select: false`, so this plain repo.find() never
      // includes it. Any device pulling a User row it doesn't already have
      // locally (a new hire, or this device's very first sync) would then
      // try to INSERT that row with no password at all, which throws
      // "NOT NULL constraint failed: users.password" and aborts the whole
      // sync transaction — every entity in that pull, not just User, since
      // pullChanges applies the full changeset in one transaction. Without
      // this, a clinic can get stuck never fully syncing to a new device
      // once it has more than one user.
      await this.attachSelectFalseFields(entry.name, repo, rows);
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
  async applyIncoming(entityName: string, records: any[], clinicId?: string, manager?: EntityManager): Promise<PushResult> {
    const entry = SYNC_REGISTRY.find((e) => e.name === entityName);
    if (!entry) throw new Error(`Unknown sync entity: ${entityName}`);
    const repo = this.getRepo(entry, manager);
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

        let existing = await repo.findOne({ where: { id: incoming.id } as any });

        // No row with this id locally — before treating it as a brand new
        // record, check whether one of its declared unique fields (e.g.
        // Clinic.slug) already belongs to a different local row. That
        // happens when the same logical record ended up with two
        // different ids on two instances (see uniqueFields docstring) —
        // inserting here would otherwise throw a UNIQUE constraint
        // violation and abort the entire sync transaction. When found,
        // reconcile onto that existing row (keeping ITS id) via the same
        // last-write-wins comparison used below, instead of inserting a
        // duplicate.
        let targetId = incoming.id;
        if (!existing) {
          const conflictingRow = await this.findByAlternateUniqueField(entry, repo, incoming);
          if (conflictingRow) {
            existing = conflictingRow;
            targetId = conflictingRow.id;
            this.logger.warn(
              `${entry.name} ${incoming.id} collides on a unique field with local row ${targetId} — reconciling onto the existing row instead of inserting a duplicate`,
            );
          }
        }

        if (!existing) {
          try {
            await repo.save({ ...incoming, syncStatus: 'synced' });
            applied.push(incoming.id);
          } catch (err: any) {
            // Safety net for any other not-yet-declared unique constraint —
            // don't let one bad row take down the whole sync transaction.
            if (!this.isUniqueConstraintError(err)) throw err;
            this.logger.warn(
              `Skipped ${entry.name} row ${incoming.id} — unique constraint conflict on insert: ${err?.message ?? err}`,
            );
            conflicts.push(incoming.id);
          }
          continue;
        }

        const incomingTs = new Date(incoming[entry.timestampField]).getTime();
        const existingTs = new Date((existing as any)[entry.timestampField]).getTime();
        if (incomingTs >= existingTs) {
          try {
            await repo.save({ ...incoming, id: targetId, syncStatus: 'synced' });
            applied.push(incoming.id);
          } catch (err: any) {
            if (!this.isUniqueConstraintError(err)) throw err;
            this.logger.warn(
              `Skipped ${entry.name} row ${incoming.id} — unique constraint conflict on update: ${err?.message ?? err}`,
            );
            conflicts.push(incoming.id);
          }
        } else {
          // Local copy is newer — incoming write loses. Flag, don't overwrite.
          await repo.update({ id: targetId } as any, { syncStatus: 'conflict' } as any);
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
   * SECURITY: this used to POST the *local* backend's own just-issued JWT
   * to the remote as Bearer auth, which only verified because the local
   * Electron backend was (wrongly) configured with the SAME JWT_SECRET as
   * the remote/hosted backend — a secret baked into every shipped copy of
   * the desktop app (see electron/main.js history). That meant anyone who
   * extracted the secret from the packaged app could forge a token valid
   * against the production API for any account.
   *
   * The local and remote JWT signing domains are now fully independent:
   * the local backend signs its own random, install-unique secret, so a
   * locally-issued token would never validate on the remote anyway. To
   * register a device we instead perform a REAL login against the remote
   * hosted backend over HTTPS with the same credentials the user just used
   * locally, and use the genuine remote-issued access token that comes
   * back as Bearer auth for POST /sync/register-device. The plaintext
   * password never touches disk — it's only held in memory for the
   * duration of this call.
   */
  async autoRegisterDeviceIfNeeded(email: string, password: string): Promise<boolean> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) return false; // hosted/Postgres instance — nothing to register itself as
    if (this.syncConfigStore.getDeviceToken()) return false; // already registered

    try {
      let accessToken: string;
      try {
        const { data: remoteAuth } = await firstValueFrom(
          this.http.post<{ accessToken: string }>(
            `${remote}/api/v1/auth/login`,
            { email, password },
          ),
        );
        accessToken = remoteAuth.accessToken;
      } catch (loginErr: any) {
        const claimedToken = await this.claimPlaceholderClinicIfEligible(remote, email, password);
        if (!claimedToken) throw loginErr;
        accessToken = claimedToken;
      }

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

      // Pull the clinic's existing data down immediately rather than
      // waiting for the next periodic/reconnect trigger. Without this, a
      // fresh desktop install registers successfully but the very first
      // ConnectivityService poll (which ran before this token existed)
      // already failed its sync attempt with 401 and won't retry until
      // its next cycle — up to PERIODIC_SYNC_INTERVAL_MS later — so staff
      // would see an empty patients/appointments list for several minutes
      // after their first login on a new machine. Never let a failure
      // here block login; caller already treats this whole method as
      // fire-and-forget.
      this.fullSync().catch((err: any) => {
        this.logger.warn(`Post-registration initial sync failed (will retry on next cycle): ${err?.message ?? err}`);
      });

      return true;
    } catch (err: any) {
      this.logger.warn(
        `Sync device auto-registration failed (will retry on next login): ${err?.response?.status ?? ''} ${err?.message ?? err}`,
      );
      return false;
    }
  }

  private async claimPlaceholderClinicIfEligible(remote: string, email: string, password: string): Promise<string | null> {
    const clinicRepo = this.dataSource.getRepository(Clinic);
    const userRepo = this.dataSource.getRepository(User);

    const user = await userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();
    if (!user) return null;

    if (!(await bcrypt.compare(password, user.password))) return null;

    const clinic = await clinicRepo.findOne({ where: { id: user.clinicId } });
    if (!clinic || !clinic.isLocalPlaceholder) return null;

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ accessToken: string }>(`${remote}/api/v1/auth/claim-clinic`, {
          clinicId:   clinic.id,
          userId:     user.id,
          clinicName: clinic.name,
          firstName:  user.firstName,
          lastName:   user.lastName,
          email,
          password,
        }),
      );
      await clinicRepo.update(clinic.id, { isLocalPlaceholder: false });
      this.logger.log(`Claimed local placeholder clinic ${clinic.id} on the hosted backend`);
      return data.accessToken;
    } catch (err: any) {
      this.logger.warn(
        `Failed to claim placeholder clinic on remote: ${err?.response?.status ?? ''} ${err?.message ?? err}`,
      );
      return null;
    }
  }

  /**
   * Fallback path for AuthService.login() when the email isn't found in the
   * LOCAL sqlite DB at all — i.e. someone with an existing hosted/online
   * account logging into this desktop install for the very first time,
   * before autoRegisterDeviceIfNeeded has ever had a chance to mirror them
   * down. Without this, a real hosted account can never log into a fresh
   * desktop install: AuthService.login only ever looks at the local table,
   * so it always answers "Invalid email or password" for a user it has
   * simply never seen before.
   *
   * On success, mirrors the remote User + Clinic rows into the local
   * sqlite DB (syncStatus 'synced', not 'pending' — this data originated
   * from the remote, it doesn't need to be pushed back) and stores the
   * plaintext password's bcrypt hash locally so this same login works
   * offline from now on. Returns the local User id to resume in
   * AuthService.login(), or null if the remote rejected the credentials
   * (or there's no remote configured at all, e.g. genuinely offline).
   */
  async remoteLoginFallback(email: string, password: string): Promise<string | null> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) return null;

    let remoteAuth: {
      user: { id: string; firstName: string; lastName: string; email: string; role: string; clinicId: string; isActive: boolean; avatar?: string };
      clinic: Record<string, any> | null;
      accessToken: string;
    };
    try {
      const { data } = await firstValueFrom(
        this.http.post<typeof remoteAuth>(`${remote}/api/v1/auth/login`, { email, password }),
      );
      remoteAuth = data;
    } catch (err: any) {
      this.logger.warn(
        `Remote login fallback failed for ${email}: ${err?.response?.status ?? ''} ${err?.message ?? err}`,
      );
      return null;
    }

    const { user: remoteUser, clinic: remoteClinic, accessToken } = remoteAuth;
    const passwordHash = await bcrypt.hash(password, 12);

    await runInsideSyncApply(async () => {
      const clinicRepo = this.dataSource.getRepository(Clinic);
      const userRepo = this.dataSource.getRepository(User);

      // Resolved separately from remoteClinic.id: a brand-new desktop
      // install seeds a local placeholder Clinic (isLocalPlaceholder:
      // true) before anyone has logged in. The very first remote login
      // then tries to mirror the *hosted* clinic in under its own id,
      // which collides on the slug UNIQUE constraint with that local
      // placeholder row — and unlike the generic sync path (applyIncoming
      // / findByAlternateUniqueField), this hand-rolled upsert wasn't
      // checking for that collision, so login itself threw a 500. Default
      // to the remote's id; only fall back to reconciling onto a local
      // slug match when that id isn't already present locally.
      let resolvedClinicId = remoteClinic?.id ?? remoteUser.clinicId;

      if (remoteClinic) {
        let existingClinic = await clinicRepo.findOne({ where: { id: remoteClinic.id } });

        if (!existingClinic && remoteClinic.slug) {
          const slugMatch = await clinicRepo.findOne({ where: { slug: remoteClinic.slug } });
          if (slugMatch) {
            existingClinic = slugMatch;
            resolvedClinicId = slugMatch.id;
            this.logger.warn(
              `Remote clinic ${remoteClinic.id} collides on slug with local row ${resolvedClinicId} — reconciling onto the existing row instead of inserting a duplicate`,
            );
          }
        }

        const clinicRow = clinicRepo.create({
          ...(existingClinic ?? {}),
          ...remoteClinic,
          id: resolvedClinicId,
          isLocalPlaceholder: false,
          syncStatus: 'synced' as any,
        });
        await clinicRepo.save(clinicRow);
      }

      const existingUser = await userRepo.findOne({ where: { id: remoteUser.id } });
      const userRow = userRepo.create({
        ...(existingUser ?? {}),
        id:         remoteUser.id,
        firstName:  remoteUser.firstName,
        lastName:   remoteUser.lastName,
        email:      remoteUser.email,
        role:       remoteUser.role as any,
        // Use resolvedClinicId, not the raw remoteUser.clinicId — if the
        // Clinic row above got reconciled onto a local id, the FK here
        // must point at that same local id or this user row would
        // reference a clinic id that doesn't actually exist locally.
        clinicId:   resolvedClinicId,
        isActive:   remoteUser.isActive,
        avatar:     remoteUser.avatar ?? existingUser?.avatar ?? null,
        password:   passwordHash,
        syncStatus: 'synced' as any,
      });
      await userRepo.save(userRow);
    });

    // Register this device against the remote right away — we already have
    // a genuine remote access token from the login above, no need to log
    // in again the way autoRegisterDeviceIfNeeded does.
    if (!this.syncConfigStore.getDeviceToken()) {
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
        this.logger.log(`Sync device registered for mirrored hosted account ${email}`);
      } catch (err: any) {
        this.logger.warn(
          `Device registration after remote login fallback failed (will retry on next login): ${err?.message ?? err}`,
        );
      }
    }

    // This path mirrors only the logging-in User + their Clinic row — none
    // of that user's patients, appointments, invoices, etc. This is the
    // very first login on a brand-new machine, so there's nothing else
    // locally yet; pull the rest of the clinic's data down now instead of
    // leaving the app looking empty until the next periodic/reconnect
    // trigger fires.
    this.fullSync().catch((err: any) => {
      this.logger.warn(`Post-mirror initial sync failed (will retry on next cycle): ${err?.message ?? err}`);
    });

    this.logger.log(`Mirrored hosted account ${email} into the local offline DB after remote login fallback`);
    return remoteUser.id;
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

    // SYNC_REGISTRY is a flat, mechanically-generated list of entities — not
    // a dependency order — so on a first-time (or long-overdue) pull, rows
    // for one entity (e.g. Patient) can easily arrive and be applied before
    // rows for something it has a required FK to (e.g. Clinic, User), which
    // fails locally with SqliteError: FOREIGN KEY constraint failed even
    // though the referenced row *is* in this same pull, just later in the
    // batch. Applying the whole batch as one transaction with FK checks
    // deferred to COMMIT (rather than checked per-INSERT) fixes this
    // regardless of registry order, as long as every referenced row is
    // somewhere in this same changeset by commit time — which it always is,
    // since the server sends the full changeset in one response. This only
    // matters for better-sqlite3 (the offline instance) — Postgres never
    // hits this because pushPending only ever pushes one entity's pending
    // rows at a time, long after their parents were pushed/synced.
    const isSqlite = this.dataSource.options.type === 'better-sqlite3';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    if (isSqlite) {
      // Only takes effect for the transaction it's issued in, and only
      // while `PRAGMA foreign_keys = ON` (the better-sqlite3 default set in
      // data-source.sqlite.ts) — see
      // https://www.sqlite.org/pragma.html#pragma_defer_foreign_keys
      await queryRunner.query('PRAGMA defer_foreign_keys = ON');
    }

    let pulled = 0;
    let conflicts = 0;
    try {
      for (const [entityName, rows] of Object.entries(data.entities)) {
        if (!rows.length) continue;
        const result = await this.applyIncoming(entityName, rows, undefined, queryRunner.manager);
        pulled += result.applied.length;
        conflicts += result.conflicts.length;
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.setLastSyncAt(data.serverTime);
    return { pulled, conflicts };
  }

  /** Push all locally-pending records to remote. */
  // Fields on Clinic that must only ever flow server → device (pulled),
  // never device → server (pushed). These are exactly the fields the
  // offline license check enforces against (offline-license.util.ts) — if
  // a locally hand-edited SQLite copy of one of these could be pushed up
  // and win the remote's last-write-wins comparison, someone could extend
  // their own trial/subscription by editing the local DB file directly.
  // Everything else about the clinic (name, address, hours, logo, ...)
  // still syncs normally in both directions.
  private static readonly CLINIC_SERVER_AUTHORITATIVE_FIELDS = [
    'plan',
    'trialEndsAt',
    'subscriptionEndsAt',
    'isActive',
  ] as const;

  private sanitizeOutgoingRow(entityName: string, row: Record<string, any>): Record<string, any> {
    if (entityName !== 'Clinic') return row;
    const sanitized = { ...row };
    for (const field of SyncService.CLINIC_SERVER_AUTHORITATIVE_FIELDS) {
      delete sanitized[field];
    }
    return sanitized;
  }

  // Fields that are `select: false` on their entity — so a plain
  // repo.find() never includes them — but that ARE needed in the outgoing
  // sync payload for that entity. Right now this is just User.password:
  // without re-selecting it here, a staff user created locally (offline)
  // and pushed up to the server would arrive with no password at all, and
  // could never then log into the web with the account they were given
  // offline. (The reverse direction — pulling a user down — doesn't have
  // this problem: remoteLoginFallback gets the password from a real login
  // response, not from the generic sync path.)
  private static readonly SELECT_FALSE_FIELDS_TO_SYNC: Record<string, string[]> = {
    User: ['password'],
  };

  private async attachSelectFalseFields(entityName: string, repo: Repository<any>, rows: any[]): Promise<void> {
    const fields = SyncService.SELECT_FALSE_FIELDS_TO_SYNC[entityName];
    if (!fields?.length || !rows.length) return;

    const ids = rows.map((r) => r.id).filter((id) => id != null);
    if (!ids.length) return;

    const qb = repo.createQueryBuilder('e').where('e.id IN (:...ids)', { ids });
    for (const f of fields) qb.addSelect(`e.${f}`);
    const withFields = await qb.getMany();
    const byId = new Map(withFields.map((r: any) => [r.id, r]));

    for (const row of rows) {
      const extra = byId.get(row.id);
      if (!extra) continue;
      for (const f of fields) (row as any)[f] = (extra as any)[f];
    }
  }

  async pushPending(): Promise<{ pushed: number; conflicts: number }> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) throw new Error('SYNC_REMOTE_BASE_URL not configured — cannot push');

    let pushed = 0;
    let conflicts = 0;
    for (const entry of SYNC_REGISTRY) {
      const repo = this.getRepo(entry);
      const rows = await repo.find({ where: { syncStatus: 'pending' } as any });
      if (!rows.length) continue;
      await this.attachSelectFalseFields(entry.name, repo, rows);
      const outgoing = rows.map((row) => this.sanitizeOutgoingRow(entry.name, row as any));
      const { data } = await firstValueFrom(
        this.http.post<PushResult>(
          `${remote}/api/v1/sync/push`,
          { entityName: entry.name, records: outgoing },
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
   *
   * Guarded against overlap: this can be reached from three independent
   * triggers on the offline instance — ConnectivityService's
   * reconnect/periodic timers and the "sync now" button (POST
   * /sync/trigger) — and nothing previously stopped two of them landing at
   * once. Two concurrent runs racing on the same SQLite file could
   * double-push the same 'pending' rows (both read the same pending set
   * before either flips it to 'synced') and interleave writes to
   * sync_meta's lastSyncAt. If a call arrives while one is already
   * in-flight, it just awaits and shares that same run's result rather
   * than starting a second one.
   */
  private fullSyncInFlight: Promise<{ pull: { pulled: number; conflicts: number }; push: { pushed: number; conflicts: number } }> | null = null;

  async fullSync() {
    if (this.fullSyncInFlight) {
      this.logger.debug('fullSync already in progress — joining the existing run instead of starting a new one');
      return this.fullSyncInFlight;
    }

    this.fullSyncInFlight = (async () => {
      // Before the first successful login, no device token has been minted
      // yet (autoRegisterDeviceIfNeeded only runs from AuthService.login),
      // so syncDeviceHeaders() sends no X-Sync-Device-Token and
      // SyncDeviceGuard rejects the request with 401. ConnectivityService
      // fires a sync attempt on every boot and every 15s poll regardless —
      // without this check, a freshly-installed/logged-out app spends its
      // first however-many-minutes hitting the remote and logging an ERROR
      // every single time purely because nobody has logged in yet, which is
      // expected, not a failure. Once a token exists this is a no-op check.
      if (this.getRemoteBaseUrl() && !this.syncConfigStore.getDeviceToken()) {
        this.logger.debug('Skipping sync — no device token yet (waiting for first login to auto-register)');
        return { pull: { pulled: 0, conflicts: 0 }, push: { pushed: 0, conflicts: 0 } };
      }
      this.logger.log('Starting full sync (pull then push)');
      const pull = await this.pullChanges();
      const push = await this.pushPending();
      this.logger.log(`Sync complete: pulled ${pull.pulled} (${pull.conflicts} conflicts), pushed ${push.pushed} (${push.conflicts} conflicts)`);
      return { pull, push };
    })();

    try {
      return await this.fullSyncInFlight;
    } finally {
      this.fullSyncInFlight = null;
    }
  }
}
