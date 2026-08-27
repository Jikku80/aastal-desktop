import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branch/entities/branch.entity';
import { ClinicService } from '../../services/entities/service.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum TreatmentPlanStatus {
  PROPOSED = 'proposed',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

/**
 * A treatment proposed to a patient, pending their decision — distinct
 * from ClinicalRecord.treatmentPlan (a free-text box on the chart that
 * gets overwritten per visit). This is the structured record: one row
 * per proposal, with a real status a doctor/front-desk can move through
 * proposed -> accepted/declined. Exists specifically so
 * integrations/jwantra can sync it into jwantra's own `treatment_plans`
 * table (Phase 7: Treatment Acceptance Prediction) — see
 * integrations/jwantra/mappers/jwantra.mappers.ts::mapTreatmentPlanToJwantra.
 */
@Entity('treatment_plan_items')
@Index(['clinicId', 'patientId'])
@Index(['branchId'])
export class TreatmentPlanItem {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  // Nullable for the same reason every other branch-scoped entity here is
  // (ClinicalRecord, Invoice, Appointment, Product): a proposal made
  // before branch-scoping existed, or one raised from a flow that hasn't
  // resolved a branch yet, is visible to any user who can see all of the
  // clinic's branches rather than being force-assigned one.
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

  // Which treatment/service is being proposed. Kept as a nullable FK
  // (rather than required) so a plan survives the underlying service
  // later being deleted/deactivated — serviceName below snapshots the
  // label at proposal time either way.
  @Column({ nullable: true })
  serviceId: string;

  @ManyToOne(() => ClinicService, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'serviceId' })
  service: ClinicService;

  @Column()
  serviceName: string;

  @Column({ nullable: true })
  doctorId: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  // The visit this proposal was raised during, if any — a plan can also
  // be raised outside any specific appointment (e.g. a phone follow-up).
  @Column({ nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  proposedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceQuoted: number;

  @Column({ type: 'varchar', length: 20, default: TreatmentPlanStatus.PROPOSED })
  status: TreatmentPlanStatus;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  decidedAt: Date;

  @Column({ nullable: true, type: 'text' })
  note: string;

  @Column({ nullable: true })
  createdByUserId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
