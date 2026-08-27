import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum PeriodStatus {
  OPEN   = 'open',
  CLOSED = 'closed',
}

/**
 * A locked date range — once closed, no journal entry (manual or
 * auto-posted) may be dated inside it, so a filed/printed balance sheet
 * for that period stays stable. Standard accounting practice (Phase 9 §6).
 */
@Entity('finance_accounting_periods')
@Index(['clinicId', 'startDate', 'endDate'])
export class AccountingPeriod {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;

  @Column() label: string; // e.g. "Baisakh 2082" or "January 2026"
  @Column({ type: 'date' }) startDate: string;
  @Column({ type: 'date' }) endDate: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: PeriodStatus, default: PeriodStatus.OPEN })
  status: PeriodStatus;

  @Column({ nullable: true }) closedBy: string;
  @Column({ nullable: true }) closedAt: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}