const { app, dialog, BrowserWindow } = require('electron');
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
// Regardless of that infra-level fix, this file now also fails soft and
// tells you *why* right in the log instead of a bare, unexplained error —
// and never lets an update-check problem crash or block the app; the
// worst case is simply "no update installed this cycle", the same as
// before.

function log(...args) {
  console.log('[auto-update]', ...args);
}

/** Turn electron-updater's often-cryptic failures into an actionable log line. */
function describeUpdateError(err) {
  const msg = String(err?.message ?? err ?? '');

  if (/404/.test(msg) || /GH_TOKEN|GITHUB_TOKEN/i.test(msg) || /Unable to find latest version/i.test(msg)) {
    return (
      `${msg}\n` +
      `  → This almost always means the GitHub repo configured in ` +
      `electron/package.json's "build.publish" (currently ` +
      `${autoUpdater.getFeedURL?.() ?? 'see package.json'}) is PRIVATE. ` +
      `electron-updater cannot authenticate as an end user and needs the ` +
      `release repo to be public (source can stay private — only the ` +
      `releases/artifacts repo needs to be public). See the comment at ` +
      `the top of electron/auto-update.js for the full explanation.`
    );
  }
  return msg;
}

function setupAutoUpdates() {
  if (!app.isPackaged) {
    log('Skipping — app is not packaged (dev mode).');
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

  autoUpdater.on('checking-for-update', () => log('checking for update…'));
  autoUpdater.on('update-available', (info) => log(`update available: ${info.version}`));
  autoUpdater.on('update-not-available', () => log('already on the latest version'));
  autoUpdater.on('error', (err) => log('update check failed:', describeUpdateError(err)));
  autoUpdater.on('download-progress', (p) => log(`downloading update: ${Math.round(p.percent)}%`));

  autoUpdater.on('update-downloaded', async (info) => {
    log(`update ${info.version} downloaded — prompting user`);
    const win = BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(win, {
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

  const checkNow = () => autoUpdater.checkForUpdates().catch((err) => log('checkForUpdates threw:', describeUpdateError(err)));
  setTimeout(checkNow, INITIAL_DELAY_MS);
  setInterval(checkNow, CHECK_INTERVAL_MS);
}

module.exports = { setupAutoUpdates, autoUpdater };