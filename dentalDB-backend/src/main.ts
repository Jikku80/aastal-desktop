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

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Ensure uploads directory exists
  await mkdir(join(process.cwd(), 'uploads'), { recursive: true });


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

bootstrap();