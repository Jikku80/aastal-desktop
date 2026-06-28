/**
 * sanitizeImageUrl
 *
 * Validates and sanitizes image URLs entered by users in the website builder.
 *
 * Security goals:
 * - Prevent javascript: / data: URIs (XSS vectors)
 * - Prevent internal network URLs (SSRF via img-proxy or pre-fetch)
 * - Restrict to http/https schemes only
 * - Block path-traversal attempts
 * - Enforce max length to prevent DoS
 *
 * Returns the sanitized URL string or null if the URL is not acceptable.
 */

const MAX_URL_LENGTH = 2048;

// Regex: only allow printable ASCII, no whitespace or control chars
const SAFE_CHARS = /^[\x21-\x7E]+$/;

// Localhost / internal IP ranges to block (SSRF)
const BLOCKED_HOSTNAMES = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,       // 127.x.x.x
  /^10\.\d+\.\d+\.\d+$/,        // 10.x.x.x (RFC 1918)
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,  // 172.16–31.x.x
  /^192\.168\.\d+\.\d+$/,       // 192.168.x.x
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,                     // link-local IPv6
  /^fd[0-9a-f]{2}:/i,           // unique-local IPv6
  /^metadata\.google\.internal$/i,  // GCP metadata
  /^169\.254\.\d+\.\d+$/,       // AWS/Azure link-local metadata
];

export function sanitizeImageUrl(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_URL_LENGTH) return null;

  // Must only contain safe printable chars
  if (!SAFE_CHARS.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Only allow http and https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  // Block javascript: / data: embedded in URL somehow
  const decoded = decodeURIComponent(trimmed).toLowerCase();
  if (decoded.includes('javascript:') || decoded.includes('data:')) return null;

  // Block internal/localhost hostnames
  const hostname = url.hostname.toLowerCase();
  for (const pattern of BLOCKED_HOSTNAMES) {
    if (pattern.test(hostname)) return null;
  }

  // Block path traversal
  if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) return null;

  // Return the reconstructed URL (normalised by the URL parser)
  return url.href;
}

/**
 * isImageUrlSafe — convenience boolean wrapper.
 */
export function isImageUrlSafe(raw: string): boolean {
  return sanitizeImageUrl(raw) !== null;
}
