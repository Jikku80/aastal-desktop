import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * Clinic-level payroll computation rules.
 * One row per clinic (upserted on save).
 * All monetary amounts are expressed as fractions of the daily salary rate
 * unless otherwise noted.
 */
@Entity('payroll_deduction_rules')
@Index(['clinicId'], { unique: true })
export class PayrollDeductionRule {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() clinicId: string;

  // ─── Deductions ────────────────────────────────────────────────────────────

  /** Deduction per hour of lateness (fraction of hourly rate, default 1.0 = full) */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  lateDeductionPerHour: number;

  /** Deduction for a half-day absence (fraction of daily rate, default 0.5) */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.5 })
  halfDayDeductionRate: number;

  /** Deduction for a full absent day (fraction of daily rate, default 1.0) */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  absentDeductionRate: number;

  // ─── Additions ─────────────────────────────────────────────────────────────

  /** Overtime pay per extra hour (fraction of hourly rate, default 1.5) */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.5 })
  overtimeRateMultiplier: number;

  /**
   * Bonus multiplier when staff works on a scheduled leave/off day
   * (fraction of daily rate per day worked, default 1.0 = full extra day pay)
   */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  leaveAttendedBonusRate: number;

  // ─── Working-day basis ─────────────────────────────────────────────────────

  /**
   * Expected working hours per day (for overtime calculation).
   * Default 8.
   */
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 8 })
  standardHoursPerDay: number;

  /**
   * Number of working days assumed in a month for proration.
   * If null, the service counts actual period calendar days that are
   * not "off" status.
   * Default 26.
   */
  @Column({ type: 'int', nullable: true, default: 26 })
  workingDaysPerMonth: number;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
