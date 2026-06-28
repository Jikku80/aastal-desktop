import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Branch lifecycle statuses:
 *
 * active            — counts toward plan limit; fully operational
 * inactive          — does not count; read-only, data preserved
 * pending_selection — downgrade in progress; user must choose active set
 */
export enum BranchStatus {
  ACTIVE            = 'active',
  INACTIVE          = 'inactive',
  PENDING_SELECTION = 'pending_selection',
}

@Entity('branches')
@Index(['clinicId'])
export class Branch {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  /**
   * Independent public-visibility toggle for this branch. The clinic-level
   * `isPubliclyListed` flag acts as the master switch — a branch is only
   * actually visible on the public/discovery side when BOTH the clinic and
   * this branch flag are true. Lets a clinic show some branches and hide
   * others (e.g. a newly opened branch not ready for bookings yet).
   */
  @Column({ default: false })
  isPubliclyListed: boolean;

  /**
   * Derived from `status`. True iff status === 'active'.
   * Kept for backward-compat with existing guards / queries.
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Hard lock — DEPRECATED. Kept for guard backward-compat only.
   * For new logic, use status === 'inactive' or 'pending_selection'.
   */
  @Column({ default: false })
  isLocked: boolean;

  /**
   * Canonical status — source of truth for branch state.
   */
  @Column({
    type: isSQLite ? 'varchar' : 'enum',
    enum: BranchStatus,
    default: BranchStatus.ACTIVE,
  })
  status: BranchStatus;

  /**
   * Timestamp of most-recent appointment / billing activity.
   * Used for auto-selection during grace-period expiry (oldest-active first fallback).
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  lastActivityAt: Date | null;

  /**
   * Timestamp when this branch was activated for the current subscription period.
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  activatedAt: Date | null;

  /**
   * End of the subscription period during which this branch was activated.
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  activationPeriodEnd: Date | null;

  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: 'user_branches',
    joinColumn:        { name: 'branch_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id',   referencedColumnName: 'id' },
  })
  staff: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
