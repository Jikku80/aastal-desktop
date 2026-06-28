import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';

@Entity('patient_accounts')
@Index(['phone'], { unique: true, where: '"phone" IS NOT NULL' })
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
export class PatientAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, select: false })
  otpHash: string;

  @Column({ nullable: true })
  otpExpires: Date;

  @Column({ nullable: true, select: false })
  refreshToken: string;

  /** Notification preferences JSON */
  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', nullable: true })
  notificationPreferences: Record<string, any>;

  /** Self-reported allergies, visible read-only to any clinic this account is linked to */
  @Column({ type: 'text', array: true, default: [] })
  allergies: string[];

  /** Self-reported chronic conditions (e.g. diabetes, hypertension) */
  @Column({ type: 'text', array: true, default: [] })
  chronicConditions: string[];

  /**
   * Self-reported baseline vitals — { bloodPressure, heartRate, weight,
   * temperature, oxygenSaturation, bloodSugar, ... }. Distinct from
   * per-visit clinical vitals recorded by a clinic.
   */
  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', nullable: true })
  vitals: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}