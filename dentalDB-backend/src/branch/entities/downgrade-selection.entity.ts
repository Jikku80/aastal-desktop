import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Clinic } from '../../clinics/entities/clinic.entity';

export enum DowngradeSelectionStatus {
  PENDING   = 'pending',    // waiting for user to choose
  COMPLETED = 'completed',  // user confirmed selection
  AUTO      = 'auto',       // grace period expired — auto-selected
}

/**
 * Tracks a pending branch-selection requirement after a subscription downgrade.
 *
 * Created when:
 *   - User downgrades AND total active branches > new quota
 *   - Renewal enforces a lower quota
 *
 * Destroyed (or set to completed) when user confirms selection.
 */
@Entity('downgrade_selections')
@Index(['clinicId', 'status'])
export class DowngradeSelection {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  /** New branch quota that triggered the downgrade. */
  @Column({ type: 'int' })
  newQuota: number;

  /** Branch quota before downgrade. */
  @Column({ type: 'int' })
  previousQuota: number;

  /**
   * When the grace period expires.
   * If null, grace period feature is disabled — selection is required immediately.
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  gracePeriodEndsAt: Date | null;

  /**
   * The renewal/downgrade date that triggered this selection requirement.
   * Used to identify which billing period this belongs to.
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz' })
  effectiveAt: Date;

  @Column({
    type: isSQLite ? 'varchar' : 'enum',
    enum: DowngradeSelectionStatus,
    default: DowngradeSelectionStatus.PENDING,
  })
  status: DowngradeSelectionStatus;

  /**
   * Snapshot of selected branch IDs once confirmed (or auto-selected).
   */
  @Column({ type: 'simple-json', nullable: true })
  selectedBranchIds: string[] | null;

  /**
   * When the user confirmed their selection.
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
