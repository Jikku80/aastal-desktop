if (process.versions?.electron || process.env.APP_PLATFORM === 'desktop') {
  process.env.DB_DRIVER = 'sqlite';
} else {
  process.env.DB_DRIVER = 'postgres';
}

import { NestFactory }     from '@nestjs/core';
import { DataSource }      from 'typeorm';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule }       from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as cookieParser   from 'cookie-parser';
import helmet from 'helmet';
import * as compression    from 'compression';
import { mkdir }           from 'fs/promises';
import { join }            from 'path';
import { setupOnlineOnlyGate } from './database/online-only-gate.middleware';
import { installPendingSyncRepositoryPatch } from './sync/pending-sync-repository.patch';
import { UPLOADS_DIR } from './common/utils/uploads-dir.util';

// Must run before any Repository.update() call anywhere in the app — see
// pending-sync-repository.patch.ts. No-ops entirely when DB_DRIVER isn't
// 'sqlite', so this has zero effect on the hosted Postgres deployment.
installPendingSyncRepositoryPatch();

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Ensure uploads directory exists. Uses UPLOADS_DIR (see
  // uploads-dir.util.ts) instead of a process.cwd()-relative path — on the
  // packaged Electron build, cwd depends on how the OS launched the app and
  // is sometimes read-only (e.g. a Windows install under Program Files),
  // which previously threw here and — since bootstrap() was called with no
  // .catch() below — crashed the entire backend process before it ever
  // bound a port. Every request, including login/register, then failed
  // because there was simply no backend listening, which is what made it
  // look like a "database problem" from the desktop app.
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err: any) {
    logger.error(`Could not create uploads directory at ${UPLOADS_DIR}: ${err?.message ?? err}`);
    logger.error('Continuing startup anyway — file uploads will fail until this is fixed, ' +
      'but the rest of the API (auth, patients, billing, etc.) will still work.');
  }


  const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'clinickarobar.com';

  const staticOrigins = new Set([
    'http://localhost:3000',   // staff frontend
    'http://localhost:3001',   // patient/user frontend
    'http://localhost:3002',   // legacy / alternate port
    'http://localhost:3003',   // any additional local apps
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8081',
    'https://app.clinickarobar.com',
    'https://www.clinickarobar.com',
    'https://www.aastal.com',
    'https://clinickarobar.com',
    'https://aastal.com',
    `https://${ROOT_DOMAIN}`,
    `https://www.${ROOT_DOMAIN}`,
    `https://app.${ROOT_DOMAIN}`,
    ...(process.env.EXTRA_CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  ]);

  const app = await NestFactory.create(AppModule, {
    cors: false, // CORS is configured dynamically below via app.enableCors(),
                 // after the app is initialised, so we can check custom
                 // domains against the database (clinic_websites table).
  });

  // ── Dynamic CORS ────────────────────────────────────────────────────────────
  // Custom domains (e.g. agnidental.com.np) cannot be known ahead of time, so
  // any origin that isn't a static origin or a *.ROOT_DOMAIN subdomain is
  // checked against the clinic_websites.customDomain column before being
  // allowed. This fixes 500s / missing CORS headers on custom-domain sites
  // (products, branches, website lookups, etc.).
  const dataSource = app.get(DataSource);
  const customDomainCache = new Map<string, { allowed: boolean; expires: number }>();
  const CUSTOM_DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  async function isKnownCustomDomain(hostname: string): Promise<boolean> {
    const cached = customDomainCache.get(hostname);
    if (cached && cached.expires > Date.now()) return cached.allowed;

    let allowed = false;
    try {
      const rows = await dataSource.query(
        `SELECT 1 FROM clinic_websites WHERE "customDomain" = $1 OR "customDomain" = $2 LIMIT 1`,
        [hostname, `www.${hostname}`],
      );
      allowed = Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      logger.error(`Custom-domain CORS lookup failed for ${hostname}: ${err}`);
      allowed = false;
    }

    customDomainCache.set(hostname, { allowed, expires: Date.now() + CUSTOM_DOMAIN_CACHE_TTL_MS });
    return allowed;
  }

  app.enableCors({
    origin: async (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Server-to-server or same-origin (no Origin header)
      if (!origin) return callback(null, true);

      // Exact match (main app, localhost)
      if (staticOrigins.has(origin)) return callback(null, true);

      try {
        const url  = new URL(origin);
        const host = url.hostname;

        // Any subdomain of ROOT_DOMAIN (handles clinic subdomains)
        if (host.endsWith(`.${ROOT_DOMAIN}`)) return callback(null, true);

        // Verified custom domain on a clinic website
        if (await isKnownCustomDomain(host)) return callback(null, true);
      } catch {
        // malformed origin — fall through to deny
      }

      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-clinic-host'],
  });

  app.use(helmet({
    crossOriginResourcePolicy: false, // handled per-path below
  }));

  // Allow cross-origin loading of uploaded assets (product images, etc.)
  // This must come AFTER helmet so it isn't overwritten.
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/uploads/')) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    } else {
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
    next();
  });
  app.use(compression());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  // No-op on a normal Postgres deployment; on the Electron-bundled SQLite
  // instance, intercepts online-only-module requests before they reach
  // Nest's router (those entities don't exist in the local DataSource at
  // all — see Phase 1/4 notes in data-source.sqlite.ts).
  setupOnlineOnlyGate(app);

  app.useGlobalPipes(new ValidationPipe({
    whitelist:              true,
    transform:              true,
    forbidNonWhitelisted:   false,
    transformOptions:       { enableImplicitConversion: true },
  }));

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger (non-production only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ClinicKarobar API')
      .setDescription('Multi-tenant Clinic SaaS API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
    logger.log('Swagger: http://localhost:4000/api/docs');
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`ClinicKarobar API running on :${port}`);
}

bootstrap().catch((err) => {
  // Without this .catch(), a rejected bootstrap() (failed DB connection,
  // failed migration, port already in use, etc.) becomes an unhandled
  // promise rejection, which Node terminates the process for — silently,
  // with no clear message about what actually failed. On the Electron
  // desktop build this looked like "the app opens but login/signup just
  // doesn't work", because the backend process had already exited before
  // main.js's health check even had something to poll.
  // eslint-disable-next-line no-console
  console.error('[Bootstrap] Fatal error during startup:', err);
  process.exit(1);
});