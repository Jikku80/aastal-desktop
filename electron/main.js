const { app, BrowserWindow, Menu, shell, nativeImage, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { readSyncConfig, writeSyncConfig, clearDeviceToken, resolveSyncConfig, configPath } = require('./sync-config');
const { getOrCreateLocalJwtSecrets } = require('./local-jwt-secrets');
const { setupAutoUpdates } = require('./auto-update');
const credentialStore = require('./credential-store');
const watchedFolderStore = require('./watched-folder-store');
const galleryStore = require('./gallery-store');
const watchedFolderWatcher = require('./watched-folder');
const gallerySync = require('./gallery-sync');

const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3100;
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_INTERVAL_MS = 500;

let backendProcess = null;
let frontendProcess = null;
let mainWindow = null;

// Linux AppImages can't rely on chrome-sandbox running setuid-root unattended
// (no install-time hook to chown/chmod it the way a .deb postinst would, and
// Ubuntu 24.04+ often blocks unprivileged user namespaces via AppArmor anyway,
// breaking the sandbox regardless). Baking the switch in here means users
// never have to launch with `--no-sandbox` by hand. This only weakens the
// Chromium-level sandbox for a controlled internal app that isn't rendering
// arbitrary untrusted web content — Windows and macOS are unaffected and keep
// their normal sandboxing.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

function resolveResourcePath(...segments) {
  // In a packaged app, extraResources land under process.resourcesPath
  // under the fixed names set by electron-builder's "to" config (always
  // 'backend'/'frontend' regardless of your actual source folder names —
  // see electron/package.json's extraResources). In dev (running
  // `electron .` or `npm run electron:dev` against the repo directly,
  // without packaging), fall back to the REAL adjacent folder names, since
  // there's no 'backend'/'frontend' folder there unless yours happen to be
  // named that. Override via env vars if your folder names ever change.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }
  const devBackendDir = process.env.DEV_BACKEND_DIR || 'dentalDB-backend';
  const devFrontendDir = process.env.DEV_FRONTEND_DIR || 'dentaldb';
  const repoRoot = path.join(__dirname, '..');
  const [first, ...rest] = segments;

  if (first === 'backend') {
    return path.join(repoRoot, devBackendDir, ...rest);
  }
  // frontend: packaged builds flatten .next/standalone/* into the resource
  // root (see electron/package.json extraResources), but in dev mode
  // server.js still lives at its normal nested Next.js build output path.
  return path.join(repoRoot, devFrontendDir, '.next', 'standalone', ...rest);
}

function waitForHealth(port, label, healthPath = '/') {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: healthPath, timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        return reject(new Error(`${label} did not become healthy within ${HEALTH_TIMEOUT_MS}ms`));
      }
      setTimeout(attempt, HEALTH_POLL_INTERVAL_MS);
    };
    attempt();
  });
}

function spawnBackend() {
  const entry = resolveResourcePath('backend', 'dist', 'main.js');
  const sqlitePath = path.join(app.getPath('userData'), 'offline-data.sqlite');
  // Uploaded files (avatars, signatures, clinic logos, product photos,
  // prescription PDFs, website assets) must live under userData, not
  // wherever the backend's process.cwd() happens to be. cwd for a spawned
  // child process is inherited from whatever directory launched Electron —
  // not necessarily the install directory, and not necessarily writable
  // (e.g. a per-machine Windows install under Program Files requires admin
  // rights to write there). userData is always a writable, OS-appropriate,
  // stable location (AppData\Roaming, ~/.config, ~/Library/Application
  // Support) — see src/common/utils/uploads-dir.util.ts on the backend side.
  const uploadsDir = path.join(app.getPath('userData'), 'uploads');
  const syncConfig = resolveSyncConfig(app);

  if (!syncConfig.remoteBaseUrl) {
    console.warn('[sync] No remote base URL configured — this instance will run fully offline ' +
      'until configured from Settings > Sync. Connectivity polling stays disabled until then.');
  }

  // Spawning process.execPath (Electron's own binary) with
  // ELECTRON_RUN_AS_NODE=1 runs it as plain Node against `entry`, using
  // Electron's bundled Node runtime — this is the standard way to run a
  // Node backend alongside Electron WITHOUT requiring a separate Node.js
  // install on the user's machine. It is not a typo for a system `node`
  // binary.
  // JWT_SECRET/JWT_REFRESH_SECRET only need to sign/verify tokens for THIS
  // machine's local/offline sessions against the local SQLite database —
  // they no longer need to match the hosted/remote backend's secret at all.
  // (They used to: AuthService.login's auto-registration hook used to POST
  // this instance's own JWT to the remote as Bearer auth, which only
  // worked if both secrets matched — see SyncService.autoRegisterDeviceIfNeeded
  // for how that flow now works instead, via a real remote login.)
  // Generated once per install and persisted in userData — see
  // local-jwt-secrets.js. Never hardcode a secret here again: a literal
  // baked into main.js ships identically inside every copy of the app and
  // can be extracted from the packaged app.asar.
  const { jwtSecret, jwtRefreshSecret } = getOrCreateLocalJwtSecrets(app);

  backendProcess = spawn(process.execPath, [entry], {
    // Explicit, fixed cwd — never inherit whatever directory launched
    // Electron (see the uploadsDir comment above; the same reasoning
    // applies to anything else in the backend that might resolve a
    // relative path off process.cwd()).
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      DB_DRIVER: 'sqlite',
      SQLITE_DB_PATH: sqlitePath,
      UPLOADS_DIR: uploadsDir,
      PORT: String(BACKEND_PORT),
      SQLITE_AUTO_MIGRATE: 'true',
      JWT_SECRET: jwtSecret,
      JWT_REFRESH_SECRET: jwtRefreshSecret,
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      // Read from sync-config.json (auto-populated on first login, or set
      // via Settings > Sync's "Advanced" URL override) or, as a dev/CI
      // fallback, from env vars already present when Electron itself was
      // launched. Omitted entirely (not set to '') when unset, so
      // ConnectivityService's `if (!remote)` check sees them as truly
      // absent rather than an empty string.
      ...(syncConfig.remoteBaseUrl ? { SYNC_REMOTE_BASE_URL: syncConfig.remoteBaseUrl } : {}),
      // Lets the backend's SyncConfigStore read/write the SAME file this
      // process manages (see sync-config.js) — this is how the
      // auto-registration hook in AuthService.login persists the device
      // token without any IPC round-trip back through this main process.
      SYNC_CONFIG_PATH: configPath(app),
      ELECTRON_RUN_AS_NODE: '1',
      EXTRA_CORS_ORIGINS: 'http://127.0.0.1:3100,http://localhost:3100',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', (d) => console.log(`[backend] ${d}`));
  backendProcess.stderr.on('data', (d) => console.error(`[backend] ${d}`));
  backendProcess.on('exit', (code) => {
    console.error(`[backend] exited with code ${code}`);
    backendProcess = null;
  });
}

/**
 * Kill the running backend and start a fresh one with the current
 * sync-config, then wait for it to report healthy again. Used after the
 * Settings > Sync screen saves new remote URL / secret, so the change
 * takes effect immediately without restarting the whole Electron app
 * (which would also reload the renderer and lose in-progress UI state).
 */
async function restartBackend() {
  const old = backendProcess;
  if (old && !old.killed) {
    await new Promise((resolve) => {
      old.once('exit', resolve);
      old.kill('SIGTERM');
      // Don't hang forever if the process is wedged.
      setTimeout(resolve, 5000);
    });
  }
  spawnBackend();
  // /health is mounted under the global 'api/v1' prefix (setGlobalPrefix has
  // no exclude list) — must use the prefixed path or every health check 404s.
  await waitForHealth(BACKEND_PORT, 'backend', '/api/v1/health');
}

function spawnFrontend() {
  const entry = resolveResourcePath('frontend', 'server.js'); // .next/standalone/server.js, copied flat — see build script

  frontendProcess = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: String(FRONTEND_PORT),
      HOSTNAME: '127.0.0.1',
      ELECTRON_RUN_AS_NODE: '1',
      EXTRA_CORS_ORIGINS: 'http://127.0.0.1:3100,http://localhost:3100',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  frontendProcess.stdout.on('data', (d) => console.log(`[frontend] ${d}`));
  frontendProcess.stderr.on('data', (d) => console.error(`[frontend] ${d}`));
  frontendProcess.on('exit', (code) => {
    console.error(`[frontend] exited with code ${code}`);
    frontendProcess = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Aastal',
    icon: process.platform === 'win32' ? path.join(__dirname, 'build/icon.ico') : process.platform === 'darwin' ? path.join(__dirname, 'build/icon.icns') : path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open target="_blank" links (e.g. third-party payment gateway redirects)
  // in the system browser rather than a captive Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function startup() {
  spawnBackend();
  spawnFrontend();

  try {
    await Promise.all([
      waitForHealth(BACKEND_PORT, 'backend', '/api/v1/health'),
      waitForHealth(FRONTEND_PORT, 'frontend', '/'), // Next.js standalone server — '/' is enough to prove it's up
    ]);
  } catch (err) {
    console.error('Startup health check failed:', err);
    // Still attempt to load the window — better to show whatever error
    // page the frontend itself renders than a blank Electron shell with
    // no explanation. The 60s timeout is generous; this path should be rare.
  }

  createWindow();
  setupAutoUpdates();

  // Independent of whether anyone is logged in yet — if any watched
  // folders are already configured (from a previous session), start
  // watching them immediately, so an already-signed-in user sees new
  // images picked up the instant they land rather than only after a
  // manual refresh.
  watchedFolderWatcher.start(app, () => mainWindow);

  // Periodically pushes any gallery items not yet on the hosted backend
  // (e.g. captured while offline, or before this device's sync token was
  // ready) — see gallery-sync.js.
  gallerySync.start(app);
}

function shutdown() {
  watchedFolderWatcher.stop();
  gallerySync.stop();
  for (const proc of [frontendProcess, backendProcess]) {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }
}

// Single-instance lock — a second launch focuses the existing window
// instead of spawning a second pair of backend/frontend processes (which
// would both try to bind the same ports and immediately fail).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    // ── Sync config IPC ──────────────────────────────────────────────────
    // Exposed to the renderer via preload.js's contextBridge. The renderer
    // never touches the filesystem or env directly — it only ever sees
    // these calls.
    ipcMain.handle('sync-config:get', () => {
      // Use the EFFECTIVE config (falls back to DEFAULT_REMOTE_BASE_URL),
      // not just what's explicitly saved — otherwise the Settings screen
      // would show a blank URL even while the backend is already
      // auto-connected to the default. There is no manual key to enter
      // anymore — hasDeviceToken just reports whether the automatic
      // registration (POST /sync/register-device, triggered from
      // AuthService.login on first online login) has completed yet.
      const cfg = resolveSyncConfig(app);
      const isDefault = !readSyncConfig(app).remoteBaseUrl; // true when the file itself is empty
      return { remoteBaseUrl: cfg.remoteBaseUrl, hasDeviceToken: !!cfg.deviceToken, isDefault };
    });

    ipcMain.handle('sync-config:set', async (_event, { remoteBaseUrl }) => {
      writeSyncConfig(app, { remoteBaseUrl });
      try {
        await restartBackend();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err?.message ?? String(err) };
      }
    });

    // "Re-register this device" — used after an admin revokes this device
    // from the Registered Devices screen (Settings > Sync), so it can get
    // a fresh token instead of staying permanently unregistered. Clears
    // the stored token and restarts the backend; the actual re-registration
    // happens automatically on the user's next login (or immediately if
    // their session is still valid — AuthService only registers on the
    // login endpoint itself, so a re-login may be needed).
    ipcMain.handle('sync-config:reregister', async () => {
      clearDeviceToken(app);
      try {
        await restartBackend();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err?.message ?? String(err) };
      }
    });

    // ── Saved login credentials ("Remember me") ────────────────────────────
    ipcMain.handle('credentials:get', () => credentialStore.getCredentials(app));
    ipcMain.handle('credentials:save', (_event, creds) => credentialStore.saveCredentials(app, creds));
    ipcMain.handle('credentials:clear', () => credentialStore.clearCredentials(app));

    // ── Watched-folder auto-import (one entry per branch) ───────────────────
    ipcMain.handle('watched-folder:list', () => {
      return watchedFolderStore.readConfig(app).map((f) => ({ ...f, isWatching: f.enabled && !!f.folderPath }));
    });

    ipcMain.handle('watched-folder:pick-folder', async () => {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose a folder to watch for new images',
        properties: ['openDirectory'],
      });
      if (result.canceled || !result.filePaths.length) return null;
      return result.filePaths[0];
    });

    ipcMain.handle('watched-folder:add', async (_event, entry) => {
      try {
        const added = watchedFolderStore.addEntry(app, entry);
        watchedFolderWatcher.start(app, () => mainWindow);
        return { ok: true, entry: added };
      } catch (err) {
        return { ok: false, error: err?.message ?? String(err) };
      }
    });

    ipcMain.handle('watched-folder:update', async (_event, { id, patch }) => {
      try {
        const updated = watchedFolderStore.updateEntry(app, id, patch);
        if (!updated) return { ok: false, error: 'Watched folder not found' };
        watchedFolderWatcher.start(app, () => mainWindow);
        return { ok: true, entry: updated };
      } catch (err) {
        return { ok: false, error: err?.message ?? String(err) };
      }
    });

    ipcMain.handle('watched-folder:remove', async (_event, id) => {
      try {
        const removed = watchedFolderStore.removeEntry(app, id);
        watchedFolderWatcher.start(app, () => mainWindow);
        return { ok: removed };
      } catch (err) {
        return { ok: false, error: err?.message ?? String(err) };
      }
    });

    // "Open local folder" upload option — a native multi-select file picker
    // (nicer than a plain browser <input type=file>: remembers the last
    // directory across the app, isn't sandboxed to a single click target).
    // Reads the chosen files into base64 so the renderer can build File
    // objects and push them through the existing upload API itself — this
    // process never talks to the backend directly, so auth stays exactly
    // as it already works (HttpOnly cookie on the renderer's own requests).
    ipcMain.handle('local-files:pick-and-read', async () => {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose images to upload',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'heif'] }],
      });
      if (result.canceled || !result.filePaths.length) return [];

      const MAX_SIZE = 20 * 1024 * 1024; // matches the existing 20MB cap in PatientFilesPanel
      const MIME_BY_EXT = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
        '.webp': 'image/webp', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
        '.heic': 'image/heic', '.heif': 'image/heif',
      };
      const files = [];
      for (const filePath of result.filePaths) {
        try {
          const stat = fs.statSync(filePath);
          if (stat.size > MAX_SIZE) continue; // silently skip oversized files; renderer still gets the rest
          const buffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          files.push({
            fileName: path.basename(filePath),
            mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
            size: stat.size,
            data: buffer.toString('base64'),
          });
        } catch (err) {
          console.error('[local-files] failed to read', filePath, err);
        }
      }
      return files;
    });

    // ── Gallery (images pulled in from the watched folder) ─────────────────
    ipcMain.handle('gallery:list', (_event, branchId) => galleryStore.listItems(app, branchId));
    ipcMain.handle('gallery:read-file', (_event, id) => galleryStore.readItemFile(app, id));
    ipcMain.handle('gallery:mark-attached', (_event, { id, patientId }) => galleryStore.markAttached(app, id, patientId));
    ipcMain.handle('gallery:remove', (_event, id) => ({ ok: galleryStore.removeItem(app, id) }));

    startup();
  });

  app.on('window-all-closed', () => {
    shutdown();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', shutdown);
  app.on('will-quit', shutdown);
}
