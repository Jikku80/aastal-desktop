import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branch/entities/branch.entity';
import { ClinicService } from '../../services/entities/service.entity';

export enum AppointmentStatus {
  SCHEDULED   = 'scheduled',
  CONFIRMED   = 'confirmed',
  CHECKED_IN  = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED   = 'completed',
  CANCELLED   = 'cancelled',
  NO_SHOW     = 'no_show',
  RESCHEDULED = 'rescheduled',
}

@Entity('appointments')
@Index(['clinicId', 'scheduledAt'])
@Index(['clinicId', 'dentistId'])
@Index(['branchId', 'scheduledAt'])
@Index(['dentistId', 'scheduledAt'])   // cross-branch conflict detection index
export class Appointment {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** Branch where this appointment takes place */
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

  @Column()
  dentistId: string;

  /** Alias for dentistId — backward-compatible */
  get doctorId(): string { return this.dentistId; }

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'dentistId' })
  dentist: User;

  /** Optional link to a ClinicService — nullable for backward compat */
  @Column({ nullable: true })
  serviceId: string;

  @ManyToOne(() => ClinicService, { eager: false, nullable: true })
  @JoinColumn({ name: 'serviceId' })
  service: ClinicService;

  @Column({ type: 'varchar', nullable: true })
  type: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz' })
  endsAt: Date;

  @Column({ default: 30 })
  durationMinutes: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  chiefComplaint: string;

  @Column({ nullable: true })
  diagnosis: string;

  @Column({ nullable: true })
  treatment: string;

  @Column({ type: 'simple-json', nullable: true })
  vitals: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  prescriptions: Record<string, any>[];

  @Column({ nullable: true })
  followUpDate: Date;

  @Column({ nullable: true })
  cancelReason: string;

  /** Patient day-before reminder sent timestamp */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  reminderSentAt: Date;

  /**
   * Doctor 2h-before reminder sent timestamp.
   * Only sent if doctor works in multiple branches.
   */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  doctorReminderSentAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fee: number;

  @Column({ default: false })
  isPaid: boolean;

  /** Set when patient checks in at reception (status → CHECKED_IN) */
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  checkedInAt: Date;

  // ── Telehealth & marketplace fields (Part 3) ──────────────────────────────
  /** in_person | video */
  @Column({ nullable: true, default: 'in_person' })
  consultationType: string;

  /** clinic | independent */
  @Column({ nullable: true, default: 'clinic' })
  bookingContext: string;

  @Column({ nullable: true })
  videoRoomUrl: string;

  @Column({ nullable: true })
  videoRoomId: string;

  /** FK to DoctorLocation for independent appointments */
  @Column({ nullable: true })
  independentLocationId: string;

  @Column({ nullable: true })
  cancellationReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
// ── Telehealth & marketplace fields (Part 3) ──────────────────────────────────
// NOTE: These columns are added via migration 1750000000001-PractoModules.ts
// We extend the entity here so TypeORM maps them at runtime.

import 'reflect-metadata';
