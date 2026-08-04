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

// Keep in step with the backend's own limit — see gallery.module.ts /
// gallery.controller.ts's FileInterceptor `limits.fileSize`. PNG captures
// (lossless) run much larger than JPEGs from the same sensor, so a photo
// that's simply too big for the old 20MB cap was previously the single
// most likely reason a PNG "never synced": it failed the same way on
// every retry, forever, with nothing but a console.error no one ever saw.
// Checking client-side first means that specific case is reported to the
// user immediately instead of silently retried every 5 minutes forever.
const MAX_PUSH_SIZE = 40 * 1024 * 1024; // 40 MB — matches backend's cap

let timer = null;
let pushing = false;

// Items we've already surfaced a failure notice for THIS SESSION, so a
// permanently-broken item (e.g. one that's simply too large) doesn't nag
// the user again on every 5-minute retry — only once until it either
// succeeds or the app restarts.
const notifiedFailures = new Set();

function notifyRenderer(getMainWindow, item, reason) {
  if (!getMainWindow) return;
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('gallery-sync:push-failed', { item, reason });
  }
}

/**
 * Pushes a single gallery item's bytes + metadata to the hosted backend.
 * Returns { ok: true } on success (and marks the item pushed), or
 * { ok: false, reason } otherwise — never throws, since this runs in a
 * background sweep that must keep going even if one item fails.
 */
async function pushItem(app, baseUrl, deviceToken, item) {
  let buffer;
  try {
    buffer = fs.readFileSync(item.storedPath);
  } catch (err) {
    const reason = `Could not read the stored file (${err?.message || err})`;
    console.error(`[gallery-sync] ${reason} for ${item.id}`);
    return { ok: false, reason };
  }

  if (buffer.length > MAX_PUSH_SIZE) {
    const reason = `File is ${Math.round(buffer.length / (1024 * 1024))}MB, which is over the ${Math.round(MAX_PUSH_SIZE / (1024 * 1024))}MB sync limit`;
    console.error(`[gallery-sync] push skipped for ${item.id}: ${reason}`);
    return { ok: false, reason };
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
      // Read the body for the actual reason (e.g. multer's 413/400 for an
      // oversized or rejected file) — previously this was discarded, so
      // every failure looked identical ("HTTP 400") no matter the cause.
      let detail = '';
      try { detail = (await res.text())?.slice(0, 300) || ''; } catch { /* ignore */ }
      const reason = `HTTP ${res.status}${detail ? `: ${detail}` : ''}`;
      console.error(`[gallery-sync] push failed for ${item.id}: ${reason}`);
      return { ok: false, reason };
    }

    const body = await res.json();
    galleryStore.markPushed(app, item.id, body?.id || null);
    return { ok: true };
  } catch (err) {
    const reason = err?.message || String(err);
    console.error(`[gallery-sync] push failed for ${item.id}:`, reason);
    return { ok: false, reason };
  }
}

/** Pushes every not-yet-synced gallery item. Safe to call concurrently — re-entrant calls are skipped. */
async function sweep(app, getMainWindow) {
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
      const result = await pushItem(app, remoteBaseUrl, deviceToken, item);
      if (!result.ok && !notifiedFailures.has(item.id)) {
        notifiedFailures.add(item.id);
        notifyRenderer(getMainWindow, item, result.reason);
      }
      if (result.ok) {
        notifiedFailures.delete(item.id);
      }
    }
  } finally {
    pushing = false;
  }
}

/**
 * Starts the periodic retry sweep. Call once at app startup.
 * @param {import('electron').App} app
 * @param {() => import('electron').BrowserWindow | null} [getMainWindow]
 *   Optional — when provided, a permanently-failing item (e.g. one over
 *   the size cap) is reported to the renderer once via
 *   'gallery-sync:push-failed' instead of failing silently forever.
 */
function start(app, getMainWindow) {
  stop();
  // Fire once immediately (don't block startup on it) and then on an interval.
  sweep(app, getMainWindow).catch((err) => console.error('[gallery-sync] initial sweep failed:', err));
  timer = setInterval(() => {
    sweep(app, getMainWindow).catch((err) => console.error('[gallery-sync] sweep failed:', err));
  }, RETRY_INTERVAL_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, sweep };
