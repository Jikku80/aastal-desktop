import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Patient } from '../../patients/entities/patient.entity';
import { User }    from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Branch } from '../../branch/entities/branch.entity';

export enum RecallType {
  CHECKUP           = 'checkup',
  FOLLOWUP          = 'followup',
  MEDICATION_REVIEW = 'medication_review',
  OTHER             = 'other',
}

export enum RecallStatus {
  PENDING   = 'pending',
  CONTACTED = 'contacted',
  BOOKED    = 'booked',
  CANCELLED = 'cancelled',
}

@Entity('recalls')
@Index(['clinicId', 'status', 'dueDate'])
@Index(['clinicId', 'patientId'])
export class Recall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  /** Branch this recall belongs to, so the Recalls page can be scoped to a
   *  branch the same way Appointments/Blood Tests/Lab Work already are.
   *  Nullable because a recall isn't required to have a branch. */
  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: RecallType, default: RecallType.CHECKUP })
  recallType: RecallType;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: RecallStatus, default: RecallStatus.PENDING })
  status: RecallStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /** Linked appointment once the patient books */
  @Column({ nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  reminderSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
