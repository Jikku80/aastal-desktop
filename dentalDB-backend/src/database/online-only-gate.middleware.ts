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
