import { join } from 'path';

/**
 * Single source of truth for where uploaded files (avatars, signatures,
 * logos, product images, prescriptions, website assets, etc.) live on disk.
 *
 * Every one of these used to be computed independently as
 * `join(process.cwd(), 'uploads', ...)`. That's fine for a normal `nest
 * start` / Docker deployment (cwd is the backend's own working directory,
 * fixed and writable), but it's unreliable for the packaged Electron
 * desktop build:
 *
 *  - `process.cwd()` for a spawned child process is inherited from
 *    whatever directory the OS launched the parent Electron app from
 *    (the "Start in" folder of a shortcut, wherever an AppImage was
 *    double-clicked, etc.) — NOT necessarily the app's install directory,
 *    and NOT necessarily writable (e.g. Windows installs to
 *    `C:\Program Files\...` require admin rights to write into).
 *  - Because it's not fixed, it can also silently change between
 *    launches, making previously-uploaded avatars/signatures/logos
 *    "disappear" if the app is next started from a different working
 *    directory.
 *
 * This is a common cause of "works when I run it from the terminal,
 * breaks after installing" bugs, and can surface as generic-looking
 * failures anywhere a request touches an upload (avatar upload during
 * onboarding, clinic logo, prescription PDFs, product photos, etc.).
 *
 * Fix: the Electron main process (electron/main.js) sets UPLOADS_DIR to an
 * explicit path under `app.getPath('userData')` — guaranteed to exist and
 * be writable per-OS (AppData\Roaming on Windows, ~/.config on Linux,
 * ~/Library/Application Support on macOS) — and passes it to the spawned
 * backend as an env var, the same way SQLITE_DB_PATH already is. A normal
 * (non-Electron) deployment doesn't set UPLOADS_DIR, so it keeps using the
 * old cwd-relative default unchanged.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

export function uploadsPath(...segments: string[]): string {
  return join(UPLOADS_DIR, ...segments);
}
