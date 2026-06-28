import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User } from '../../users/entities/user.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { Branch } from '../../branch/entities/branch.entity';

export enum AffiliationStatus {
  INVITED   = 'invited',
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  REMOVED   = 'removed',
}

@Entity('doctor_clinic_affiliations')
@Index(['doctorUserId', 'clinicId'], { unique: true })
@Index(['clinicId', 'status'])
@Index(['doctorUserId', 'status'])
export class DoctorClinicAffiliation {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  doctorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorUserId' })
  doctor: User;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AffiliationStatus, default: AffiliationStatus.INVITED })
  status: AffiliationStatus;

  @Column({ nullable: true })
  invitedAt: Date;

  @Column({ nullable: true })
  joinedAt: Date;

  /** When true this is the doctor's main employment context */
  @Column({ default: false })
  isPrimaryEmployment: boolean;

  /** Overrides clinic default commission when set */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionPercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
