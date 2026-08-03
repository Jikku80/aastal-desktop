// electron/gallery-sync.js
//
// Pushes locally-captured gallery items (see gallery-store.js and
// watched-folder.js) up to the hosted backend, so a branch's photos are
// visible from the WEB app too — not just from this one desktop install.
// Uses the same per-device auth as the rest of sync (X-Sync-Device-Token,
// see sync-config.js) hitting a dedicated online-only endpoint,
// POST /api/v1/gallery/sync, rather than the generic entity-sync engine
// (gallery items aren't a synced entity — they're server-native records
// this desktop app is the SOURCE for, going in one direction only).
//
// Runs a sweep on startup and every RETRY_INTERVAL_MS after that, so
// anything that failed to push while offline (or before this device had
// completed sync registration) eventually gets there without the user
// having to do anything.

const fs = require('fs');
const galleryStore = require('./gallery-store');
const { resolveSyncConfig } = require('./sync-config');

const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let timer = null;
let pushing = false;

/**
 * Pushes a single gallery item's bytes + metadata to the hosted backend.
 * Returns true on success (and marks the item pushed), false otherwise —
 * never throws, since this runs in a background sweep that must keep
 * going even if one item fails.
 */
async function pushItem(app, baseUrl, deviceToken, item) {
  let buffer;
  try {
    buffer = fs.readFileSync(item.storedPath);
  } catch (err) {
    console.error(`[gallery-sync] could not read stored file for ${item.id}:`, err);
    return false;
  }

  try {
    const form = new FormData();
    form.append('branchId', item.branchId || '');
    form.append('branchName', item.branchName || '');
    form.append('fileName', item.fileName);
    form.append('capturedAt', item.addedAt);
    form.append('file', new Blob([buffer], { type: item.mimeType }), item.fileName);

    const res = await fetch(`${baseUrl}/api/v1/gallery/sync`, {
      method: 'POST',
      headers: { 'X-Sync-Device-Token': deviceToken },
      body: form,
    });

    if (!res.ok) {
      console.error(`[gallery-sync] push failed for ${item.id}: HTTP ${res.status}`);
      return false;
    }

    const body = await res.json();
    galleryStore.markPushed(app, item.id, body?.id || null);
    return true;
  } catch (err) {
    console.error(`[gallery-sync] push failed for ${item.id}:`, err?.message || err);
    return false;
  }
}

/** Pushes every not-yet-synced gallery item. Safe to call concurrently — re-entrant calls are skipped. */
async function sweep(app) {
  if (pushing) return;
  const { remoteBaseUrl, deviceToken } = resolveSyncConfig(app);
  // Nothing to push to yet — either no remote configured, or this device
  // hasn't completed automatic sync registration (see AuthService.login's
  // auto-registration hook). Silently skip; the next scheduled sweep will
  // pick it up once that's in place.
  if (!remoteBaseUrl || !deviceToken) return;

  const pending = galleryStore.listUnpushed(app);
  if (!pending.length) return;

  pushing = true;
  try {
    for (const item of pending) {
      await pushItem(app, remoteBaseUrl, deviceToken, item);
    }
  } finally {
    pushing = false;
  }
}

/** Starts the periodic retry sweep. Call once at app startup. */
function start(app) {
  stop();
  // Fire once immediately (don't block startup on it) and then on an interval.
  sweep(app).catch((err) => console.error('[gallery-sync] initial sweep failed:', err));
  timer = setInterval(() => {
    sweep(app).catch((err) => console.error('[gallery-sync] sweep failed:', err));
  }, RETRY_INTERVAL_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, sweep };
