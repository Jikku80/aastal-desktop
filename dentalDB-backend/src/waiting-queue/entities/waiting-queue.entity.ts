import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Patient }     from '../../patients/entities/patient.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { User }        from '../../users/entities/user.entity';

export enum QueueStatus {
  WAITING     = 'waiting',
  CALLED      = 'called',
  IN_PROGRESS = 'in_progress',
  DONE        = 'done',
  SKIPPED     = 'skipped',
}

@Entity('waiting_queue')
@Index(['clinicId', 'branchId', 'createdAt'])
export class WaitingQueue {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  branchId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ nullable: true })
  doctorId: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  /** Auto-incremented per branch per day, resets to 1 each day */
  @Column({ default: 1 })
  tokenNumber: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
  status: QueueStatus;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  calledAt: Date;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}