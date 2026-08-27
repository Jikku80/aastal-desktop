// src/sync/pending-sync.util.ts
//
// Shared by pending-sync.subscriber.ts (covers Repository.save()) and
// pending-sync-repository.patch.ts (covers Repository.update()) — the two
// TypeORM write paths used across the codebase — plus the handful of
// QueryBuilder-based updates that use neither (see those call sites for
// direct use of pendingSyncFields()).

import { SYNC_REGISTRY } from './sync-registry';

/** Entity class names (TypeORM's `metadata.name`) that participate in sync. */
export const SYNC_ENTITY_NAMES = new Set(SYNC_REGISTRY.map((e) => e.entity.name));

/**
 * entity class name -> which timestamp column LWW compares on. Several
 * SYNC_REGISTRY entities are append-only (Vitals, AuditLog,
 * WalletTransaction, PatientFile, ConsentSubmission, IntakeFormSubmission,
 * DoctorCommission, UserRole) and have NO updatedAt column at all — for
 * those, stamping `updatedAt` on a write would throw. Only stamp the
 * timestamp field the registry says actually exists for that entity.
 */
const TIMESTAMP_FIELD_BY_ENTITY = new Map(
  SYNC_REGISTRY.map((e) => [e.entity.name, e.timestampField] as const),
);

/**
 * True only on the offline-capable local instance. On the hosted Postgres
 * deployment this is always false, so none of the pending-marking logic
 * below ever runs there — that instance IS the canonical remote, it has
 * nothing to sync "up" to.
 */
export function isOfflineSqlite(): boolean {
  return process.env.DB_DRIVER === 'sqlite';
}

/**
 * Spread this into a QueryBuilder `.set({...})` payload for a SYNC_REGISTRY
 * entity. Only adds fields when actually running the offline sqlite
 * instance; a no-op object on the hosted server.
 *
 * Also stamps the entity's real timestamp field when it's `updatedAt` —
 * QueryBuilder `.update().set()` is a raw SQL UPDATE and does NOT run
 * TypeORM's @UpdateDateColumn lifecycle (that only happens via `.save()`),
 * so without this, LWW conflict resolution would compare against a stale
 * timestamp. Append-only entities (timestampField: 'createdAt', no
 * updatedAt column) are deliberately left alone — creation time is already
 * immutable and correct for those.
 *
 * @param entityClassName TypeORM entity class name, e.g. LabWork.name
 */
export function pendingSyncFields(entityClassName: string): Record<string, any> {
  if (!isOfflineSqlite()) return {};
  const fields: Record<string, any> = { syncStatus: 'pending' };
  if (TIMESTAMP_FIELD_BY_ENTITY.get(entityClassName) === 'updatedAt') {
    fields.updatedAt = new Date();
  }
  return fields;
}
