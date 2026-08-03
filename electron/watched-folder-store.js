// electron/watched-folder-store.js
//
// Persists the "watched folder" configuration set from Settings > Photo
// Sync: which local folder to watch, and which clinic branch newly
// detected images should be tagged with in the local gallery. Follows the
// same plain-JSON-in-userData pattern as sync-config.js.

const fs = require('fs');
const path = require('path');

function configPath(app) {
  return path.join(app.getPath('userData'), 'watched-folder.json');
}

function readConfig(app) {
  try {
    const raw = fs.readFileSync(configPath(app), 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      folderPath: typeof parsed.folderPath === 'string' ? parsed.folderPath : '',
      branchId: typeof parsed.branchId === 'string' ? parsed.branchId : '',
      branchName: typeof parsed.branchName === 'string' ? parsed.branchName : '',
      enabled: !!parsed.enabled,
    };
  } catch {
    // No file yet, or unreadable/corrupt — treat as "not configured".
    return { folderPath: '', branchId: '', branchName: '', enabled: false };
  }
}

/**
 * @param {{ folderPath: string, branchId: string, branchName: string, enabled: boolean }} config
 */
function writeConfig(app, config) {
  const clean = {
    folderPath: (config?.folderPath || '').trim(),
    branchId: config?.branchId || '',
    branchName: config?.branchName || '',
    enabled: !!config?.enabled,
  };
  fs.mkdirSync(path.dirname(configPath(app)), { recursive: true });
  fs.writeFileSync(configPath(app), JSON.stringify(clean, null, 2), 'utf-8');
  return clean;
}

module.exports = { readConfig, writeConfig, configPath };