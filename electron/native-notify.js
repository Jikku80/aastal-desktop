// electron/native-notify.js
//
// Shows real OS-level notifications (Windows Action Center toast, macOS
// Notification Center, Linux libnotify) — not just the in-app bell
// (NotificationBell.tsx). The renderer already receives every notification
// (appointment created/reminder, low inventory, leave requests, etc.) over
// the existing Socket.IO '/notifications' namespace; it forwards each one
// here over IPC (see preload.js's showSystemNotification) so it also
// surfaces at the OS level even when the app is minimized, in the
// background, or the user is in another window entirely.
//
// Intentionally dumb: this module doesn't know about notification "types"
// or decide which notifications matter — that filtering, if any is ever
// wanted, belongs in the renderer before it calls showSystemNotification.
// This just displays whatever it's given and reports clicks back.

const { Notification, nativeImage } = require('electron');
const path = require('path');

// Reuse the app's existing tray/window icon rather than shipping a
// separate notification-only asset. Falls back gracefully (Electron shows
// its own default icon) if this platform's variant isn't present.
function resolveIcon() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'build/icon.ico')
    : process.platform === 'darwin'
      ? path.join(__dirname, 'build/icon.icns')
      : path.join(__dirname, 'build/icon.png');
  try {
    const img = nativeImage.createFromPath(iconPath);
    return img.isEmpty() ? undefined : img;
  } catch {
    return undefined;
  }
}

/**
 * Shows a native OS notification for one in-app notification payload.
 * Clicking it brings the app window to the front and asks the renderer to
 * navigate to whatever the notification links to (same destination the
 * in-app bell would have gone to).
 *
 * @param {{ title: string, body?: string, type?: string, link?: string, entityId?: string }} payload
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
function showNotification(payload, getMainWindow) {
  if (!Notification.isSupported()) return; // e.g. some stripped-down Linux environments
  if (!payload?.title) return;

  const notification = new Notification({
    title: payload.title,
    body: payload.body || '',
    icon: resolveIcon(),
    silent: false,
  });

  notification.on('click', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send('notification:clicked', {
        type: payload.type,
        link: payload.link,
        entityId: payload.entityId,
      });
    }
  });

  notification.show();
  return notification;
}

module.exports = { showNotification };
