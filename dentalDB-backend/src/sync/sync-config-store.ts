import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredSyncConfig {
  remoteBaseUrl: string;
  deviceToken: string;
}

/**
 * Reads/writes the SAME sync-config.json file electron/sync-config.js
 * manages (path handed in via SYNC_CONFIG_PATH, set by electron/main.js —
 * see spawnBackend()). This is what lets the backend persist a device
 * token it obtains automatically at login (AuthService.login ->
 * SyncDevicesClientService.autoRegisterIfNeeded) without any IPC
 * round-trip through the Electron main process: both processes just read
 * and write the same JSON file on disk.
 *
 * On the hosted/Postgres instance SYNC_CONFIG_PATH is never set, so every
 * method here is a safe no-op — there's nothing to persist to and nothing
 * to read (that instance IS the remote; it doesn't dial out to sync).
 */
@Injectable()
export class SyncConfigStore {
  private readonly logger = new Logger(SyncConfigStore.name);

  constructor(private readonly config: ConfigService) {}

  private filePath(): string | null {
    return this.config.get<string>('SYNC_CONFIG_PATH') || null;
  }

  read(): StoredSyncConfig {
    const p = this.filePath();
    if (!p) return { remoteBaseUrl: '', deviceToken: '' };
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        remoteBaseUrl: typeof parsed.remoteBaseUrl === 'string' ? parsed.remoteBaseUrl : '',
        deviceToken: typeof parsed.deviceToken === 'string' ? parsed.deviceToken : '',
      };
    } catch {
      // No file yet, or unreadable/corrupt — same "not configured" treatment
      // electron/sync-config.js uses rather than crashing startup over it.
      return { remoteBaseUrl: '', deviceToken: '' };
    }
  }

  /** Persist a newly-registered device token, preserving whatever remoteBaseUrl is already saved. */
  writeDeviceToken(token: string): void {
    const p = this.filePath();
    if (!p) return;
    try {
      const current = this.read();
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify({ ...current, deviceToken: token }, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.error(`Failed to persist sync device token to ${p}: ${err?.message ?? err}`);
    }
  }

  /** The token this instance should send as X-Sync-Device-Token on outbound /sync/* calls. */
  getDeviceToken(): string {
    // SYNC_DEVICE_TOKEN env is a dev/CI convenience fallback — same role
    // SYNC_SHARED_SECRET used to play before per-device tokens replaced it.
    return this.read().deviceToken || process.env.SYNC_DEVICE_TOKEN || '';
  }
}