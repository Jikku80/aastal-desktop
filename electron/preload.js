// electron/preload.js
//
// Exposes a small, explicit IPC surface for sync configuration. The
// renderer talks to the local backend over plain HTTP for everything else
// (http://127.0.0.1:BACKEND_PORT) — this bridge exists only for the one
// thing HTTP can't do: writing the remote-sync settings file and
// restarting the backend child process, both of which are main-process
// concerns the renderer has no other way to reach.
//
// contextIsolation stays on; nodeIntegration stays off. Only these three
// specific methods are exposed, not raw ipcRenderer.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getSyncConfig: () => ipcRenderer.invoke('sync-config:get'),
  /**
   * @param {{ remoteBaseUrl: string, sharedSecret?: string }} config
   *   Omit sharedSecret to leave the previously-saved secret untouched;
   *   pass '' explicitly to clear it.
   */
  setSyncConfig: (config) => ipcRenderer.invoke('sync-config:set', config),
});
