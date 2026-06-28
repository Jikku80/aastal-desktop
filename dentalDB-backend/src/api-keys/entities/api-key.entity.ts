import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum ApiKeyStatus {
  ACTIVE   = 'active',
  REVOKED  = 'revoked',
}

@Entity('api_keys')
export class ApiKey {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** Human-readable label e.g. "Production", "Mobile App" */
  @Column()
  name: string;

  /** Stored as SHA-256 hash — never return plaintext after creation */
  @Column({ unique: true })
  keyHash: string;

  /** First 8 chars of the raw key so user can identify it in the list */
  @Column({ length: 8 })
  keyPrefix: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  /** Optional IP allowlist (comma-separated CIDRs) */
  @Column({ nullable: true })
  allowedIps: string;

  /** Optional expiry date */
  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ default: 0 })
  requestCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
