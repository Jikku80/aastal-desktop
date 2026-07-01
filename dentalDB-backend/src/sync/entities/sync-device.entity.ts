import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

// Same isSQLite switch used by ApiKey (src/api-keys/entities/api-key.entity.ts)
// — SQLite has no native enum type, so the column falls back to a
// CHECK-constrained varchar there while Postgres gets a real enum.
const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum SyncDeviceStatus {
  ACTIVE  = 'active',
  REVOKED = 'revoked',
}

/**
 * One row per desktop install that has completed automatic sync
 * registration (see SyncDevicesService.registerDevice, called from
 * POST /sync/register-device). Replaces the old SYNC_SHARED_SECRET —
 * every device gets its own random token scoped to exactly one clinicId,
 * so SyncDeviceGuard can both authenticate the request AND scope every
 * sync query to that clinic, closing the cross-clinic read/write leak the
 * shared secret had (any device with the secret could ask for or push
 * ANY clinic's data).
 *
 * Lives in the same offline-capable entity set as ApiKey/SyncMeta (see
 * data-source.sqlite.ts / typeorm-options.factory.ts OFFLINE_MODULES —
 * 'sync' is already included) so the table exists on both the hosted
 * Postgres backend and every Electron-bundled SQLite instance. In
 * practice rows are only ever created on whichever backend answers
 * POST /sync/register-device — normally the hosted one, since that's
 * the side every desktop client's pull/push actually authenticates
 * against — but the schema must exist on both sides identically or a
 * TypeORM entity/column mismatch would break sync itself.
 */
@Entity('sync_devices')
export class SyncDevice {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** The user who was logged in when this device auto-registered. */
  @Column()
  registeredByUserId: string;

  /**
   * Human-readable label — hostname + platform by default (see
   * SyncDevicesService.registerDevice), editable later if we add a rename
   * endpoint. Shown in the admin "Registered Devices" screen so an owner
   * can tell which row is the lost/stolen laptop.
   */
  @Column()
  deviceName: string;

  /** Stored as SHA-256 hash — the raw token is returned exactly once, at registration. */
  @Column({ unique: true })
  tokenHash: string;

  /** First 8 chars of the raw token, for identifying a row without exposing the whole thing. */
  @Column({ length: 8 })
  tokenPrefix: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: SyncDeviceStatus, default: SyncDeviceStatus.ACTIVE })
  status: SyncDeviceStatus;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ nullable: true })
  lastUsedIp: string;

  @Column({ nullable: true })
  revokedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}