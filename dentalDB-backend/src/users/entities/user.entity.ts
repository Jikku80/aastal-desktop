import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Clinic } from '../../clinics/entities/clinic.entity';

export enum UserRole {
  SUPER_ADMIN   = 'super_admin',
  OWNER         = 'owner',
  DENTIST       = 'dentist',
  DOCTOR        = 'doctor',       // independent/freelance doctors
  RECEPTIONIST  = 'receptionist',
  ACCOUNTANT    = 'accountant',
  STAFF         = 'staff',
}

/** Returns true for any role treated as a clinician */
export function isDoctorRole(role: UserRole): boolean {
  return role === UserRole.DENTIST || role === UserRole.DOCTOR;
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: UserRole, default: UserRole.STAFF })
  role: UserRole;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  /** Doctor's personal signature image (used on prescriptions) */
  @Column({ nullable: true })
  signatureUrl: string;

  /** Nepal Medical Council registration number (for doctors) */
  @Column({ nullable: true })
  nmcNo: string;

  /**
   * Primary/home clinic for staff-dashboard context and seat allocation.
   * NULL for independent doctors with zero clinic affiliations.
   * NOT the source of truth for doctor-clinic relationships (see DoctorClinicAffiliation).
   */
  @Column({ nullable: true })
  clinicId: string;

  @ManyToOne(() => Clinic, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailOtpHash: string;

  @Column({ nullable: true })
  emailOtpExpires: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  /** Monthly base salary used in payroll calculations */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  baseSalary: number;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
