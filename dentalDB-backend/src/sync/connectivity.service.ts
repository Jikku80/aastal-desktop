import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SyncService } from './sync.service';
import { OutboxService } from '../outbox/outbox.service';

const POLL_INTERVAL_MS = 15_000;

/**
 * Polls the configured remote backend's /health endpoint. On a transition
 * from offline -> online, triggers a full sync and drains the outbox.
 *
 * Only meaningful when SYNC_REMOTE_BASE_URL is set (i.e. on the
 * Electron-bundled local/offline instance) — on a normal online-only
 * Postgres deployment this service still runs but has nothing to check
 * against and stays permanently in the "online" (no-op) state, which is
 * correct since that instance never goes offline by definition.
 */
@Injectable()
export class ConnectivityService implements OnModuleInit {
  private readonly logger = new Logger(ConnectivityService.name);
  private isOnline = true; // optimistic default; corrected on first poll
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly sync: SyncService,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit() {
    const remote = this.config.get<string>('SYNC_REMOTE_BASE_URL');
    if (!remote) {
      this.logger.log('SYNC_REMOTE_BASE_URL not set — connectivity polling disabled (this instance is the canonical/online one)');
      return;
    }
    this.timer = setInterval(() => this.poll(remote), POLL_INTERVAL_MS);
    // Fire one immediately on boot too, rather than waiting out the first interval.
    this.poll(remote);
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  private async poll(remote: string) {
    const wasOnline = this.isOnline;
    try {
      await firstValueFrom(this.http.get(`${remote}/health`, { timeout: 5000 }));
      this.isOnline = true;
    } catch {
      this.isOnline = false;
    }

    if (!wasOnline && this.isOnline) {
      this.logger.log('Connectivity restored — triggering full sync and outbox drain');
      try {
        await this.sync.fullSync();
      } catch (err: any) {
        this.logger.error(`Sync on reconnect failed: ${err?.message ?? err}`);
      }
      try {
        await this.outbox.drain();
      } catch (err: any) {
        this.logger.error(`Outbox drain on reconnect failed: ${err?.message ?? err}`);
      }
    } else if (wasOnline && !this.isOnline) {
      this.logger.warn('Connectivity lost — switching to offline mode');
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
