// electron/local-jwt-secrets.js
//
// Generates and persists a random, install-unique JWT signing secret pair
// for the LOCAL SQLite backend this Electron app spawns. This used to be a
// hardcoded "baked" secret constant in main.js that matched the hosted
// production backend's real signing secret — every
// shipped copy of the desktop app contained a string that could forge a
// valid JWT for any account on the production API. Treat that old secret
// as leaked; it must be rotated on the hosted backend regardless of this
// fix shipping.
//
// The local and remote JWT signing domains are now fully independent: this
// secret only ever signs/verifies tokens for local/offline sessions against
// this machine's own local SQLite database. It is never sent anywhere and
// is generated once per install, then reused so existing local sessions
// and refresh tokens keep working across app restarts. See
// SyncService.autoRegisterDeviceIfNeeded for how device sync registration
// now gets a genuine remote-issued token instead of relying on this secret
// matching the remote's.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function secretsPath(app) {
  return path.join(app.getPath('userData'), 'local-jwt-secrets.json');
}

function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Reads the persisted local JWT secret pair, generating and saving a fresh
 * one on first run. Never returns a fixed/shared value.
 */
function getOrCreateLocalJwtSecrets(app) {
  const file = secretsPath(app);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.jwtSecret === 'string' && typeof parsed.jwtRefreshSecret === 'string'
        && parsed.jwtSecret && parsed.jwtRefreshSecret) {
      return { jwtSecret: parsed.jwtSecret, jwtRefreshSecret: parsed.jwtRefreshSecret };
    }
  } catch {
    // No file yet, or unreadable/corrupt — fall through and generate fresh.
  }

  const fresh = { jwtSecret: generateSecret(), jwtRefreshSecret: generateSecret() };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(fresh, null, 2), 'utf-8');
  return fresh;
}

module.exports = { getOrCreateLocalJwtSecrets };
