import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Vendor } from './vendor.entity';

export enum ExpenseCategory {
  SALARIES         = 'salaries',
  RENT             = 'rent',
  UTILITIES        = 'utilities',
  MEDICAL_SUPPLIES = 'medical_supplies',
  EQUIPMENT        = 'equipment',
  MARKETING        = 'marketing',
  MAINTENANCE      = 'maintenance',
  SOFTWARE         = 'software',
  LAB_SUPPLIES     = 'lab_supplies',
  INVENTORY        = 'inventory',
  OTHER            = 'other',
}

export enum ApprovalStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('expenses')
@Index(['clinicId', 'expenseDate'])
@Index(['clinicId', 'category'])
export class Expense {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column({ nullable: true }) branchId: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: ExpenseCategory, default: ExpenseCategory.OTHER }) category: ExpenseCategory;
  @Column({ nullable: true }) vendorId: string;
  @ManyToOne(() => Vendor, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ default: 'NPR' }) currency: string;
  @Column({ type: 'text' }) description: string;
  @Column({ nullable: true }) receiptUrl: string;
  @Column({ default: false }) isRecurring: boolean;
  @Column({ type: 'int', nullable: true }) recurringIntervalDays: number;
  @Column({ nullable: true }) referenceNumber: string;
  @Column({ type: 'date' }) expenseDate: string;
  @Column({ nullable: true }) approvedBy: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING }) approvalStatus: ApprovalStatus;
  @Column({ nullable: true }) notes: string;
  @Column() createdBy: string;

  /** Linked staff/dentist userId when category = salaries */
  @Column({ nullable: true }) staffId: string;

  /** Linked lab work order id when category = lab_supplies */
  @Column({ nullable: true }) labWorkId: string;

  /** Linked purchase order id when category = inventory / medical_supplies / equipment */
  @Column({ nullable: true }) purchaseOrderId: string;

  /** Set when auto-created from a finalized payroll run */
  @Column({ nullable: true }) payrollRunId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}