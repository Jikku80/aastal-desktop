import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { PayrollRun } from './payroll-run.entity';
import { User } from '../../users/entities/user.entity';

@Entity('payroll_entries')
@Unique(['payrollRunId', 'userId'])
@Index(['clinicId', 'userId'])
export class PayrollEntry {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column() payrollRunId: string;
  @ManyToOne(() => PayrollRun, r => r.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payrollRunId' })
  payrollRun: PayrollRun;
  @Column() userId: string;
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column({ nullable: true }) branchId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) baseSalary: number;
  @Column({ type: 'decimal', precision: 6,  scale: 2, default: 0 }) hoursWorked: number;
  @Column({ type: 'decimal', precision: 6,  scale: 2, default: 0 }) overtimeHours: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) overtimeRate: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) commissionEarned: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) bonus: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) allowances: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) grossPay: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) taxDeduction: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) otherDeductions: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) netPay: number;
  @Column({ type: 'int', default: 0 }) attendanceDays: number;
  @Column({ type: 'int', default: 0 }) absentDays: number;
  @Column({ type: 'int', default: 0 }) leaveDays: number;
  @Column({ nullable: true }) payslipUrl: string;
  @Column({ nullable: true }) paidAt: Date;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
