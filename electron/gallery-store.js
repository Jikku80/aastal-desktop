// electron/gallery-store.js
//
// The local "gallery" is the app's own copy of images pulled in from the
// watched folder, independent of the source folder itself — if an SD card
// is later reformatted, a phone sync tool clears its output folder, or the
// user deletes the original, the gallery entry (and the patient file it
// may already be attached to) is unaffected, because we copy the bytes
// into userData/gallery the moment we see them rather than referencing the
// original path.
//
// Tracked in a flat JSON manifest (manifest.json) — this app's image
// volumes are small enough (a clinic's day-to-day photos, not a full photo
// library) that a single JSON file is simpler and more robust than adding
// a real embedded database just for this.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function galleryDir(app) {
  return path.join(app.getPath('userData'), 'gallery');
}

function manifestPath(app) {
  return path.join(galleryDir(app), 'manifest.json');
}

function readManifest(app) {
  try {
    const raw = fs.readFileSync(manifestPath(app), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeManifest(app, items) {
  fs.mkdirSync(galleryDir(app), { recursive: true });
  fs.writeFileSync(manifestPath(app), JSON.stringify(items, null, 2), 'utf-8');
}

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.tif': 'image/tiff', '.tiff': 'image/tiff',
  '.heic': 'image/heic', '.heif': 'image/heif',
};

function isImageFile(filePath) {
  return Object.prototype.hasOwnProperty.call(MIME_BY_EXT, path.extname(filePath).toLowerCase());
}

/**
 * Copies a newly-detected file into the gallery folder and records it in
 * the manifest. Returns the new item, or null if the file isn't a
 * recognized image, no longer exists, or was already imported before
 * (de-duped on path + size + mtime, so a re-scan or a harmless touch of an
 * already-imported file doesn't create a duplicate gallery entry).
 */
function addItem(app, sourcePath, branchId, branchName) {
  if (!isImageFile(sourcePath)) return null;

  let stat;
  try {
    stat = fs.statSync(sourcePath);
  } catch {
    return null; // File vanished between the watcher event and now.
  }

  const items = readManifest(app);
  const fingerprint = `${sourcePath}::${stat.size}::${Math.floor(stat.mtimeMs)}`;
  if (items.some((i) => i.fingerprint === fingerprint)) return null;

  const id = crypto.randomUUID();
  const ext = path.extname(sourcePath);
  fs.mkdirSync(galleryDir(app), { recursive: true });
  const storedPath = path.join(galleryDir(app), `${id}${ext}`);

  try {
    fs.copyFileSync(sourcePath, storedPath);
  } catch (err) {
    console.error('[gallery] failed to copy new image into gallery:', err);
    return null;
  }

  const item = {
    id,
    fileName: path.basename(sourcePath),
    storedPath,
    sourcePath,
    fingerprint,
    mimeType: MIME_BY_EXT[ext.toLowerCase()] || 'application/octet-stream',
    size: stat.size,
    branchId: branchId || '',
    branchName: branchName || '',
    addedAt: new Date().toISOString(),
    attachedPatientId: null,
    attachedAt: null,
    // Whether this item has been pushed up to the hosted backend yet, so
    // it also shows up in the web app's branch gallery — see
    // gallery-sync.js. 'pending' until a push succeeds; deliberately not
    // retried indefinitely inline here (gallery-sync.js's periodic sweep
    // picks up anything still 'pending' whenever the app is online).
    serverSyncStatus: 'pending',
    serverId: null,
  };

  items.unshift(item);
  writeManifest(app, items);
  return item;
}

/** @returns {Array} newest first, optionally filtered to one branch */
function listItems(app, branchId) {
  const items = readManifest(app);
  return branchId ? items.filter((i) => i.branchId === branchId) : items;
}

function getItem(app, id) {
  return readManifest(app).find((i) => i.id === id) || null;
}

/** Reads the stored file back as base64 so it can cross the IPC boundary and be turned into a File/Blob in the renderer. */
function readItemFile(app, id) {
  const item = getItem(app, id);
  if (!item) return null;
  try {
    const buffer = fs.readFileSync(item.storedPath);
    return { ...item, data: buffer.toString('base64') };
  } catch {
    return null;
  }
}

function markAttached(app, id, patientId) {
  const items = readManifest(app);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], attachedPatientId: patientId, attachedAt: new Date().toISOString() };
  writeManifest(app, items);
  return items[idx];
}

/** Items not yet pushed to the hosted backend — used by gallery-sync.js's retry sweep. */
function listUnpushed(app) {
  return readManifest(app).filter((i) => i.serverSyncStatus !== 'synced');
}

function markPushed(app, id, serverId) {
  const items = readManifest(app);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], serverSyncStatus: 'synced', serverId: serverId || items[idx].serverId };
  writeManifest(app, items);
  return items[idx];
}

function removeItem(app, id) {
  const items = readManifest(app);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  const [removed] = items.splice(idx, 1);
  writeManifest(app, items);
  try { fs.unlinkSync(removed.storedPath); } catch { /* already gone */ }
  return true;
}

module.exports = {
  addItem, listItems, getItem, readItemFile, markAttached, removeItem,
  isImageFile, galleryDir, listUnpushed, markPushed,
};
