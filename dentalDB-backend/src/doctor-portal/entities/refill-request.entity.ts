import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum RefillRequestStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  DENIED   = 'denied',
}

/**
 * A patient's request to refill a previously prescribed medication.
 * Created from the patient portal (PatientPortalService.requestRefill),
 * surfaced to the prescribing clinic's doctors via GET /doctor/refill-requests.
 */
@Entity('refill_requests')
@Index(['clinicId', 'status'])
@Index(['doctorId', 'status'])
export class RefillRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientAccountId: string;

  /** Clinic-scoped Patient.id the original prescription belongs to */
  @Column()
  clinicPatientId: string;

  @Column()
  clinicId: string;

  /** Doctor who wrote the original prescription, if known */
  @Column({ nullable: true })
  doctorId: string;

  /** The ClinicalRecord that contained the original prescription */
  @Column()
  sourceRecordId: string;

  /** The original Prescription row id, for reference/traceability */
  @Column({ nullable: true })
  prescriptionId: string;

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

  @Column({ type: 'varchar', default: RefillRequestStatus.PENDING })
  status: RefillRequestStatus;

  @Column({ nullable: true })
  resolvedByDoctorId: string;

  /** ClinicalRecord created when the refill is approved (new prescription) */
  @Column({ nullable: true })
  newRecordId: string;

  @Column({ nullable: true, type: 'text' })
  denialReason: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
