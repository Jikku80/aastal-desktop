const { app, BrowserWindow, Menu, shell, nativeImage, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const { readSyncConfig, writeSyncConfig, clearDeviceToken, resolveSyncConfig, configPath } = require('./sync-config');

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
  // JWT_SECRET/JWT_REFRESH_SECRET MUST match the hosted/remote backend's
  // values for sync device auto-registration to work: AuthService.login's
  // auto-registration hook sends this instance's own just-issued JWT to
  // the remote as Bearer auth (see SyncService.autoRegisterDeviceIfNeeded).
  // If the secrets differ, the remote returns 401 to that call and the
  // device just never gets a sync token — everything else about the app
  // still works, it just stays offline-only until this is fixed.
  // Override by setting JWT_SECRET / JWT_REFRESH_SECRET in the environment
  // this Electron app is launched with (e.g. baked in at build time via
  // your CI secrets) — the fallback below is a placeholder, not something
  // safe to ship as-is.
  const jwtSecret = process.env.JWT_SECRET || 'replace_with_64_char_random_hex_string_for_production';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'replace_with_different_64_char_random_hex_string';
  if (!process.env.JWT_SECRET) {
    console.warn('[sync] JWT_SECRET not set in the environment — using an insecure placeholder. ' +
      'Sync device auto-registration will fail (401) until this matches the remote backend\'s JWT_SECRET.');
  }

  backendProcess = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      DB_DRIVER: 'sqlite',
      SQLITE_DB_PATH: sqlitePath,
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
}

function shutdown() {
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

    startup();
  });

  app.on('window-all-closed', () => {
    shutdown();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', shutdown);
  app.on('will-quit', shutdown);
}
