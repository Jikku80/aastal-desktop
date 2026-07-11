const { app, dialog, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const INITIAL_DELAY_MS = 10_000;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function log(...args) {
  console.log('[auto-update]', ...args);
}

function setupAutoUpdates() {
  if (!app.isPackaged) {
    log('Skipping — app is not packaged (dev mode).');
    return;
  }

  autoUpdater.on('checking-for-update', () => log('checking for update…'));
  autoUpdater.on('update-available', (info) => log(`update available: ${info.version}`));
  autoUpdater.on('update-not-available', () => log('already on the latest version'));
  autoUpdater.on('error', (err) => log('update check failed:', err?.message ?? err));
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

  const checkNow = () => autoUpdater.checkForUpdates().catch((err) => log('checkForUpdates threw:', err?.message ?? err));
  setTimeout(checkNow, INITIAL_DELAY_MS);
  setInterval(checkNow, CHECK_INTERVAL_MS);
}

module.exports = { setupAutoUpdates, autoUpdater };