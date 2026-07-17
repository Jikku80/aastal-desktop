import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SyncService } from './sync.service';
import { OutboxService } from '../outbox/outbox.service';

const POLL_INTERVAL_MS = 15_000;

// Belt-and-braces re-sync while the app just stays online for a long
// session (a clinic that never closes the app all day). The
// offline->online TRANSITION trigger below covers reconnects, but nothing
// previously covered "we've been online continuously for hours" — changes
// made on another device/clinic instance would only ever show up if this
// instance happened to bounce its connection. 5 minutes matches the order
// of magnitude of the old manual "sync now" habit without hammering the
// remote.
const PERIODIC_SYNC_INTERVAL_MS = 5 * 60_000;

/**
 * Polls the configured remote backend's /api/v1/health endpoint. On a
 * transition from offline -> online (which, critically, INCLUDES the very
 * first poll after boot — see the `isOnline: boolean | null` note below),
 * triggers a full sync and drains the outbox. Also re-syncs periodically
 * while connectivity stays up, so a long-running online session doesn't
 * silently go stale.
 *
 * Only meaningful when SYNC_REMOTE_BASE_URL is set (i.e. on the
 * Electron-bundled local/offline instance) — on a normal online-only
 * Postgres deployment this service still runs but has nothing to check
 * against and stays permanently in the "online" (no-op) state, which is
 * correct since that instance never goes offline by definition.
 */
@Injectable()
export class ConnectivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectivityService.name);
  // `null` = not yet known (distinct from `false`). Using a genuine
  // tri-state here — instead of the old optimistic `true` default — means
  // the very first poll after boot is always treated as a "came online"
  // transition (null -> true) rather than a no-op, so a fresh install (or
  // any ordinary app restart that happens to already have a network
  // connection, which is the overwhelmingly common case) actually pulls
  // down clinic data on startup instead of only ever syncing after a
  // genuine disconnect/reconnect cycle.
  //
  // BUG (fixed here): previously `isOnline` started as `true`, so if the
  // first poll succeeded (the normal case — most desktops have working
  // internet), `wasOnline === isOnline === true` and the "just came
  // online" branch never fired. A brand-new desktop install would
  // register its sync device successfully but then show an empty
  // patients/appointments list until the network happened to drop and
  // come back — which, on a stable connection, could be never. Same
  // problem on every ordinary app relaunch while online.
  private isOnline: boolean | null = null;
  private pollTimer?: NodeJS.Timeout;
  private periodicSyncTimer?: NodeJS.Timeout;
  // Prevents a periodic tick and a reconnect-triggered sync (or a
  // user-initiated "sync now") from running concurrently against the same
  // SQLite file — see SyncService.fullSync's own in-flight guard, this is
  // just the first line of defense so we don't even try.
  private syncInFlight = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly sync: SyncService,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit() {
    const remote = this.config.get<string>('SYNC_REMOTE_BASE_URL');
    if (!remote) {
      // This instance IS the canonical/online server (nothing "upstream" of
      // it to poll) — it's always online by definition. Explicitly set
      // isOnline = true here rather than leaving it at its initial `null`:
      // getIsOnline() treats anything other than `true` as offline, so
      // leaving this unset was making the online production deployment
      // permanently report isOnline: false to the frontend (see
      // OfflineBanner.tsx / useOnlineStatus.ts), even though it's never
      // actually offline.
      this.isOnline = true;
      this.logger.log('SYNC_REMOTE_BASE_URL not set — connectivity polling disabled (this instance is the canonical/online one)');
      return;
    }
    this.pollTimer = setInterval(() => this.poll(remote), POLL_INTERVAL_MS);
    // Fire one immediately on boot too, rather than waiting out the first interval.
    this.poll(remote);

    this.periodicSyncTimer = setInterval(() => {
      if (this.isOnline) this.runSync('periodic online re-sync');
    }, PERIODIC_SYNC_INTERVAL_MS);
  }

  getIsOnline(): boolean {
    return this.isOnline === true;
  }

  private async poll(remote: string) {
    const wasOnline = this.isOnline;
    let nowOnline: boolean;
    try {
      // remote is the bare origin (e.g. https://clinickarobar.com) —
      // every route, including /health, sits under the global 'api/v1'
      // prefix set in main.ts (setGlobalPrefix has no exclude list), so
      // this must include it or every poll 404s and the app reads as
      // permanently offline even with a correct URL and a live server.
      await firstValueFrom(this.http.get(`${remote}/api/v1/health`, { timeout: 5000 }));
      nowOnline = true;
    } catch {
      nowOnline = false;
    }
    this.isOnline = nowOnline;

    if (wasOnline !== true && nowOnline) {
      this.logger.log(
        wasOnline === null
          ? 'Connectivity established on boot — triggering initial full sync and outbox drain'
          : 'Connectivity restored — triggering full sync and outbox drain',
      );
      await this.runSync('reconnect');
    } else if (wasOnline === true && !nowOnline) {
      this.logger.warn('Connectivity lost — switching to offline mode');
    }
  }

  /** Shared by the reconnect transition and the periodic online timer — never lets two runs overlap. */
  private async runSync(reason: string) {
    if (this.syncInFlight) {
      this.logger.debug(`Sync already in progress — skipping overlapping trigger (${reason})`);
      return;
    }
    this.syncInFlight = true;
    try {
      try {
        await this.sync.fullSync();
      } catch (err: any) {
        this.logger.error(`Sync (${reason}) failed: ${err?.message ?? err}`);
      }
      try {
        await this.outbox.drain();
      } catch (err: any) {
        this.logger.error(`Outbox drain (${reason}) failed: ${err?.message ?? err}`);
      }
    } finally {
      this.syncInFlight = false;
    }
  }

  onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.periodicSyncTimer) clearInterval(this.periodicSyncTimer);
  }
}