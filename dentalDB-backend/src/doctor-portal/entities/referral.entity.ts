import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ReferralStatus {
  PENDING   = 'pending',
  ACCEPTED  = 'accepted',
  COMPLETED = 'completed',
  DECLINED  = 'declined',
}

/**
 * A doctor at one clinic referring a patient to another clinic. Carries
 * its own explicit set of attached record/file IDs, independent of the
 * broader cross-clinic consent toggle (PatientRecordConsent) — a referral
 * is the patient explicitly being sent elsewhere, so the referring doctor
 * decides exactly what goes with it.
 */
@Entity('referrals')
@Index(['targetClinicId', 'status'])
@Index(['referringClinicId', 'status'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referringClinicId: string;

  @Column()
  referringDoctorId: string;

  /** Clinic-scoped Patient.id at the referring clinic */
  @Column()
  patientId: string;

  /** Resolved PatientAccount.id, if this patient has a portal account — used to notify them */
  @Column({ nullable: true })
  patientAccountId: string;

  /** Either the target clinic's id (if known/onboarded) or its slug (if just searched by name) */
  @Column({ nullable: true })
  targetClinicId: string;

  @Column({ nullable: true })
  targetClinicSlug: string;

  @Column({ type: 'text' })
  reason: string;

  /** ClinicalRecord IDs explicitly attached to this referral */
  @Column({ type: 'text', array: true, default: [] })
  attachedRecordIds: string[];

  /** PatientFile IDs explicitly attached to this referral */
  @Column({ type: 'text', array: true, default: [] })
  attachedFileIds: string[];

  @Column({ type: 'varchar', default: ReferralStatus.PENDING })
  status: ReferralStatus;

  /** Doctor at the receiving clinic who accepted/actioned the referral */
  @Column({ nullable: true })
  acceptedByDoctorId: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
