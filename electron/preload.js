// electron/preload.js
//
// Exposes a small, explicit IPC surface for sync configuration. The
// renderer talks to the local backend over plain HTTP for everything else
// (http://127.0.0.1:BACKEND_PORT) — this bridge exists only for the few
// things HTTP can't do: writing the remote-sync URL override, clearing a
// revoked device's token, and restarting the backend child process, all of
// which are main-process concerns the renderer has no other way to reach.
//
// There's no manual sync key to enter — device registration happens
// automatically server-side on first online login (see
// AuthService.login's auto-registration hook). This bridge only reports
// whether that has happened yet.
//
// contextIsolation stays on; nodeIntegration stays off. Only these
// specific methods are exposed, not raw ipcRenderer.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getSyncConfig: () => ipcRenderer.invoke('sync-config:get'),
  /** @param {{ remoteBaseUrl: string }} config */
  setSyncConfig: (config) => ipcRenderer.invoke('sync-config:set', config),
  /** Clears this device's sync token so it re-registers on next login — use after an admin revokes it. */
  reregisterSyncDevice: () => ipcRenderer.invoke('sync-config:reregister'),
});
