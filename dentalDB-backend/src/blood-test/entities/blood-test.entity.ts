import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

export enum BloodTestStatus {
  PENDING          = 'pending',
  SAMPLE_COLLECTED = 'sample_collected',
  IN_PROGRESS      = 'in_progress',
  COMPLETED        = 'completed',
  CANCELLED        = 'cancelled',
}

export enum BloodTestPriority {
  ROUTINE = 'routine',
  URGENT  = 'urgent',
  STAT    = 'stat',
}

/** Common blood test panel types — `testType` may also be 'other' with a custom `testName`. */
export enum BloodTestType {
  CBC              = 'cbc',                // Complete Blood Count
  BLOOD_SUGAR      = 'blood_sugar',        // Fasting / Random / PP
  LIPID_PROFILE    = 'lipid_profile',
  LFT              = 'lft',                // Liver Function Test
  KFT              = 'kft',                // Kidney Function Test
  THYROID          = 'thyroid',            // TSH, T3, T4
  HBA1C            = 'hba1c',
  BLOOD_GROUPING   = 'blood_grouping',
  COAGULATION      = 'coagulation',         // PT/INR, APTT
  ELECTROLYTES     = 'electrolytes',
  VITAMIN_PANEL    = 'vitamin_panel',
  HORMONE_PANEL    = 'hormone_panel',
  SEROLOGY         = 'serology',            // HIV, HBsAg, HCV, etc.
  OTHER            = 'other',
}

@Entity('blood_tests')
@Index(['clinicId', 'patientId'])
@Index(['clinicId', 'status'])
@Index(['clinicId', 'createdAt'])
export class BloodTest {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  orderedById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'orderedById' })
  orderedBy: User;

  @Column({ nullable: true })
  appointmentId: string;

  /** The external lab/diagnostic centre name (e.g. "PathCare Labs") */
  @Column({ nullable: true })
  labName: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: BloodTestType, default: BloodTestType.OTHER })
  testType: BloodTestType;

  /** Display/short title, e.g. "CBC", "Fasting Blood Sugar" */
  @Column()
  testName: string;

  @Column({ nullable: true, type: 'text' })
  testDescription: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: BloodTestStatus, default: BloodTestStatus.PENDING })
  status: BloodTestStatus;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: BloodTestPriority, default: BloodTestPriority.ROUTINE })
  priority: BloodTestPriority;

  /** Whether the patient needed to fast before sample collection */
  @Column({ default: false })
  fasting: boolean;

  /** Clinical notes / reason for order */
  @Column({ nullable: true, type: 'text' })
  clinicalNotes: string;

  /** Date/time sample was collected */
  @Column({ nullable: true, type: isSQLite ? 'datetime' : 'timestamptz' })
  sampleCollectedAt: Date;

  /** Date results were received */
  @Column({ nullable: true, type: 'date' })
  resultsReceivedAt: string;

  /** Date patient was notified */
  @Column({ nullable: true, type: isSQLite ? 'datetime' : 'timestamptz' })
  patientNotifiedAt: Date;

  /** Structured results — array of { parameter, value, unit, referenceRange, flag } */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  results: {
    parameter: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    flag?: 'normal' | 'low' | 'high' | 'critical';
  }[];

  /** Free-text result summary / interpretation */
  @Column({ nullable: true, type: 'text' })
  resultSummary: string;

  /** Attached report files — { name, url } */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  attachments: { name: string; url: string }[];

  /** External lab reference / accession number */
  @Column({ nullable: true })
  externalRef: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  /** Set once this test has been added to an invoice, so it can't be billed twice and revenue can be traced back to it. */
  @Column({ nullable: true })
  invoiceId: string;

  @Column({ nullable: true, type: isSQLite ? 'datetime' : 'timestamptz' })
  billedAt: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}