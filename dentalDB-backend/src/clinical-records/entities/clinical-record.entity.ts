import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branch/entities/branch.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

/**
 * A single dated visit entry, appended automatically whenever billing is
 * created/updated for a patient with services attached (see
 * ClinicalRecordsService.upsertFromBilling). This is what lets one
 * ClinicalRecord row represent an ongoing chart across many dates instead of
 * a single free-text `treatmentPlan` box getting overwritten every visit.
 */
export interface ClinicalRecordVisit {
  id: string;
  /** ISO datetime the visit/billing happened */
  date: string;
  appointmentId?: string;
  invoiceId?: string;
  doctorId?: string;
  services: string[];
  notes?: string;
}

@Entity('clinical_records')
@Index(['clinicId', 'patientId'])
@Index(['branchId'])
export class ClinicalRecord {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  // Nullable: older records predate branch scoping, and a billing-driven
  // upsert may run before a branch has been resolved. Records with no
  // branchId are only visible to users who can see all of a clinic's
  // branches (same convention as Invoice/Appointment.branchId).
  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  // Nullable: a clinical record can be auto-created from a billing/invoice
  // flow that has no doctor attached to any billed service — in that case
  // this is left blank rather than forced to a fake/default value.
  @Column({ nullable: true })
  doctorId: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column({ nullable: true })
  appointmentId: string;

  @Column({ nullable: true, type: 'text' })
  diagnosisNotes: string;

  @Column({ nullable: true, type: 'text' })
  treatmentPlan: string;

  // Dated visit history — each billing/appointment completion appends one
  // entry here instead of clobbering a single treatment-plan text box.
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  visits: ClinicalRecordVisit[];

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  attachments: { name: string; url: string; type: string }[];

  @OneToMany(() => Prescription, p => p.clinicalRecord, { cascade: true, eager: true })
  prescriptions: Prescription[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

export enum PrescriptionDispensingStatus {
  NOT_DISPENSED = 'not_dispensed',
  PARTIALLY_DISPENSED = 'partially_dispensed',
  DISPENSED = 'dispensed',
}

@Entity('prescriptions')
export class Prescription {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicalRecordId: string;

  @ManyToOne(() => ClinicalRecord, r => r.prescriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicalRecordId' })
  clinicalRecord: ClinicalRecord;

  @Column()
  medicineName: string;

  @Column({ nullable: true })
  dosage: string;

  @Column({ nullable: true })
  frequency: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ nullable: true, type: 'text' })
  instructions: string;

  // ── Pharmacy dispensing linkage (Phase 3) ──────────────────────────────
  // Optional — a prescription can still be pure free-text (medicineName
  // only) for medicines outside the pharmacy inventory. When productId IS
  // set, the pharmacy dispensing queue and FEFO billing integration pick
  // this row up (see ClinicalRecordsService.findPendingDispensing /
  // markPrescriptionDispensed, and BillingService's pharma item routing).
  // No separate prescription/dispensing entity — this row IS the record.
  @Column({ nullable: true })
  productId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  quantityPrescribed: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  dispensedQuantity: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: PrescriptionDispensingStatus, default: PrescriptionDispensingStatus.NOT_DISPENSED })
  dispensingStatus: PrescriptionDispensingStatus;

  @CreateDateColumn() createdAt: Date;
}
