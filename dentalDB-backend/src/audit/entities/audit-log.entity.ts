import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATED  = 'created',
  UPDATED  = 'updated',
  DELETED  = 'deleted',
  LOGIN    = 'login',
  EXPORT   = 'export',
  BULK     = 'bulk',
}

export enum AuditEntityType {
  INVOICE        = 'invoice',
  PATIENT        = 'patient',
  APPOINTMENT    = 'appointment',
  USER           = 'user',
  PRESCRIPTION   = 'prescription',
  CLINICAL_RECORD = 'clinical_record',
  PRODUCT        = 'product',
  RECALL         = 'recall',
  AUTH           = 'auth',
  PURCHASE_ORDER = 'purchase_order',
  HOLIDAY        = 'holiday',
  NOTICE         = 'notice',
  WALLET         = 'wallet',
}

@Entity('audit_logs')
@Index(['clinicId', 'createdAt'])
@Index(['clinicId', 'entityType', 'createdAt'])
@Index(['clinicId', 'userId', 'createdAt'])
export class AuditLog {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AuditEntityType })
  entityType: AuditEntityType;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  changes: { before?: Record<string, any>; after?: Record<string, any> } | null;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}