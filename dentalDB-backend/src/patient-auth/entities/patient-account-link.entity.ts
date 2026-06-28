import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { PatientAccount } from './patient-account.entity';

export enum FamilyRelation {
  SELF   = 'self',
  CHILD  = 'child',
  SPOUSE = 'spouse',
  PARENT = 'parent',
  OTHER  = 'other',
}

/**
 * Lifecycle of a link's clinic-side match.
 * - AUTO_MATCHED: created by getLinkedRecords() via exact phone/email match — trusted immediately.
 * - PENDING_CLAIM: created via POST /patient/family/claim from a near-match (e.g. contact-info typo
 *   on the clinic side) — excluded from the patient's records until a clinic confirms or the
 *   patient re-verifies via OTP.
 * - VERIFIED: a pending claim that has been confirmed and is now treated like an auto-match.
 * - REJECTED: a pending claim a clinic determined was not actually this patient.
 */
export enum LinkVerificationStatus {
  AUTO_MATCHED  = 'auto_matched',
  PENDING_CLAIM = 'pending_claim',
  VERIFIED      = 'verified',
  REJECTED      = 'rejected',
}

/**
 * Links a PatientAccount (global identity) to a per-clinic Patient record.
 * Also serves as family-member profiles for the account.
 */
@Entity('patient_account_links')
@Index(['patientAccountId', 'clinicPatientId'], { unique: true })
export class PatientAccountLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientAccountId: string;

  @ManyToOne(() => PatientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientAccountId' })
  patientAccount: PatientAccount;

  /** FK to existing patients.id — may be null for independent-doctor-only records */
  @Column({ nullable: true })
  clinicPatientId: string;

  @Column({ type: 'varchar', default: FamilyRelation.SELF })
  relation: FamilyRelation;

  @Column({ nullable: true })
  label: string; // e.g. "My Son Aiden"

  @Column({ default: false })
  isDefault: boolean; // the "active profile" default

  @Column({ type: 'varchar', default: LinkVerificationStatus.AUTO_MATCHED })
  verificationStatus: LinkVerificationStatus;

  /** Free-text note on how/why this link was created (e.g. the clinicSlug + details a patient searched with) */
  @Column({ nullable: true, type: 'text' })
  claimNote: string;

  @CreateDateColumn()
  createdAt: Date;
}