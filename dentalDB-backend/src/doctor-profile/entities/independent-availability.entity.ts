import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User } from '../../users/entities/user.entity';
import { DoctorLocation } from './doctor-location.entity';

export enum ConsultationType {
  IN_PERSON = 'in_person',
  VIDEO     = 'video',
  BOTH      = 'both',
}

@Entity('independent_availability')
export class IndependentAvailability {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  doctorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorUserId' })
  doctor: User;

  /** 0=Sunday ... 6=Saturday */
  @Column()
  dayOfWeek: number;

  @Column({ type: isSQLite ? 'varchar' : 'time' })
  startTime: string;

  @Column({ type: isSQLite ? 'varchar' : 'time' })
  endTime: string;

  @Column({ default: 30 })
  slotDurationMinutes: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: ConsultationType, default: ConsultationType.BOTH })
  consultationType: ConsultationType;

  @Column({ nullable: true })
  locationId: string;

  @ManyToOne(() => DoctorLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location: DoctorLocation;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}