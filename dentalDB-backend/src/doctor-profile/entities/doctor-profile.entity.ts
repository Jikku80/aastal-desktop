import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('doctor_profiles')
@Index(['userId'], { unique: true })
export class DoctorProfile {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ── Specialization & qualifications ──────────────────────────────────────

  @Column({ type: 'simple-array', nullable: true })
  specializations: string[];

  @Column({ type: 'simple-array', nullable: true })
  qualifications: string[];

  @Column({ default: 0 })
  yearsOfExperience: number;

  // ── About ─────────────────────────────────────────────────────────────────

  @Column({ nullable: true, type: 'text' })
  bio: string;

  // ── Fees ──────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consultationFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  videoConsultationFee: number;

  // ── Languages ────────────────────────────────────────────────────────────

  @Column({ type: 'simple-array', nullable: true })
  languagesSpoken: string[];

  // ── Media ────────────────────────────────────────────────────────────────

  @Column({ nullable: true })
  profilePhotoUrl: string;

  // ── Practice address ─────────────────────────────────────────────────────
  // Used for independent doctors who don't have a clinic affiliation.
  // Clinic-affiliated doctors inherit the clinic's address instead.

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  // ── Discovery flags ───────────────────────────────────────────────────────

  @Column({ default: false })
  isPubliclyListed: boolean;

  @Column({ default: false })
  isAvailableForInstantConsult: boolean;

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  /** Updated by doctor dashboard ping to track online status */
  @Column({ nullable: true })
  lastSeenAt: Date;

  // ── Ratings (cached aggregates) ───────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: null })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}