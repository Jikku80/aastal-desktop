declare module '*.css';

/**
 * Exposed by electron/preload.js via contextBridge — only present when the
 * frontend is running inside the Electron desktop app, not on the web.
 * Always check `typeof window !== 'undefined' && window.electronAPI` before
 * use (the same component renders on the web build too, where this is
 * undefined).
 */
interface ElectronSyncConfig {
  remoteBaseUrl: string;
  hasSecret: boolean;
  /** True when this URL came from the built-in default, not something the user saved. */
  isDefault: boolean;
}

interface ElectronAPI {
  isElectron: true;
  getSyncConfig: () => Promise<ElectronSyncConfig>;
  setSyncConfig: (config: { remoteBaseUrl: string; sharedSecret?: string }) => Promise<{ ok: boolean; error?: string }>;
}

interface Window {
  electronAPI?: ElectronAPI;
}