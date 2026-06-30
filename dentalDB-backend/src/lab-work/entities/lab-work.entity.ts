import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

export enum LabWorkStatus {
  PENDING    = 'pending',
  SENT       = 'sent',
  IN_PROGRESS = 'in_progress',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

export enum LabWorkPriority {
  ROUTINE = 'routine',
  URGENT  = 'urgent',
  STAT    = 'stat',
}

@Entity('lab_works')
@Index(['clinicId', 'patientId'])
@Index(['clinicId', 'status'])
@Index(['clinicId', 'createdAt'])
export class LabWork {
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

  /** The external lab name (e.g. "PathCare Labs") */
  @Column({ nullable: true })
  labName: string;

  /** Short title: "CBC", "Lipid Panel", etc. */
  @Column()
  testName: string;

  @Column({ nullable: true, type: 'text' })
  testDescription: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: LabWorkStatus, default: LabWorkStatus.PENDING })
  status: LabWorkStatus;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: LabWorkPriority, default: LabWorkPriority.ROUTINE })
  priority: LabWorkPriority;

  /** Clinical notes / reason for order */
  @Column({ nullable: true, type: 'text' })
  clinicalNotes: string;

  /** Date sample was collected */
  @Column({ nullable: true, type: 'date' })
  sampleCollectedAt: string;

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
