// electron/sync-config.js
//
// Persists the settings ConnectivityService/SyncService need to talk to the
// remote (hosted) backend: SYNC_REMOTE_BASE_URL and the auto-registered
// per-device sync token.
//
// Stored as plain JSON in Electron's userData dir (same place offline-data.sqlite
// lives), at the SAME path the backend's SyncConfigStore (see
// dentalDB-backend/src/sync/sync-config-store.ts) reads and writes via
// SYNC_CONFIG_PATH — both processes share this one file rather than passing
// the token back and forth over IPC.
//
// There is no manual "sync key" step anymore. On first successful online
// login, the backend calls POST /sync/register-device with the user's own
// JWT (see AuthService.login's auto-registration hook) and writes the
// resulting per-clinic device token straight into this file itself. The
// Electron main process only reads it (to report status to the renderer)
// and never has to prompt the user for one.
//
// Not encrypted at rest. Same threat model as before: if this file leaks,
// the token can be revoked from the admin "Registered Devices" screen
// (Settings > Sync) without affecting any other device, and reading it
// requires filesystem access to that one machine — unlike the old shared
// secret, it can't be reused against any other clinic's data.

const fs = require('fs');
const path = require('path');

// Out-of-the-box default — most clinics use the hosted Aastal backend, so
// the app should sync automatically with zero configuration. This is the
// ORIGIN only (no /api/v1) — see the note in main.js about why
// SYNC_REMOTE_BASE_URL must be the bare origin, not the API-prefixed path.
// Override via Settings > Sync for staging/self-hosted deployments.
const DEFAULT_REMOTE_BASE_URL = 'https://clinickarobar.com';

function configPath(app) {
  return path.join(app.getPath('userData'), 'sync-config.json');
}

/** Strip a trailing /api/v1 (and trailing slashes) — every consumer of this
 * value appends '/api/v1/...' itself, so storing it with the suffix already
 * included would double it up. Defensive: someone may paste a URL they copied
 * from NEXT_PUBLIC_API_URL docs or their browser's address bar either way. */
function normalizeBaseUrl(raw) {
  return (raw || '').trim().replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

function readSyncConfig(app) {
  try {
    const raw = fs.readFileSync(configPath(app), 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      remoteBaseUrl: normalizeBaseUrl(parsed.remoteBaseUrl),
      deviceToken: typeof parsed.deviceToken === 'string' ? parsed.deviceToken : '',
    };
  } catch {
    // No file yet, or unreadable/corrupt — treat as "not configured" rather
    // than crashing startup over a missing optional settings file.
    return { remoteBaseUrl: '', deviceToken: '' };
  }
}

/**
 * Only ever updates remoteBaseUrl from here — deviceToken is written by
 * the BACKEND (SyncConfigStore.writeDeviceToken), not the Electron main
 * process, so this preserves whatever token is already on disk rather than
 * accepting one from the renderer/IPC layer.
 */
function writeSyncConfig(app, { remoteBaseUrl }) {
  const existing = readSyncConfig(app);
  const clean = {
    remoteBaseUrl: normalizeBaseUrl(remoteBaseUrl),
    deviceToken: existing.deviceToken || '',
  };
  fs.mkdirSync(path.dirname(configPath(app)), { recursive: true });
  fs.writeFileSync(configPath(app), JSON.stringify(clean, null, 2), 'utf-8');
  return clean;
}

/**
 * Clears just the device token — used by the "Re-register this device"
 * action in Settings > Sync (e.g. after a clinic revoked this device from
 * the admin screen and wants it to re-register as a fresh row). Restarting
 * the backend after this makes the next login attempt auto-register again.
 */
function clearDeviceToken(app) {
  const existing = readSyncConfig(app);
  const clean = { remoteBaseUrl: existing.remoteBaseUrl, deviceToken: '' };
  fs.mkdirSync(path.dirname(configPath(app)), { recursive: true });
  fs.writeFileSync(configPath(app), JSON.stringify(clean, null, 2), 'utf-8');
  return clean;
}

/**
 * Resolve the effective config:
 *   1. The saved file, if it has a URL in it.
 *   2. SYNC_REMOTE_BASE_URL already in process.env (dev/CI convenience,
 *      e.g. `cross-env` when running electron:dev).
 *   3. DEFAULT_REMOTE_BASE_URL — so a fresh install syncs against the
 *      hosted backend automatically, no typing required.
 */
function resolveSyncConfig(app) {
  const fromFile = readSyncConfig(app);
  if (fromFile.remoteBaseUrl) return fromFile;

  const fromEnv = { remoteBaseUrl: normalizeBaseUrl(process.env.SYNC_REMOTE_BASE_URL), deviceToken: '' };
  if (fromEnv.remoteBaseUrl) return fromEnv;

  return { remoteBaseUrl: DEFAULT_REMOTE_BASE_URL, deviceToken: fromFile.deviceToken };
}

module.exports = {
  readSyncConfig, writeSyncConfig, clearDeviceToken, resolveSyncConfig,
  configPath, DEFAULT_REMOTE_BASE_URL, normalizeBaseUrl,
};
