import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * Tracks whether a patient has opted in to letting a specific clinic view
 * their full cross-clinic history (appointments, prescriptions, reports)
 * aggregated from every clinic they're linked to via PatientAccountLink.
 *
 * Opt-in only — a row either doesn't exist or has `granted: false` by
 * default. Never inferred or auto-granted; a clinic only sees data from
 * other clinics once the patient explicitly flips this on for that clinic.
 */
@Entity('patient_record_consents')
@Index(['patientAccountId', 'clinicId'], { unique: true })
export class PatientRecordConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientAccountId: string;

  /** The clinic being granted (or denied) visibility into the patient's full history */
  @Column()
  clinicId: string;

  @Column({ default: false })
  granted: boolean;

  @Column({ nullable: true })
  grantedAt: Date;

  @Column({ nullable: true })
  revokedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
