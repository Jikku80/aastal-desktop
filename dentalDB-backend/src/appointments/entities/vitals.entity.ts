import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Appointment } from './appointment.entity';

@Entity('vitals')
@Index(['clinicId', 'patientId'])
@Index(['appointmentId'], { unique: true })
export class Vitals {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { eager: false, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ nullable: true })
  recordedBy: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'recordedBy' })
  recorder: User;

  @CreateDateColumn()
  recordedAt: Date;

  /** Blood pressure systolic (mmHg) */
  @Column({ type: 'int', nullable: true })
  systolic: number;

  /** Blood pressure diastolic (mmHg) */
  @Column({ type: 'int', nullable: true })
  diastolic: number;

  /** Pulse / heart rate (bpm) */
  @Column({ type: 'int', nullable: true })
  pulse: number;

  /** Temperature (°C) */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number;

  /** Weight (kg) */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  weight: number;

  /** Height (cm) */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  height: number;

  /** SpO2 oxygen saturation (%) */
  @Column({ type: 'int', nullable: true })
  spo2: number;

  /** Blood sugar (mmol/L) */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  bloodSugar: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}