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
// invoiceNumber only needs to be unique WITHIN a clinic (each clinic starts
// its own "INV-{year}-00001" sequence — see BillingService.create()). It
// used to carry a bare `unique: true` on the column itself, which made it
// unique GLOBALLY across every clinic in the database. That meant any
// clinic whose own invoice count for the year was low (a brand-new clinic,
// or one reactivated after a trial with no invoices yet) could compute a
// number like "INV-2026-00001" that a DIFFERENT clinic had already taken,
// and every create-invoice attempt would fail on the DB's unique
// constraint — see migration 1784900000000-InvoiceNumberPerClinicUnique
// for the matching schema fix. Split into two partial unique indexes so
// independent-doctor invoices (clinicId IS NULL) still get a uniqueness
// guarantee among themselves.
@Index(['clinicId', 'invoiceNumber'], { unique: true, where: '"clinicId" IS NOT NULL' })
@Index(['invoiceNumber'], { unique: true, where: '"clinicId" IS NULL' })
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

  @Column()
  invoiceNumber: string;

  /** NULL for pharmacy/product-only walk-in sales — no patient record required when nothing on the invoice is patient-specific. */
  @Column({ nullable: true })
  patientId: string;

  @ManyToOne(() => Patient, { eager: true, nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { nullable: true, eager: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb' })
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
    // Phase 3 — links this line item back to the prescription it fulfills
    // (see clinical-record.entity.ts Prescription), so a pharmaceutical
    // product's dispensed quantity gets recorded against the prescription
    // it was prescribed under. Optional — a product line item doesn't
    // have to originate from a prescription (e.g. OTC/walk-in sale).
    prescriptionId?: string;
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