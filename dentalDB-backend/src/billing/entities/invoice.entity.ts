import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index, Generated, BeforeInsert,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { randomUUID } from 'crypto';
import { Patient } from '../../patients/entities/patient.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Branch } from '../../branch/entities/branch.entity';

export enum InvoiceStatus {
  DRAFT          = 'draft',
  SENT           = 'sent',
  PAID           = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  NOT_YET_PAID   = 'not_yet_paid',
  OVERDUE        = 'overdue',
  CANCELLED      = 'cancelled',
  REFUNDED       = 'refunded',
}

export enum PaymentMethod {
  CASH          = 'cash',
  ESEWA         = 'esewa',
  KHALTI        = 'khalti',
  PAYPAL        = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  INSURANCE     = 'insurance',
  WALLET_CREDIT = 'wallet_credit',
  WALLET_DEBIT  = 'wallet_debit',
}

@Entity('invoices')
@Index(['clinicId', 'status'])
@Index(['branchId', 'status'])
export class Invoice {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Globally unique UUID for this invoice (collision-safe).
   * NOTE: was `default: () => 'gen_random_uuid()'` (a Postgres function call —
   * doesn't exist in SQLite). Moved generation to the app layer via
   * @BeforeInsert so it works identically on both drivers.
   */
  @Column({ type: isSQLite ? 'varchar' : 'uuid', unique: true })
  invoiceUuid: string;

  @BeforeInsert()
  generateInvoiceUuid() {
    if (!this.invoiceUuid) {
      this.invoiceUuid = randomUUID();
    }
  }

  /** NULL for independent-doctor invoices (not tied to any clinic) */
  @Column({ nullable: true })
  clinicId: string;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { nullable: true, eager: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ type: 'simple-json' })
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    // NEW fields — nullable for backward compat with old invoices
    serviceId?: string;
    productId?: string;
    doctorId?: string;
    commissionPercentage?: number;
    bloodTestId?: string;
    labWorkId?: string;
  }[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) subtotal: number;
  @Column({ type: 'decimal', precision: 5,  scale: 2, default: 0 }) taxPercent: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) taxAmount: number;
  @Column({ type: 'decimal', precision: 5,  scale: 2, default: 0 }) vatPercent: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) vatAmount: number;
  @Column({ nullable: true }) vatNumber: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) discountAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 })             total: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) paidAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) dueAmount: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true }) paymentTransactionId: string;
  @Column({ nullable: true }) paidAt: Date;
  @Column({ nullable: true }) dueDate: Date;
  @Column({ nullable: true }) notes: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
