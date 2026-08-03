// electron/credential-store.js
//
// Persists the user's login email + password for the "Remember me" checkbox
// on the desktop login screen, so the fields can be pre-filled on next
// launch. This is NOT the same thing as a Chrome-style "save password"
// browser prompt — Electron's BrowserWindow does not ship Chrome's
// password-manager UI (that's part of Chrome itself, not the Chromium
// engine Electron embeds), so there is nothing to hook into there. This
// module is the deliberate replacement: an explicit opt-in checkbox on the
// login form, backed by our own encrypted storage.
//
// The password is encrypted at rest via Electron's `safeStorage` module,
// which defers to the OS's own credential vault (Keychain on macOS, DPAPI
// on Windows, libsecret/kwallet on Linux) — we never write a plaintext
// password to disk. If the OS has no secure-storage backend available
// (rare, mostly some minimal Linux setups without a secret-service
// provider), we simply decline to save rather than silently falling back
// to plaintext.

const fs = require('fs');
const path = require('path');
const { safeStorage } = require('electron');

function credentialsPath(app) {
  return path.join(app.getPath('userData'), 'saved-credentials.json');
}

/**
 * @param {{ email: string, password: string }} creds
 * @returns {{ ok: boolean, error?: string }}
 */
function saveCredentials(app, creds) {
  const email = (creds?.email || '').trim();
  const password = creds?.password || '';
  if (!email || !password) {
    return { ok: false, error: 'Email and password are required' };
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, error: 'Secure storage is not available on this machine' };
  }
  try {
    const payload = {
      email,
      password: safeStorage.encryptString(password).toString('base64'),
    };
    fs.mkdirSync(path.dirname(credentialsPath(app)), { recursive: true });
    fs.writeFileSync(credentialsPath(app), JSON.stringify(payload), 'utf-8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

/**
 * @returns {{ email: string, password: string } | null}
 */
function getCredentials(app) {
  try {
    const raw = fs.readFileSync(credentialsPath(app), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.password) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      // Can't decrypt what we can't decrypt — surface as "nothing saved"
      // rather than throwing, since a stale file from a machine that used
      // to have secure storage shouldn't crash the login screen.
      return null;
    }
    const password = safeStorage.decryptString(Buffer.from(parsed.password, 'base64'));
    return { email: parsed.email, password };
  } catch {
    // No file yet, or unreadable/corrupt/undecryptable — treat as "nothing saved".
    return null;
  }
}

function clearCredentials(app) {
  try {
    fs.unlinkSync(credentialsPath(app));
  } catch {
    // Nothing to clear — fine.
  }
  return { ok: true };
}

module.exports = { saveCredentials, getCredentials, clearCredentials };