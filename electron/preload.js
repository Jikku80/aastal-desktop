// electron/preload.js
//
// Exposes a small, explicit IPC surface to the renderer. The renderer talks
// to the local backend over plain HTTP for everything else
// (http://127.0.0.1:BACKEND_PORT) — this bridge exists only for the things
// HTTP can't do: writing the remote-sync URL override, restarting the
// backend child process, saving encrypted login credentials, managing the
// watched-folder config, native file/folder pickers, and the local image
// gallery — all main-process/filesystem concerns the renderer has no other
// way to reach.
//
// contextIsolation stays on; nodeIntegration stays off. Only these
// specific methods are exposed, not raw ipcRenderer.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // ── Sync config ──────────────────────────────────────────────────────
  // There's no manual sync key to enter — device registration happens
  // automatically server-side on first online login (see
  // AuthService.login's auto-registration hook). This bridge only reports
  // whether that has happened yet.
  getSyncConfig: () => ipcRenderer.invoke('sync-config:get'),
  /** @param {{ remoteBaseUrl: string }} config */
  setSyncConfig: (config) => ipcRenderer.invoke('sync-config:set', config),
  /** Clears this device's sync token so it re-registers on next login — use after an admin revokes it. */
  reregisterSyncDevice: () => ipcRenderer.invoke('sync-config:reregister'),

  // ── Saved login credentials ("Remember me") ─────────────────────────────
  // Encrypted at rest via Electron's safeStorage (OS credential vault) —
  // see electron/credential-store.js.
  getSavedCredentials: () => ipcRenderer.invoke('credentials:get'),
  /** @param {{ email: string, password: string }} creds */
  saveCredentials: (creds) => ipcRenderer.invoke('credentials:save', creds),
  clearSavedCredentials: () => ipcRenderer.invoke('credentials:clear'),

  // ── Watched-folder auto-import ──────────────────────────────────────────
  getWatchedFolderConfig: () => ipcRenderer.invoke('watched-folder:get'),
  /** Opens a native "choose folder" dialog. Returns the chosen path, or null if cancelled. */
  pickWatchedFolder: () => ipcRenderer.invoke('watched-folder:pick-folder'),
  /** @param {{ folderPath: string, branchId: string, branchName: string, enabled: boolean }} config */
  setWatchedFolderConfig: (config) => ipcRenderer.invoke('watched-folder:set', config),

  // ── "Open local folder" upload option ───────────────────────────────────
  // Native multi-select image picker. Returns already-read file contents
  // (base64) ready to be turned into File objects and uploaded through the
  // existing upload API from the renderer.
  pickLocalImages: () => ipcRenderer.invoke('local-files:pick-and-read'),

  // ── Gallery (images pulled in from the watched folder) ──────────────────
  /** @param {string} [branchId] */
  listGalleryItems: (branchId) => ipcRenderer.invoke('gallery:list', branchId),
  /** @param {string} id */
  readGalleryFile: (id) => ipcRenderer.invoke('gallery:read-file', id),
  /** @param {string} id @param {string} patientId */
  markGalleryItemAttached: (id, patientId) => ipcRenderer.invoke('gallery:mark-attached', { id, patientId }),
  /** @param {string} id */
  removeGalleryItem: (id) => ipcRenderer.invoke('gallery:remove', id),

  /**
   * Subscribes to "a new image just landed in the watched folder" events.
   * Returns an unsubscribe function — call it in a useEffect cleanup so
   * listeners don't pile up across renders/navigations.
   * @param {(item: any) => void} callback
   * @returns {() => void}
   */
  onNewGalleryImage: (callback) => {
    const listener = (_event, item) => callback(item);
    ipcRenderer.on('watched-folder:new-image', listener);
    return () => ipcRenderer.removeListener('watched-folder:new-image', listener);
  },
});