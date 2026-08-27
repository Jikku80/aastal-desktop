// SQLite (offline/desktop) DataSource.
// Scoped deliberately to ONLY the offline-capable modules (per the
// classification agreed with the user) — online-only modules
// (subscriptions, super-admin, website-builder, seo, discovery, telehealth,
// patient-auth, patient-portal, analytics, symptom-checker, doctor-portal,
// reviews) have no tables in this database at all and are gated out of the
// runtime entirely when offline (see Phase 5).
//
// "reviews" was moved into this online-only list after a boot-test surfaced
// a real TypeORMError: Review has a required, cascading ManyToOne to
// PatientAccount (patient-auth), which is itself online-only. A patient
// can't leave a review without a patient-portal account, so the entity
// can't be offline-safe without also pulling patient-auth in — reclassifying
// it here matches how the feature is actually used.
//
// For the Postgres (online/server) DataSource, see data-source.postgres.ts.
// Both are selected at runtime in app.module.ts via DB_DRIVER env var.
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();
process.env.DB_DRIVER = 'sqlite'; // must be set before entities load

// NOTE: OFFLINE_ENTITIES/SQLITE_MIGRATIONS are pulled in via require() here,
// not a static `import`, on purpose. TypeScript/ts-node transpiles ES
// `import` statements to CommonJS `require()` calls *in the order they're
// written* — it does not hoist them above arbitrary code the way some
// bundlers do. A static import of these two below dotenv.config() would
// still execute before the two lines above if placed at the top of the
// file with the other imports (as this file previously did), because all
// import statements are conventionally grouped first. That ordering bug
// meant every entity using `const isSQLite = process.env.DB_DRIVER ===
// 'sqlite'` at module-eval time (e.g. ApiKey, Account) was evaluating
// isSQLite as false when loaded through this CLI-only DataSource, which
// then failed with DataTypeNotSupportedError for 'enum' columns on
// better-sqlite3. Using require() after the env is set avoids the whole
// class of bug — see the equivalent, correctly-ordered fix in main.ts.
const { OFFLINE_ENTITIES } = require('./database/offline-entities');
const { SQLITE_MIGRATIONS } = require('./database/sqlite-migrations');

export const SqliteDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.SQLITE_DB_PATH ?? join(process.cwd(), 'offline-data.sqlite'),
  entities: OFFLINE_ENTITIES,
  migrations: SQLITE_MIGRATIONS,
  // better-sqlite3 driver: TypeORM enables `PRAGMA foreign_keys = ON` by
  // default, so the onDelete CASCADE/SET NULL clauses on entity relations
  // are respected. Worth re-verifying against the installed TypeORM version
  // once dependencies are installed (no node_modules present in this pass).
  enableWAL: true,
});