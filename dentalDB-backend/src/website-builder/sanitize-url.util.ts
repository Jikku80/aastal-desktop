/**
 * sanitizeImageUrl — backend guard for image URLs saved in section settings.
 *
 * Prevents:
 * - javascript:/data: URI injection (XSS)
 * - Internal network SSRF via img proxy/fetch
 * - Oversized URLs (DoS)
 * - Non-http(s) schemes
 */

const MAX_LEN = 2048;

const BLOCKED_HOSTNAME_RE = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,
  /^fd[0-9a-f]{2}:/i,
  /^metadata\.google\.internal$/i,
  /^169\.254\.\d+\.\d+$/,
];

export function sanitizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.length > MAX_LEN) return null;

  let url: URL;
  try { url = new URL(trimmed); } catch { return null; }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const decoded = decodeURIComponent(trimmed).toLowerCase();
  if (decoded.includes('javascript:') || decoded.includes('data:')) return null;

  const hostname = url.hostname.toLowerCase();
  for (const re of BLOCKED_HOSTNAME_RE) {
    if (re.test(hostname)) return null;
  }

  if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) return null;

  return url.href;
}

/**
 * Walk a settings object and sanitize any key whose name contains 'image', 'img',
 * 'photo', 'logo', 'avatar', 'background', 'bg', 'src', or 'url' (case-insensitive).
 * Returns a new object — never mutates.
 */
export function sanitizeSettingsUrls(settings: Record<string, any>): Record<string, any> {
  if (!settings || typeof settings !== 'object') return settings;
  const URL_KEYS = /image|img|photo|logo|avatar|background|bg|src|url/i;

  const clean = (val: any, key: string): any => {
    if (typeof val === 'string' && URL_KEYS.test(key)) {
      // Allow relative /uploads/... paths (served by our own server)
      if (val.startsWith('/uploads/') || val.startsWith('/public/')) return val;
      // Allow empty string (clear)
      if (!val) return val;
      // Otherwise must pass sanitization
      return sanitizeImageUrl(val) ?? '';
    }
    if (Array.isArray(val)) return val.map((item, i) => clean(item, key));
    if (val && typeof val === 'object') return sanitizeSettingsUrls(val);
    return val;
  };

  return Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, clean(v, k)])
  );
}
