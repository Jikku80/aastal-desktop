const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const INITIAL_DELAY_MS = 10_000;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// ── Why client machines were seeing a "GH_TOKEN"/"GITHUB_TOKEN not found"
//    error ───────────────────────────────────────────────────────────────
// electron/package.json's `build.publish` points at a GitHub repo
// (jikku80/aastal-desktop) with no `"private"` flag set. electron-updater's
// GitHub provider still auto-detects a private repo at runtime by trying an
// unauthenticated request against the GitHub Releases API — and on a
// PRIVATE repo that 404s, which electron-updater then reports back as
// needing a token, i.e. exactly the "GH_TOKEN ... not found"-shaped error
// text this app was throwing on client machines. This is NOT a build-time
// problem — the CI workflow (.github/workflows/release.yml) already sets
// GH_TOKEN correctly when *publishing* a release. It's a RUN-TIME problem:
// a token that only exists as a CI secret can never be present on an end
// user's machine, and shipping a real GitHub token inside a distributed
// installer would hand every user your repo credentials — never do that.
//
// The correct, secure fix for a commercial desktop app is: the RELEASES
// repo electron-updater points at must be a PUBLIC repo (containing only
// built installers/artifacts, no source) — public GitHub Releases need no
// auth at all to read. Your source code can (and should) stay in a
// separate private repo; only change where `build.publish.owner/repo` in
// electron/package.json points, and have the release CI job push built
// artifacts there instead. See electron/package.json for the updated
// config + a fallback local `UPDATE_FEED_URL` override for anyone who
// truly cannot make releases public (e.g. an internal enterprise feed
// behind a private, pre-authenticated static file host — NOT GitHub).
//
// ── Why Windows specifically was never seeing updates ─────────────────────
// This file's logic itself was never platform-gated — checks run the same
// way on every OS. The actual break was one level up, in CI
// (.github/workflows/release.yml): the Windows packaging step
// (electron-builder --win --publish always) had been silently HANGING at
// the NSIS build stage and hitting its timeout, which fails that matrix
// job — so on a release tag, Linux (and usually Mac) would publish a new
// GitHub Release with their installers + update-feed YAML
// (latest-linux.yml / latest-mac.yml) just fine, while the Windows job
// never got as far as uploading anything at all. No latest.yml on the
// release means every Windows install's autoUpdater.checkForUpdates()
// call correctly reports "no update available" forever, because as far as
// the GitHub Releases feed is concerned, there genuinely isn't one for
// Windows. See release.yml's Windows job for the actual packaging fix
// (build+verify before publish, so a hang can never half-publish a
// release missing its Windows assets again).
//
// Regardless of that infra-level fix, this file also fails soft and tells
// you *why* right in the log instead of a bare, unexplained error — and
// never lets an update-check problem crash or block the app; the worst
// case is simply "no update installed this cycle", the same as before.
// It also now reports live status (checking/available/downloading/
// downloaded/error) over IPC so Settings can show a real "Check for
// updates" control instead of this running invisibly in the background —
// see main.js's update:* IPC handlers and preload.js's exposed API.

/** @type {{ state: string, info?: any, percent?: number, error?: string, checkedAt?: string }} */
let status = { state: 'idle' };

/** @type {(() => import('electron').BrowserWindow | null) | null} */
let getMainWindowRef = null;

function log(...args) {
  console.log('[auto-update]', ...args);
}

function setStatus(patch) {
  status = { ...status, ...patch };
  const win = getMainWindowRef?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send('update:status', status);
  }
}

/** Turn electron-updater's often-cryptic failures into an actionable log line. */
function describeUpdateError(err) {
  const msg = String(err?.message ?? err ?? '');

  if (/404/.test(msg) || /GH_TOKEN|GITHUB_TOKEN/i.test(msg) || /Unable to find latest version/i.test(msg)) {
    return (
      `${msg}\n` +
      `  → This almost always means either the GitHub repo configured in ` +
      `electron/package.json's "build.publish" (currently ` +
      `${autoUpdater.getFeedURL?.() ?? 'see package.json'}) is PRIVATE, ` +
      `or the latest release is missing this platform's update-feed file ` +
      `(e.g. latest.yml for Windows) because that platform's CI packaging ` +
      `job failed/hung and never uploaded it. See the comment at the top ` +
      `of electron/auto-update.js for the full explanation.`
    );
  }
  return msg;
}

/** Snapshot for the renderer to read on demand (e.g. when Settings first opens), separate from the pushed 'update:status' events. */
function getStatus() {
  return status;
}

/**
 * Wires up electron-updater's event stream once at app startup, then does
 * an initial check after INITIAL_DELAY_MS and repeats every
 * CHECK_INTERVAL_MS. Safe to skip in dev — there's no packaged app to
 * update. `getMainWindow` is used to (a) show the "restart now?" dialog
 * on the automatic background flow and (b) push live status to the
 * renderer for the manual Settings > check-for-updates control.
 *
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
function setupAutoUpdates(getMainWindow) {
  getMainWindowRef = getMainWindow || null;

  if (!app.isPackaged) {
    log('Skipping — app is not packaged (dev mode).');
    setStatus({ state: 'unavailable', reason: 'Not a packaged build' });
    return;
  }

  // Optional escape hatch for anyone who genuinely needs to point at a
  // private/self-hosted update feed instead of the public GitHub repo
  // baked into app-update.yml at build time (e.g. an enterprise on-prem
  // deployment). Unset by default — normal builds use the public GitHub
  // releases repo and need none of this.
  if (process.env.UPDATE_FEED_URL) {
    log(`Using UPDATE_FEED_URL override: ${process.env.UPDATE_FEED_URL}`);
    autoUpdater.setFeedURL({ provider: 'generic', url: process.env.UPDATE_FEED_URL });
  }

  log(`platform=${process.platform} arch=${process.arch} currentVersion=${app.getVersion()}`);

  autoUpdater.on('checking-for-update', () => {
    log('checking for update…');
    setStatus({ state: 'checking', error: undefined, checkedAt: new Date().toISOString() });
  });

  autoUpdater.on('update-available', (info) => {
    log(`update available: ${info.version}`);
    setStatus({ state: 'available', info: { version: info.version, releaseDate: info.releaseDate } });
  });

  autoUpdater.on('update-not-available', (info) => {
    log('already on the latest version');
    setStatus({ state: 'not-available', info: { version: info?.version } });
  });

  autoUpdater.on('error', (err) => {
    const reason = describeUpdateError(err);
    log('update check failed:', reason);
    setStatus({ state: 'error', error: String(err?.message ?? err ?? 'Update check failed') });
  });

  autoUpdater.on('download-progress', (p) => {
    log(`downloading update: ${Math.round(p.percent)}%`);
    setStatus({ state: 'downloading', percent: Math.round(p.percent) });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    log(`update ${info.version} downloaded — prompting user`);
    setStatus({ state: 'downloaded', info: { version: info.version } });

    const win = getMainWindowRef?.();
    const { response } = await dialog.showMessageBox(win || undefined, {
      type: 'info',
      title: 'Update ready',
      message: `Aastal ${info.version} has been downloaded.`,
      detail: 'Restart now to install it, or it will install automatically the next time you close the app.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  const checkNow = () => autoUpdater.checkForUpdates().catch((err) => {
    log('checkForUpdates threw:', describeUpdateError(err));
    setStatus({ state: 'error', error: String(err?.message ?? err ?? 'Update check failed') });
  });

  setTimeout(checkNow, INITIAL_DELAY_MS);
  setInterval(checkNow, CHECK_INTERVAL_MS);
}

/** Manual "Check for updates" trigger for a Settings-screen button — same underlying check as the background timer, just on demand. */
function checkForUpdatesNow() {
  if (!app.isPackaged) {
    setStatus({ state: 'unavailable', reason: 'Not a packaged build' });
    return Promise.resolve();
  }
  return autoUpdater.checkForUpdates().catch((err) => {
    log('manual checkForUpdates threw:', describeUpdateError(err));
    setStatus({ state: 'error', error: String(err?.message ?? err ?? 'Update check failed') });
  });
}

/** Restarts and installs an already-downloaded update — only meaningful once status.state === 'downloaded'. */
function installUpdateNow() {
  autoUpdater.quitAndInstall();
}

module.exports = { setupAutoUpdates, checkForUpdatesNow, installUpdateNow, getStatus, autoUpdater };
