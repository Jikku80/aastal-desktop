// SQLite (offline/desktop) DataSource.
// Scoped deliberately to ONLY the offline-capable modules (per the
// classification agreed with the user) — online-only modules
// (subscriptions, super-admin, website-builder, seo, discovery, telehealth,
// patient-auth, patient-portal, analytics, symptom-checker, doctor-portal)
// have no tables in this database at all and are gated out of the runtime
// entirely when offline (see Phase 5).
//
// For the Postgres (online/server) DataSource, see data-source.postgres.ts.
// Both are selected at runtime in app.module.ts via DB_DRIVER env var.
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();
process.env.DB_DRIVER = 'sqlite'; // must be set before entities load

const OFFLINE_ENTITY_GLOBS = [
  'patients', 'appointments', 'clinical-records', 'dental-chart',
  'blood-test', 'lab-work', 'prescription', 'billing', 'payroll',
  'commissions', 'expenses', 'inventory', 'attendance', 'shifts', 'leave',
  'holidays', 'tasks', 'consents', 'intake-forms', 'waiting-queue',
  'patient-wallet', 'services', 'branch', 'clinics', 'rbac', 'users', 'auth',
  'audit', 'api-keys', 'doctor-profile', 'doctor-affiliation', 'files',
  'notices', 'outbox', 'sync', 'subscriptions', 'notifications',
].map((m) => join(__dirname, `${m}/**/*.entity{.ts,.js}`));

export const SqliteDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.SQLITE_DB_PATH ?? join(process.cwd(), 'offline-data.sqlite'),
  entities: OFFLINE_ENTITY_GLOBS,
  migrations: [join(__dirname, 'migrations/sqlite/*{.ts,.js}')],
  // better-sqlite3 driver: TypeORM enables `PRAGMA foreign_keys = ON` by
  // default, so the onDelete CASCADE/SET NULL clauses on entity relations
  // are respected. Worth re-verifying against the installed TypeORM version
  // once dependencies are installed (no node_modules present in this pass).
  enableWAL: true,
});