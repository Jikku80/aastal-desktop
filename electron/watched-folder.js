// electron/watched-folder.js
//
// Owns the chokidar watcher that implements "Watched-folder auto-import":
// the moment a new image lands in the configured folder, it's copied into
// the local gallery (see gallery-store.js) and — if a renderer window is
// up — pushed over IPC so it can prompt "attach this to the open patient?"
// immediately.
//
// This watcher is started once at app launch (see main.js) whenever a
// folder is already configured, independent of whether anyone is logged
// in yet — so if the user is already signed in when a new photo lands, it
// is picked up the instant it lands rather than only on the next app
// restart or manual refresh.

const chokidar = require('chokidar');
const galleryStore = require('./gallery-store');
const folderStore = require('./watched-folder-store');

let watcher = null;

/**
 * (Re)starts the watcher against whatever is currently saved in
 * watched-folder-store. Safe to call repeatedly (e.g. after Settings >
 * Photo Sync saves a new folder) — always tears down any previous watcher
 * first so we never end up watching two folders (or the same folder
 * twice) at once.
 *
 * @param {import('electron').App} app
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 *   A getter rather than a captured reference, since the BrowserWindow can
 *   be recreated after this is first called.
 */
function start(app, getMainWindow) {
  stop();

  const cfg = folderStore.readConfig(app);
  if (!cfg.enabled || !cfg.folderPath) return;

  watcher = chokidar.watch(cfg.folderPath, {
    // Files already sitting in the folder when the watcher (re)starts —
    // including ones from a previous session — must NOT be re-imported on
    // every launch. Only genuinely new arrivals should fire 'add'.
    ignoreInitial: true,
    // A flat folder: a phone sync tool or SD-card importer drops files
    // directly here, not into dated subfolders. Keeps the watcher cheap
    // and avoids accidentally recursing into something huge.
    depth: 0,
    awaitWriteFinish: {
      // A file copy can take a moment to finish writing (e.g. from an SD
      // card, or a phone sync tool streaming it over Wi-Fi). Without this,
      // chokidar fires 'add' the instant the file is CREATED, and we'd
      // copy a half-written file into the gallery. Wait for the size to
      // stop changing first.
      stabilityThreshold: 1500,
      pollInterval: 200,
    },
  });

  watcher.on('add', (filePath) => {
    if (!galleryStore.isImageFile(filePath)) return; // non-image files in the folder are ignored
    const item = galleryStore.addItem(app, filePath, cfg.branchId, cfg.branchName);
    if (!item) return; // not a recognized image, or already imported

    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('watched-folder:new-image', item);
    }
    // If no window is up yet, the item still landed in the gallery via
    // addItem above — it'll simply be picked up next time the gallery is
    // opened, rather than triggering the live "attach this?" prompt.
  });

  watcher.on('error', (err) => {
    console.error('[watched-folder] watcher error:', err);
  });
}

function stop() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

module.exports = { start, stop };