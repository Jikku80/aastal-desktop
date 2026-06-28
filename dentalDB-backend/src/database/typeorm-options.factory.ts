import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

// Entity glob for the SQLite (offline) driver — deliberately scoped to only
// the modules classified OFFLINE-CAPABLE. Keep this list in sync with
// data-source.sqlite.ts (used by the CLI for migration:generate/run) —
// duplicated rather than imported because data-source.sqlite.ts uses
// __dirname relative to itself, and this file is consumed by Nest's DI
// container at a different point in the build/runtime lifecycle.
const OFFLINE_MODULES = [
  'patients', 'appointments', 'clinical-records', 'dental-chart',
  'blood-test', 'lab-work', 'prescription', 'billing', 'payroll',
  'commissions', 'expenses', 'inventory', 'attendance', 'shifts', 'leave',
  'holidays', 'tasks', 'consents', 'intake-forms', 'waiting-queue',
  'patient-wallet', 'services', 'branch', 'clinics', 'rbac', 'users', 'auth',
  'audit', 'api-keys', 'doctor-profile', 'doctor-affiliation', 'files',
  'notices', 'outbox', 'sync', 'subscriptions', 'notifications',
];

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const driver = config.get<string>('DB_DRIVER', 'postgres');

  if (driver === 'sqlite') {
    return {
      type: 'better-sqlite3',
      database: config.get('SQLITE_DB_PATH', join(process.cwd(), 'offline-data.sqlite')),
      entities: OFFLINE_MODULES.map((m) => join(__dirname, `../${m}/**/*.entity{.ts,.js}`)),
      // No synchronize here even in dev — sqlite path runs off explicit
      // migrations (src/migrations/sqlite) so the offline schema stays
      // reproducible and testable independent of entity edits in flight.
      synchronize: false,
      migrationsRun: config.get('SQLITE_AUTO_MIGRATE', 'true') === 'true',
      migrations: [join(__dirname, '../migrations/sqlite/*{.ts,.js}')],
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
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
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
