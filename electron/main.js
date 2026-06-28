const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3100;
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_INTERVAL_MS = 500;

let backendProcess = null;
let frontendProcess = null;
let mainWindow = null;

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

function waitForHealth(port, label) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) => {
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

  // Spawning process.execPath (Electron's own binary) with
  // ELECTRON_RUN_AS_NODE=1 runs it as plain Node against `entry`, using
  // Electron's bundled Node runtime — this is the standard way to run a
  // Node backend alongside Electron WITHOUT requiring a separate Node.js
  // install on the user's machine. It is not a typo for a system `node`
  // binary.
  backendProcess = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      DB_DRIVER: 'sqlite',
      SQLITE_DB_PATH: sqlitePath,
      PORT: String(BACKEND_PORT),
      SQLITE_AUTO_MIGRATE: 'true',
      JWT_SECRET: 'replace_with_64_char_random_hex_string_for_production',
      JWT_REFRESH_SECRET: 'replace_with_different_64_char_random_hex_string',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      // SYNC_REMOTE_BASE_URL / SYNC_SHARED_SECRET: read from process.env if
      // set when launching Electron (e.g. via a settings file written by a
      // first-run config screen — not built here, flagged as a Phase 4
      // follow-up since it's a UI concern, not a shell-mechanics one).
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
      waitForHealth(BACKEND_PORT, 'backend'),
      waitForHealth(FRONTEND_PORT, 'frontend'),
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
    startup();
  });

  app.on('window-all-closed', () => {
    shutdown();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', shutdown);
  app.on('will-quit', shutdown);
}