// electron/watched-folder-store.js
//
// Persists the "watched folder" configuration set from Settings > Photo
// Sync. A clinic with several branches — each with its own machine
// capturing x-rays/photos — needs to watch a DIFFERENT local folder per
// branch simultaneously, not just one folder pointed at one branch. So the
// config is a LIST of entries: { id, folderPath, branchId, branchName,
// enabled }, one per branch. Follows the same plain-JSON-in-userData
// pattern as sync-config.js.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function configPath(app) {
  return path.join(app.getPath('userData'), 'watched-folder.json');
}

function cleanEntry(raw, fallbackId) {
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : (fallbackId || crypto.randomUUID()),
    folderPath: typeof raw?.folderPath === 'string' ? raw.folderPath.trim() : '',
    branchId: typeof raw?.branchId === 'string' ? raw.branchId : '',
    branchName: typeof raw?.branchName === 'string' ? raw.branchName : '',
    enabled: !!raw?.enabled,
  };
}

/**
 * @returns {Array<{id: string, folderPath: string, branchId: string, branchName: string, enabled: boolean}>}
 */
function readConfig(app) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath(app), 'utf-8'));
  } catch {
    return []; // No file yet, or unreadable/corrupt — treat as "not configured".
  }

  // Migration: older installs stored a single object
  // { folderPath, branchId, branchName, enabled } rather than an array.
  // Upgrade it in place to a one-entry list the first time it's read, so
  // an existing single-branch setup keeps working after the upgrade
  // instead of silently losing its configured folder.
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    const migrated = raw.folderPath ? [cleanEntry(raw)] : [];
    writeConfig(app, migrated);
    return migrated;
  }

  if (!Array.isArray(raw)) return [];
  return raw.map((e) => cleanEntry(e, e?.id));
}

function writeConfig(app, entries) {
  const clean = (Array.isArray(entries) ? entries : []).map((e) => cleanEntry(e, e?.id));
  fs.mkdirSync(path.dirname(configPath(app)), { recursive: true });
  fs.writeFileSync(configPath(app), JSON.stringify(clean, null, 2), 'utf-8');
  return clean;
}

/** @param {{folderPath: string, branchId: string, branchName: string, enabled: boolean}} entry */
function addEntry(app, entry) {
  const entries = readConfig(app);
  const clean = cleanEntry(entry);
  if (!clean.folderPath) throw new Error('A folder path is required');
  if (!clean.branchId) throw new Error('A branch is required');
  if (entries.some((e) => e.branchId === clean.branchId)) {
    throw new Error('This branch already has a watched folder configured');
  }
  entries.push(clean);
  writeConfig(app, entries);
  return clean;
}

/** @param {string} id @param {Partial<{folderPath: string, branchId: string, branchName: string, enabled: boolean}>} patch */
function updateEntry(app, id, patch) {
  const entries = readConfig(app);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated = cleanEntry({ ...entries[idx], ...patch, id }, id);
  if (patch?.branchId && entries.some((e) => e.id !== id && e.branchId === updated.branchId)) {
    throw new Error('This branch already has a watched folder configured');
  }
  entries[idx] = updated;
  writeConfig(app, entries);
  return updated;
}

function removeEntry(app, id) {
  const entries = readConfig(app);
  const next = entries.filter((e) => e.id !== id);
  const removed = next.length !== entries.length;
  if (removed) writeConfig(app, next);
  return removed;
}

module.exports = { readConfig, writeConfig, addEntry, updateEntry, removeEntry, configPath };
