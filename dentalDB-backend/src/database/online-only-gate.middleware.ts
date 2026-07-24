import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectivityService } from '../sync/connectivity.service';

/**
 * Route prefixes (under the /api/v1 global prefix) belonging to ONLINE-ONLY
 * modules — per the agreed classification. These have NO entities
 * registered in the SQLite DataSource at all (see data-source.sqlite.ts),
 * so letting a request reach Nest's router for one of these while offline
 * would surface as a raw, unhelpful TypeORM "no metadata found" error.
 * This middleware intercepts them earlier and either proxies to the remote
 * server (when online) or returns a clean, frontend-friendly error.
 *
 * NOTE: 'doctor-portal' here assumes the controller rename from 'doctor' ->
 * 'doctor-portal' (done to resolve a prefix collision with the
 * offline-capable doctor-profile module, which kept the plain 'doctor'
 * prefix). If anything outside this repo (e.g. a mobile app not present in
 * this codebase) still calls the old /doctor/stats, /doctor/appointments
 * etc. paths, those calls need updating too — not discoverable from here.
 */
const ONLINE_ONLY_PREFIXES = [
  'subscriptions',
  'admin',              // super-admin module
  'website-builder',
  'website-orders',
  'blog',               // seo module
  'seo',                // seo/redirects + any other seo sub-routes
  'discovery',          // also covers symptom-checker's discovery/symptom-search
  'telehealth',
  'patient-auth',
  'patient',            // patient-portal (NOT 'patients' — that's offline-capable, different exact prefix)
  'analytics',
  'doctor-portal',
  'reviews',
];

function matchesOnlineOnlyPrefix(path: string): boolean {
  // path arrives WITHOUT the /api/v1 prefix here (see how this is mounted in main.ts)
  const first = path.replace(/^\//, '').split('/')[0];
  return ONLINE_ONLY_PREFIXES.includes(first);
}

export function setupOnlineOnlyGate(app: INestApplication): void {
  const config = app.get(ConfigService);
  const driver = config.get('DB_DRIVER', 'postgres');

  // This whole gate is a no-op on a normal Postgres/online deployment —
  // those have every module's entities registered, nothing to gate.
  if (driver !== 'sqlite') return;

  const connectivity = app.get(ConnectivityService);
  const remoteBase = config.get<string>('SYNC_REMOTE_BASE_URL');

  const proxy = remoteBase
    ? createProxyMiddleware({
        target: remoteBase,
        changeOrigin: true,
        // Incoming path here already excludes /api/v1 (stripped by the
        // mount point below) — re-add it before forwarding upstream.
        pathRewrite: (path) => `/api/v1${path}`,
        // This hop is server-to-server (this local backend calling the
        // remote VPS backend on the caller's behalf) — NOT a browser
        // cross-origin request, even though the original inbound request
        // (from the Electron renderer on 127.0.0.1:3100) carried a real
        // browser `Origin` header. `changeOrigin` above only rewrites the
        // Host header; it does NOT touch Origin, so without this, that
        // browser Origin header was being forwarded as-is straight through
        // to the remote. The remote's CORS check (main.ts) then saw
        // "Origin: http://127.0.0.1:3100" on what looked like a direct
        // browser request and correctly rejected it — this is exactly what
        // produced "CORS blocked: http://127.0.0.1:3100" / "GET
        // /api/v1/subscriptions" in the VPS logs. Stripping Origin here
        // makes the forwarded request arrive with none at all, which
        // main.ts's own `if (!origin) return callback(null, true)` already
        // allows through unconditionally — the correct behavior for a
        // legitimate server-to-server call. Whitelisting 127.0.0.1:3100 on
        // the remote instead would have "fixed" this too, but would also
        // have let a real browser at that same local Origin bypass CORS
        // directly — not what we want to open up.
        on: {
          proxyReq: (proxyReq) => {
            proxyReq.removeHeader('origin');
          },
        },
      })
    : null;

  app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
    if (!matchesOnlineOnlyPrefix(req.path)) return next();

    if (connectivity.getIsOnline() && proxy) {
      return proxy(req, res, next);
    }

    return res.status(503).json({
      error: 'online_required',
      message: 'This feature requires an internet connection and is unavailable in offline mode.',
    });
  });
}
