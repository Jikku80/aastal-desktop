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
  /** Whether this device has completed automatic sync registration (see AuthService.login's auto-registration hook). */
  hasDeviceToken: boolean;
  /** True when this URL came from the built-in default, not something the user saved. */
  isDefault: boolean;
}

interface ElectronSavedCredentials {
  email: string;
  password: string;
}

/** One watched folder = one branch's capture machine. A clinic with several branches can have one of these per branch, all watched at once. */
interface ElectronWatchedFolderEntry {
  id: string;
  folderPath: string;
  branchId: string;
  branchName: string;
  enabled: boolean;
  /** true when enabled AND a folder is actually set */
  isWatching: boolean;
}

/** A local gallery entry — an image pulled in from a watched folder (or added another way in a future version). */
interface ElectronGalleryItem {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  branchId: string;
  branchName: string;
  addedAt: string;
  attachedPatientId: string | null;
  attachedAt: string | null;
}

/** Same as ElectronGalleryItem, plus the actual file bytes (base64) — returned by readGalleryFile / pickLocalImages. */
interface ElectronFileWithData {
  fileName: string;
  mimeType: string;
  size: number;
  data: string; // base64
}

interface ElectronAPI {
  isElectron: true;

  // Sync
  getSyncConfig: () => Promise<ElectronSyncConfig>;
  setSyncConfig: (config: { remoteBaseUrl: string }) => Promise<{ ok: boolean; error?: string }>;
  reregisterSyncDevice: () => Promise<{ ok: boolean; error?: string }>;

  // Saved login credentials ("Remember me")
  getSavedCredentials: () => Promise<ElectronSavedCredentials | null>;
  saveCredentials: (creds: ElectronSavedCredentials) => Promise<{ ok: boolean; error?: string }>;
  clearSavedCredentials: () => Promise<{ ok: boolean }>;

  // Watched-folder auto-import — one entry per branch, all watched at once
  listWatchedFolders: () => Promise<ElectronWatchedFolderEntry[]>;
  pickWatchedFolder: () => Promise<string | null>;
  addWatchedFolder: (entry: {
    folderPath: string;
    branchId: string;
    branchName: string;
    enabled: boolean;
  }) => Promise<{ ok: boolean; entry?: ElectronWatchedFolderEntry; error?: string }>;
  updateWatchedFolder: (
    id: string,
    patch: Partial<{ folderPath: string; branchId: string; branchName: string; enabled: boolean }>,
  ) => Promise<{ ok: boolean; entry?: ElectronWatchedFolderEntry; error?: string }>;
  removeWatchedFolder: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // "Open local folder" upload option
  pickLocalImages: () => Promise<ElectronFileWithData[]>;

  // Gallery
  listGalleryItems: (branchId?: string) => Promise<ElectronGalleryItem[]>;
  readGalleryFile: (id: string) => Promise<(ElectronGalleryItem & ElectronFileWithData) | null>;
  markGalleryItemAttached: (id: string, patientId: string) => Promise<ElectronGalleryItem | null>;
  removeGalleryItem: (id: string) => Promise<{ ok: boolean }>;
  onNewGalleryImage: (callback: (item: ElectronGalleryItem) => void) => () => void;

  // Native OS notifications (mirrors in-app notifications from the bell / socket)
  showSystemNotification: (payload: {
    title: string;
    body?: string;
    type?: string;
    link?: string;
    entityId?: string;
  }) => void;
  onNotificationClick: (
    callback: (data: { type?: string; link?: string; entityId?: string }) => void,
  ) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}

/** A branch photo as returned by the web gallery endpoints (GET /gallery) — see dentalDB-backend/src/gallery. */
interface WebGalleryItem {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  branchId: string;
  createdAt: string;
  attachedPatientId: string | null;
  attachedAt: string | null;
}
