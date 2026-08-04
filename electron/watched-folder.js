// electron/watched-folder.js
//
// Owns the chokidar watchers that implement "Watched-folder auto-import".
// A clinic can have several branches, each with its own machine capturing
// x-rays/photos into its own local folder — so this runs ONE independent
// watcher PER configured branch folder, all at once, each tagging newly
// detected images with its own branch. The moment a new image lands in
// any of them, it's copied into the local gallery (see gallery-store.js)
// and — if a renderer window is up — pushed over IPC so it can prompt
// "attach this to the open patient?" immediately.
//
// (Re)started as a whole every time Settings > Photo Sync adds, edits, or
// removes an entry (see main.js's watched-folder:* IPC handlers) — always
// tears down every previous watcher first so we never end up with two
// watchers on the same folder, or a stale watcher for a folder/branch that
// was just removed.

const chokidar = require('chokidar');
const galleryStore = require('./gallery-store');
const folderStore = require('./watched-folder-store');

/** @type {Map<string, import('chokidar').FSWatcher>} entry id -> watcher */
let watchers = new Map();

// How many levels deep to recurse below the watched folder itself.
// Some capture setups drop every image flat into ONE folder (depth 0 would
// have been enough for those); others create ONE SUBFOLDER PER PATIENT and
// drop that patient's images inside it (depth 1). A few nest even one level
// further (e.g. per-patient -> per-visit-date). 4 comfortably covers all of
// these real layouts seen in the field without turning this into an
// accidental recursive watch of someone's entire Pictures or Desktop folder
// if they mis-point it at something huge.
const WATCH_DEPTH = 4;

/**
 * (Re)starts every watcher against whatever is currently saved in
 * watched-folder-store — one per enabled entry with a folder path. Safe to
 * call repeatedly.
 *
 * @param {import('electron').App} app
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 *   A getter rather than a captured reference, since the BrowserWindow can
 *   be recreated after this is first called.
 */
function start(app, getMainWindow) {
  stop();

  const entries = folderStore.readConfig(app).filter((e) => e.enabled && e.folderPath);

  for (const entry of entries) {
    const watcher = chokidar.watch(entry.folderPath, {
      // Files already sitting in the folder when the watcher (re)starts —
      // including ones from a previous session — must NOT be re-imported
      // on every launch. Only genuinely new arrivals should fire 'add'.
      ignoreInitial: true,
      // Recurse into subfolders too — some capture apps store everything
      // flat in one folder, others create ONE SUBFOLDER PER PATIENT with
      // that patient's images inside it. depth: 0 (the old setting) only
      // ever saw the flat case; anything nested one or more folders deep
      // was silently invisible to the watcher. See WATCH_DEPTH above.
      depth: WATCH_DEPTH,
      // Folder paths come straight from the native OS folder picker
      // (dialog.showOpenDialog), not typed by hand — but chokidar treats
      // the watch path as a glob pattern by default, so a path containing
      // glob-special characters (parentheses, brackets, '+', '@', '!' —
      // all legal and common in real Windows folder names, e.g.
      // "X-Ray Photos (Room 2)") can silently fail to match anything.
      // disableGlobbing makes chokidar treat it as a literal path instead.
      disableGlobbing: true,
      awaitWriteFinish: {
        // A file copy can take a moment to finish writing (e.g. from an
        // SD card, or a phone sync tool streaming it over Wi-Fi). Without
        // this, chokidar fires 'add' the instant the file is CREATED, and
        // we'd copy a half-written file into the gallery. Wait for the
        // size to stop changing first.
        stabilityThreshold: 1500,
        pollInterval: 200,
      },
    });

    watcher.on('add', (filePath) => {
      if (!galleryStore.isImageFile(filePath)) return; // non-image files in the folder are ignored
      const item = galleryStore.addItem(app, filePath, entry.branchId, entry.branchName);
      if (!item) return; // not a recognized image, or already imported

      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('watched-folder:new-image', item);
      }
      // If no window is up yet, the item still landed in the gallery via
      // addItem above — it'll simply be picked up next time the gallery
      // is opened, rather than triggering the live "attach this?" prompt.
    });

    watcher.on('error', (err) => {
      console.error(`[watched-folder] watcher error for branch "${entry.branchName || entry.branchId}":`, err);
    });

    watchers.set(entry.id, watcher);
  }
}

function stop() {
  for (const watcher of watchers.values()) {
    watcher.close();
  }
  watchers = new Map();
}

module.exports = { start, stop };
