import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { OFFLINE_ENTITIES } from './offline-entities';
import { ALL_ENTITIES } from './all-entities';
import { SQLITE_MIGRATIONS } from './sqlite-migrations';

// Entities/migrations used to be filesystem globs (`__dirname + '**/*.entity.js'`).
// That only works when compiled output exists as individual files on disk —
// it silently finds nothing when the backend is bundled into a single file
// for the Electron desktop build (esbuild), which is why the desktop app
// previously shipped the full unbundled node_modules tree. See
// offline-entities.ts / all-entities.ts for the explicit-import replacement.

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const driver = config.get<string>('DB_DRIVER', 'postgres');

  if (driver === 'sqlite') {
    return {
      type: 'better-sqlite3',
      database: config.get('SQLITE_DB_PATH', join(process.cwd(), 'offline-data.sqlite')),
      entities: OFFLINE_ENTITIES,
      // No synchronize here even in dev — sqlite path runs off explicit
      // migrations (src/migrations/sqlite) so the offline schema stays
      // reproducible and testable independent of entity edits in flight.
      synchronize: false,
      migrationsRun: config.get('SQLITE_AUTO_MIGRATE', 'true') === 'true',
      migrations: SQLITE_MIGRATIONS,
      logging: config.get('NODE_ENV') === 'development',
    };
  }

  return {
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get('DB_USERNAME', 'postgres'),
    password: config.get('DB_PASSWORD', ''),
    database: config.get('DB_NAME', 'dentalos'),
    entities: ALL_ENTITIES,
    synchronize: config.get('NODE_ENV') !== 'production',
    logging: config.get('NODE_ENV') === 'development',
    ssl: config.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false } : false,
    extra: {
      max: parseInt(config.get('DB_POOL_MAX', '20'), 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };
}