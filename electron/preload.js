// electron/preload.js
//
// Intentionally minimal — the frontend talks to the local backend over
// plain HTTP (http://127.0.0.1:BACKEND_PORT), not via Electron IPC, so no
// privileged API surface needs to be exposed to the renderer yet. If a
// later phase needs renderer access to native APIs (e.g. native file
// dialogs for the offline file-storage fallback), add contextBridge
// exposures here rather than disabling contextIsolation/nodeIntegration.
