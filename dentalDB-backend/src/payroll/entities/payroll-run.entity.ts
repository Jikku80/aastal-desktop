import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { PayrollEntry } from './payroll-entry.entity';

export enum PayrollRunStatus {
  DRAFT     = 'draft',
  FINALIZED = 'finalized',
  PAID      = 'paid',
}

@Entity('payroll_runs')
@Index(['clinicId', 'periodStart'])
export class PayrollRun {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column({ nullable: true }) branchId: string;
  @Column({ type: 'date' }) periodStart: string;
  @Column({ type: 'date' }) periodEnd: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: PayrollRunStatus, default: PayrollRunStatus.DRAFT }) status: PayrollRunStatus;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) totalGross: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) totalDeductions: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) totalNet: number;
  @Column({ nullable: true }) notes: string;
  @Column() createdBy: string;
  @Column({ nullable: true }) finalizedAt: Date;
  @OneToMany(() => PayrollEntry, e => e.payrollRun, { cascade: true })
  entries: PayrollEntry[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
