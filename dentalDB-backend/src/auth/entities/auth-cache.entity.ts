import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
const isSQLite = process.env.DB_DRIVER === 'sqlite';

/**
 * Local-only cache of the last successfully validated session per user —
 * NOT pushed to remote by the sync engine (deliberately excluded from
 * SYNC_REGISTRY; this is a derived security artifact, not business data,
 * and trusting a remote-pushed version of it would defeat the point).
 *
 * Used two ways:
 *  1. JwtStrategy fallback: if the live `users`/`user_roles` DB lookup
 *     fails (row not yet synced locally, or a transient DB error) but the
 *     JWT signature itself is valid, fall back to this cached permission
 *     snapshot — bounded by `lastValidatedAt` + OFFLINE_SESSION_GRACE_DAYS.
 *  2. AuthService.refresh() offline grace: if a refresh token's signature
 *     and stored-hash match are valid but it's expired by clock time, and
 *     we're on the sqlite (offline) driver, allow renewal within the same
 *     grace window instead of forcing a hard logout with no server to
 *     re-authenticate against.
 *
 * This intentionally trades a bounded window of "can't immediately revoke
 * a deactivated user who's fully offline" for "clinic staff aren't locked
 * out of their own offline-installed software." Revocation still applies
 * immediately once the device reconnects and the live row is queried.
 */
@Entity('auth_cache')
export class AuthCache {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  role: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  clinicId: string | null;

  /** Flat permission key list, snapshotted at last successful validation. */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb' })
  permissions: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @UpdateDateColumn()
  lastValidatedAt: Date;
}
