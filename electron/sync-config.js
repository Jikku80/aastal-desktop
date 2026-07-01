// electron/sync-config.js
//
// Persists the two settings ConnectivityService/SyncService need to talk to
// the remote (hosted) backend: SYNC_REMOTE_BASE_URL and SYNC_SHARED_SECRET.
//
// Stored as plain JSON in Electron's userData dir (same place offline-data.sqlite
// lives) rather than baked into the build, because:
//   1. A secret baked into the distributed binary is extractable from the
//      asar by anyone who installs the app — see the security note on
//      SyncSecretGuard. Until that's replaced with a per-clinic credential,
//      treat this file the same way: don't ship a default secret with the app.
//   2. Different clinics/installs may point at different environments
//      (staging vs prod) without needing a separate build per clinic.
//
// Not encrypted at rest — acceptable for now since the shared secret should
// be rotated server-side once a real per-clinic auth scheme replaces it
// (see diagnosis). Flagging here rather than silently treating this as solved.

const fs = require('fs');
const path = require('path');

// Out-of-the-box default — most clinics use the hosted Aastal/ClinicKarobar
// backend, so the app should sync automatically with zero configuration.
// This is the ORIGIN only (no /api/v1) — see the note in main.js about why
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
      sharedSecret: typeof parsed.sharedSecret === 'string' ? parsed.sharedSecret : '',
    };
  } catch {
    // No file yet, or unreadable/corrupt — treat as "not configured" rather
    // than crashing startup over a missing optional settings file.
    return { remoteBaseUrl: '', sharedSecret: '' };
  }
}

function writeSyncConfig(app, { remoteBaseUrl, sharedSecret }) {
  const clean = {
    remoteBaseUrl: normalizeBaseUrl(remoteBaseUrl),
    sharedSecret: sharedSecret || '',
  };
  fs.mkdirSync(path.dirname(configPath(app)), { recursive: true });
  fs.writeFileSync(configPath(app), JSON.stringify(clean, null, 2), 'utf-8');
  return clean;
}

/**
 * Resolve the effective config:
 *   1. The saved file, if it has a URL in it.
 *   2. SYNC_REMOTE_BASE_URL / SYNC_SHARED_SECRET already in process.env
 *      (dev/CI convenience, e.g. `cross-env` when running electron:dev).
 *   3. DEFAULT_REMOTE_BASE_URL — so a fresh install syncs against the
 *      hosted backend automatically, no typing required. The secret still
 *      has to come from somewhere real (see the security note in main.js
 *      and the diagnosis) — it is deliberately NOT defaulted here.
 */
function resolveSyncConfig(app) {
  const fromFile = readSyncConfig(app);
  if (fromFile.remoteBaseUrl) return fromFile;

  const fromEnv = {
    remoteBaseUrl: normalizeBaseUrl(process.env.SYNC_REMOTE_BASE_URL),
    sharedSecret: process.env.SYNC_SHARED_SECRET || '',
  };
  if (fromEnv.remoteBaseUrl) return fromEnv;

  return { remoteBaseUrl: DEFAULT_REMOTE_BASE_URL, sharedSecret: fromFile.sharedSecret || fromEnv.sharedSecret };
}

module.exports = { readSyncConfig, writeSyncConfig, resolveSyncConfig, configPath, DEFAULT_REMOTE_BASE_URL, normalizeBaseUrl };
