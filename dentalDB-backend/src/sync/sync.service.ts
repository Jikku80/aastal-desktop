import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, MoreThan, In } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as os from 'os';
import { existsSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { dirname } from 'path';
import { SyncMeta } from './entities/sync-meta.entity';
import { SYNC_REGISTRY, SYNC_APPLY_ORDER, SyncRegistryEntry, ClinicScope } from './sync-registry';
import { runInsideSyncApply } from './sync-context';
import { SyncConfigStore } from './sync-config-store';
import { Clinic } from '../clinics/entities/clinic.entity';
import { User } from '../users/entities/user.entity';
import { FilesService } from '../files/files.service';
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
    private readonly filesService: FilesService,
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

  /**
   * True for a DB-level foreign-key violation, across both the Postgres
   * and better-sqlite3 drivers. Distinct from isUniqueConstraintError —
   * SYNC_PUSH_ORDER (see sync-registry.ts) makes this the rare case now,
   * but it's kept as a safety net: a device that's been offline long
   * enough, or one syncing against a registry that's changed shape, can
   * still push a row whose referenced parent hasn't landed remotely yet.
   * Previously this fell through applyIncoming's insert/update catch
   * (which only recognized unique violations) uncaught, aborting the
   * whole entity's push and every entity queued after it in the same
   * pushPending() run.
   */
  private isForeignKeyConstraintError(err: any): boolean {
    const code = err?.code ?? err?.driverError?.code;
    if (code === '23503') return true; // Postgres foreign_key_violation
    const message: string = err?.message ?? err?.driverError?.message ?? '';
    return /FOREIGN KEY constraint failed/i.test(message);
  }

  /** Either of the above — the two recoverable constraint-violation classes applyIncoming treats as a per-row conflict instead of a fatal error. */
  private isRecoverableConstraintError(err: any): boolean {
    return this.isUniqueConstraintError(err) || this.isForeignKeyConstraintError(err);
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
      await this.attachManyToManyFields(entry.name, repo, rows);
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
  async applyIncoming(
    entityName: string,
    records: any[],
    clinicId?: string,
    manager?: EntityManager,
    // Populated (old incoming id -> local id actually written) whenever a
    // row reconciles onto a different existing local row via
    // findByAlternateUniqueField below — e.g. incoming User 257b38eb
    // reconciles onto local c5d95529 because both share an email. Any
    // OTHER row in the same pull that references 257b38eb as a foreign
    // key (e.g. a UserRole.userId) needs rewriting to c5d95529 too, or it
    // ends up pointing at an id nothing local ever gets saved under and
    // throws FOREIGN KEY constraint failed at commit. Callers (pullChanges)
    // are responsible for applying this to dependents' rows before they're
    // passed to applyIncoming — this method only records the mapping.
    idRemap?: Map<string, string>,
  ): Promise<PushResult> {
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
            if (targetId !== incoming.id) idRemap?.set(incoming.id, targetId);
          }
        }

        if (!existing) {
          try {
            await repo.save({ ...incoming, syncStatus: 'synced' });
            applied.push(incoming.id);
          } catch (err: any) {
            // Safety net for any other not-yet-declared unique constraint,
            // or a foreign-key violation (e.g. a parent row SYNC_PUSH_ORDER
            // expected to already be on the remote isn't there yet) — don't
            // let one bad row take down the whole sync transaction.
            if (!this.isRecoverableConstraintError(err)) throw err;
            this.logger.warn(
              `Skipped ${entry.name} row ${incoming.id} — ${this.isForeignKeyConstraintError(err) ? 'foreign key' : 'unique'} constraint conflict on insert: ${err?.message ?? err}`,
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
            if (!this.isRecoverableConstraintError(err)) throw err;
            this.logger.warn(
              `Skipped ${entry.name} row ${incoming.id} — ${this.isForeignKeyConstraintError(err) ? 'foreign key' : 'unique'} constraint conflict on update: ${err?.message ?? err}`,
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

    const isSqlite = this.dataSource.options.type === 'better-sqlite3';

    const applyRemap = (rows: any[], field: string, remap: Map<string, string> | undefined) => {
      if (!remap?.size) return;
      for (const row of rows) {
        const remapped = remap.get(row[field]);
        if (remapped) row[field] = remapped;
      }
    };

    /**
     * Applies the whole pulled changeset in one transaction.
     *
     * `deferForeignKeys` (SQLite only): with it ON, individual INSERT/UPDATE
     * statements skip FK checking and everything is verified once at
     * COMMIT — this is what lets SYNC_APPLY_ORDER not be a *perfect*
     * topological order (a same-batch forward reference still resolves,
     * since the referenced row exists by commit time regardless of which
     * order the two were applied in). With it OFF, each statement checks
     * FK immediately, so the outcome depends on SYNC_APPLY_ORDER actually
     * being correct — but critically, an immediate violation is caught
     * per-row by applyIncoming's own safety net (isRecoverableConstraintError,
     * now covering FK errors too — see isForeignKeyConstraintError) instead
     * of aborting the whole transaction, so one unresolvable row degrades
     * to a single skipped conflict rather than sacrificing everything
     * already reconciled in this same pull. See the retry below for when
     * this path is used.
     */
    const runPull = async (deferForeignKeys: boolean): Promise<{ pulled: number; conflicts: number }> => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      if (isSqlite && deferForeignKeys) {
        // Only takes effect for the transaction it's issued in, and only
        // while `PRAGMA foreign_keys = ON` (the better-sqlite3 default set
        // in data-source.sqlite.ts) — see
        // https://www.sqlite.org/pragma.html#pragma_defer_foreign_keys
        await queryRunner.query('PRAGMA defer_foreign_keys = ON');
      }

      // Reconciling a row onto a different existing local row (see
      // findByAlternateUniqueField / uniqueFields) changes which id it
      // lives under locally. Any other row in this same pull that
      // references the OLD (incoming) id as a foreign key — e.g. a
      // UserRole.userId pointing at a User that just got reconciled onto
      // a different local id — needs that reference rewritten to the new
      // local id, or it ends up referencing an id nothing local is ever
      // saved under. SYNC_APPLY_ORDER (see sync-registry.ts) puts a
      // referenced entity before anything that points at it, so by the
      // time an entry is applied, every entity it can legally reference
      // has already contributed whatever id remaps it produced.
      const idRemaps = new Map<string, Map<string, string>>();
      let pulled = 0;
      let conflicts = 0;
      try {
        for (const entry of SYNC_APPLY_ORDER) {
          const rows = data.entities[entry.name];
          if (!rows?.length) continue;

          if (entry.clinicScope.type === 'direct') {
            applyRemap(rows, entry.clinicScope.field ?? 'clinicId', idRemaps.get('Clinic'));
          } else if (entry.clinicScope.type === 'via') {
            const scope = entry.clinicScope;
            const viaName = SYNC_REGISTRY.find((e) => e.entity === scope.viaEntity)?.name;
            applyRemap(rows, scope.localField, viaName ? idRemaps.get(viaName) : undefined);
          }

          // Beyond the clinicScope's own field (handled above), an entity
          // may hold arbitrary other FK columns pointing at entities whose
          // ids get reconciled via uniqueFields (e.g. Task.assignedToUserId
          // -> User, Appointment.dentistId -> User). This runs regardless
          // of clinicScope type — 'global'-scoped entities like DoctorProfile
          // still need their User FK remapped even though they have no
          // clinic filtering. See foreignKeys docstring on SyncRegistryEntry.
          for (const fk of entry.foreignKeys ?? []) {
            const refName = SYNC_REGISTRY.find((e) => e.entity === fk.refEntity)?.name;
            applyRemap(rows, fk.field, refName ? idRemaps.get(refName) : undefined);
          }

          // Same idea, but for an eager many-to-many relation embedded as a
          // nested array of { id, ... } objects (e.g. Role.permissions via
          // the role_permissions join table) rather than a scalar column.
          for (const m2m of entry.manyToManyFields ?? []) {
            const refName = SYNC_REGISTRY.find((e) => e.entity === m2m.refEntity)?.name;
            const remap = refName ? idRemaps.get(refName) : undefined;
            if (!remap?.size) continue;
            for (const row of rows) {
              const items = row[m2m.field];
              if (!Array.isArray(items)) continue;
              for (const item of items) {
                const remapped = remap.get(item.id);
                if (remapped) item.id = remapped;
              }
            }
          }

          const entryRemap = new Map<string, string>();
          const result = await this.applyIncoming(entry.name, rows, undefined, queryRunner.manager, entryRemap);
          if (entryRemap.size) idRemaps.set(entry.name, entryRemap);
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
      return { pulled, conflicts };
    };

    let result: { pulled: number; conflicts: number };
    try {
      result = await runPull(true);
    } catch (err: any) {
      // A deferred check can only fail here, at COMMIT — by definition
      // every individual applyIncoming() call already returned
      // successfully, so this isn't a row applyIncoming's own per-row
      // safety net could have caught. It means some row (its own column
      // possibly outside SYNC_APPLY_ORDER's coverage, e.g. an entity that
      // gained a new FK column without a matching `foreignKeys` entry)
      // still points at an id that plain reconciliation left unresolved.
      // Rolling back and just re-throwing here would discard the WHOLE
      // pull's Clinic/Permission/User reconciliation and fail identically
      // on every retry, since the same offending row is pulled again next
      // time — see 1784700000000-AuditLogWalletEnumValue.ts for the exact
      // same failure mode from a CHECK-constraint angle instead of FK.
      // Retry once with immediate (non-deferred) checking instead:
      // SYNC_APPLY_ORDER gets almost everything right up front, and
      // whichever row is still genuinely unresolvable now fails at its own
      // INSERT/UPDATE, caught by applyIncoming's per-row safety net
      // (isRecoverableConstraintError) and logged as a single skipped
      // conflict instead of sacrificing everything else in the batch.
      if (!isSqlite || !this.isForeignKeyConstraintError(err)) throw err;
      this.logger.warn(
        `Deferred FK check failed at commit (${err?.message ?? err}) — retrying this pull with immediate per-row checking so one bad row doesn't roll back the whole batch`,
      );
      result = await runPull(false);
    }

    await this.setLastSyncAt(data.serverTime);
    return result;
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

  // Same problem as attachSelectFalseFields, but for `eager: false`
  // many-to-many relations (e.g. Branch.staff via the user_branches join
  // table) declared on a SyncRegistryEntry via `manyToManyFields`. A plain
  // repo.find() never loads these, so without this the join-table data
  // simply never travels in either sync direction — the row arrives with
  // no `staff` field at all, applyIncoming has nothing to write into the
  // local join table, and any query that depends on it locally (e.g.
  // BranchesController.getUserBranches' INNER JOIN against user_branches)
  // comes back empty on that device even though the assignment is real.
  // Only the id is kept per related row — that's all applyIncoming's id
  // remap step and repo.save()'s join-table sync need.
  private async attachManyToManyFields(entityName: string, repo: Repository<any>, rows: any[]): Promise<void> {
    const entry = SYNC_REGISTRY.find((e) => e.name === entityName);
    const fields = entry?.manyToManyFields;
    if (!fields?.length || !rows.length) return;

    const ids = rows.map((r) => r.id).filter((id) => id != null);
    if (!ids.length) return;

    const withRelations = await repo.find({
      where: { id: In(ids) } as any,
      relations: fields.map((f) => f.field),
    });
    const byId = new Map(withRelations.map((r: any) => [r.id, r]));

    for (const row of rows) {
      const extra = byId.get(row.id);
      if (!extra) continue;
      for (const f of fields) {
        const items = (extra as any)[f.field];
        row[f.field] = Array.isArray(items) ? items.map((item: any) => ({ id: item.id })) : items;
      }
    }
  }

  async pushPending(): Promise<{ pushed: number; conflicts: number }> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) throw new Error('SYNC_REMOTE_BASE_URL not configured — cannot push');

    let pushed = 0;
    let conflicts = 0;
    // SYNC_APPLY_ORDER, not raw SYNC_REGISTRY — see its docstring in
    // sync-registry.ts. Each entity here is a separate HTTP call/remote
    // transaction, so a row must never be pushed before whatever it has a
    // foreign key to has already landed remotely.
    for (const entry of SYNC_APPLY_ORDER) {
      const repo = this.getRepo(entry);
      const rows = await repo.find({ where: { syncStatus: 'pending' } as any });
      if (!rows.length) continue;
      await this.attachSelectFalseFields(entry.name, repo, rows);
      await this.attachManyToManyFields(entry.name, repo, rows);
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
   * Client-role: pushes the actual BYTES of PatientFile rows whose
   * metadata has already synced (blobSyncStatus:'pending', syncStatus:
   * 'synced') up to the remote. This is deliberately separate from
   * pushPending() above — that method (and the whole generic sync engine)
   * only ever moves database rows, never file content, which is exactly
   * the gap this closes. Only proceeds against rows whose row is already
   * confirmed 'synced' remotely, since pushing a blob for a row the
   * remote doesn't have yet would just 404.
   *
   * Called from fullSync() right after pushPending(), so it runs on every
   * normal sync cycle (reconnect, periodic poll, manual "sync now") — same
   * triggers as everything else, no separate schedule to reason about.
   */
  async pushPendingFileBlobs(): Promise<{ pushed: number; failed: number }> {
    const remote = this.getRemoteBaseUrl();
    if (!remote) return { pushed: 0, failed: 0 };

    const rows = await this.filesService.findPendingBlobSync();
    let pushed = 0;
    let failed = 0;

    for (const row of rows) {
      const absPath = this.filesService.getAbsolutePath(row);
      if (!existsSync(absPath)) {
        // The local file is missing (deleted independently of the DB row,
        // or genuinely never finished writing) — nothing to push. Left
        // 'pending' rather than silently dropped, but logged once per
        // cycle so a permanently-missing file doesn't retry invisibly
        // forever without any trace in the logs.
        this.logger.warn(`PatientFile ${row.id}: local file missing at ${absPath} — cannot push blob`);
        failed++;
        continue;
      }
      try {
        const buffer = await fsPromises.readFile(absPath);
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: row.mimeType || 'application/octet-stream' }), row.originalName);
        await firstValueFrom(
          this.http.post(`${remote}/api/v1/sync/files/${row.id}/blob`, form, {
            headers: this.syncDeviceHeaders(),
          }),
        );
        await this.filesService.markBlobSynced(row.id);
        pushed++;
      } catch (err: any) {
        this.logger.warn(`PatientFile ${row.id}: blob push failed (will retry next cycle): ${this.describeRemoteError(err)}`);
        failed++;
      }
    }
    return { pushed, failed };
  }

  /**
   * Server-role counterpart, called from SyncController's
   * POST /sync/files/:id/blob (SyncDeviceGuard-protected, same as
   * /sync/push). Writes the incoming bytes to THIS instance's disk under
   * the row's existing storedName — the row itself must already exist
   * here (pushed via the ordinary pushPending() row sync, which always
   * runs before pushPendingFileBlobs in the same cycle) so its
   * storedName/mimeType are already correct and don't need re-deriving.
   */
  async receiveFileBlob(
    clinicId: string,
    id: string,
    file: { buffer: Buffer } | undefined,
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!file?.buffer) return { ok: false, reason: 'No file received' };

    const row = await this.filesService.findOneForClinic(clinicId, id);
    if (!row) {
      // The metadata row hasn't landed here yet — pushPending() and
      // pushPendingFileBlobs() are two separate HTTP calls in the same
      // cycle, so in principle a blob could arrive a beat before its row
      // if requests interleave unexpectedly. Not an error: the device
      // will simply retry the blob push next cycle once the row exists.
      return { ok: false, reason: 'Row not found yet — will retry next sync cycle' };
    }

    const dest = this.filesService.getAbsolutePath(row);
    await fsPromises.mkdir(dirname(dest), { recursive: true });
    await fsPromises.writeFile(dest, file.buffer);
    await this.filesService.markBlobSynced(id);
    return { ok: true };
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
  /**
   * Turns an axios error into a readable one-liner instead of the bare
   * "Request failed with status code 500" that AllExceptionsFilter was
   * logging — that message alone gives no way to tell WHICH remote call
   * failed or WHY (which entity, which Postgres error, etc.), since the
   * remote's actual response body (its own error message) was being
   * discarded. Axios errors have .response.data with the remote's real
   * error payload; fall back to err.message for anything else.
   */
  private describeRemoteError(err: any): string {
    const status = err?.response?.status;
    const remoteMessage = err?.response?.data?.message ?? err?.response?.data?.error;
    if (status) {
      const detail = Array.isArray(remoteMessage) ? remoteMessage.join('; ') : remoteMessage;
      return `remote responded ${status}${detail ? ` — ${detail}` : ''}`;
    }
    return err?.message ?? String(err);
  }

  private fullSyncInFlight: Promise<{
    pull: { pulled: number; conflicts: number; error?: string };
    push: { pushed: number; conflicts: number; error?: string };
  }> | null = null;

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

      // Pull and push are now isolated from each other: previously a
      // failure in EITHER (typically the remote responding 500 to one of
      // the two calls) threw out of fullSync() entirely, which (a) meant a
      // failing push could mask a pull that actually succeeded — data that
      // DID come down (branches, patients, etc.) never got credited or
      // logged, making "did anything actually sync?" impossible to tell
      // from these logs, and (b) surfaced as a bare uncaught
      // "AxiosError: Request failed with status code 500" with no
      // indication of which direction failed or why, since
      // AllExceptionsFilter only logs exception.message, not the remote's
      // actual response body. Each half is now caught independently, its
      // real remote error extracted via describeRemoteError, and logged as
      // a warning (not re-thrown) — this endpoint is polled every 15s and
      // retried on every reconnect by design (see useOnlineStatus.ts on the
      // frontend, which already treats trigger() failures as best-effort),
      // so a transient remote failure logging as ERROR on every single
      // cycle was log noise, not an actionable signal.
      let pull: { pulled: number; conflicts: number; error?: string };
      try {
        pull = await this.pullChanges();
      } catch (err: any) {
        const detail = this.describeRemoteError(err);
        this.logger.warn(`Sync pull failed (will retry next cycle): ${detail}`);
        pull = { pulled: 0, conflicts: 0, error: detail };
      }

      let push: { pushed: number; conflicts: number; error?: string };
      try {
        push = await this.pushPending();
      } catch (err: any) {
        const detail = this.describeRemoteError(err);
        this.logger.warn(`Sync push failed (will retry next cycle): ${detail}`);
        push = { pushed: 0, conflicts: 0, error: detail };
      }

      // Separate, non-fatal step: even if this fails, the rows pushed above
      // already synced their metadata, so the affected file(s) just show as
      // "still syncing" on the remote side until this succeeds on a later
      // cycle — never blocks or reverts the row sync that already happened.
      try {
        await this.pushPendingFileBlobs();
      } catch (err: any) {
        this.logger.warn(`File blob push failed (will retry next cycle): ${this.describeRemoteError(err)}`);
      }

      this.logger.log(
        `Sync complete: pulled ${pull.pulled} (${pull.conflicts} conflicts)${pull.error ? ' [pull failed]' : ''}, ` +
        `pushed ${push.pushed} (${push.conflicts} conflicts)${push.error ? ' [push failed]' : ''}`,
      );
      return { pull, push };
    })();

    try {
      return await this.fullSyncInFlight;
    } finally {
      this.fullSyncInFlight = null;
    }
  }
}