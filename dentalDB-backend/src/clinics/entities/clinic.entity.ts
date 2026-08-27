import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum SubscriptionPlan {
  FREE       = 'free',
  BASIC      = 'basic',
  PRO        = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum ClinicCategory {
  DENTAL        = 'dental',
  EYE           = 'eye',
  DERMATOLOGY   = 'dermatology',
  PEDIATRICS    = 'pediatrics',
  GYNECOLOGY    = 'gynecology',
  PHYSIOTHERAPY = 'physiotherapy',
  DIAGNOSTICS   = 'diagnostics',
  PHARMACY      = 'pharmacy',
  GENERAL       = 'general',
  CARDIOLOGY    = 'cardiology',
  ORTHOPEDICS   = 'orthopedics',
  NEUROLOGY     = 'neurology',
  PSYCHIATRY    = 'psychiatry',
  ENT           = 'ent',
}

@Entity('clinics')
export class Clinic {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  registrationNumber: string;

  @Column({ nullable: true })
  vatNumber: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  workingHours: Record<string, { start: string; end: string } | null>;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true, default: () => "'{}'", })
  billingTemplate: Record<string, any>;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true, default: () => "'{}'", })
  prescriptionTemplate: Record<string, any>;

  // Phase 8 — Document Design Studio. Same JSON-column pattern as
  // billingTemplate/prescriptionTemplate above; extended rather than
  // reinventing a new templating concept.
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true, default: () => "'{}'", })
  labReportTemplate: Record<string, any>;

  // Consumed by Phase 9's balance sheet / P&L / cash-flow PDFs once the
  // finance module exists. Branding can be configured ahead of that.
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true, default: () => "'{}'", })
  financialStatementTemplate: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  /**
   * True only for a clinic created by OfflineAdminSeeder on a fresh
   * desktop/SQLite install that has never synced (see that file). Lets
   * SyncService.claimPlaceholderClinicIfEligible() tell "a real clinic
   * that just hasn't synced yet" apart from "a placeholder that still
   * needs to be created on the hosted backend" — only the latter is
   * eligible to be claimed via POST /auth/claim-clinic. Always false on
   * the hosted/Postgres deployment.
   */
  @Column({ default: false })
  isLocalPlaceholder: boolean;

  @Column({ nullable: true })
  trialEndsAt: Date;

  @Column({ nullable: true })
  subscriptionEndsAt: Date;

  // ── Public Listing / Discovery ──────────────────────────────────────
  @Column({ default: false })
  isPubliclyListed: boolean;

  @Column({ nullable: true, type: 'text' })
  publicDescription: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  galleryImages: string[];

  /** Specialty/category tags e.g. ['dental','orthodontics'] */
  @Column({ type: 'simple-array', nullable: true })
  categoryTags: string[];

  /** Structured opening hours JSON: { monday: { open:'08:00', close:'18:00', closed:false }, ... } */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  openingHours: Record<string, { open: string; close: string; closed: boolean }>;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ default: false })
  acceptsInsurance: boolean;

  @Column({ type: 'simple-array', nullable: true })
  insuranceProviders: string[];

  @Column({ type: 'simple-array', nullable: true })
  languagesSpoken: string[];

  @Column({ default: false })
  isEmergencyCapable: boolean;

  @Column({ default: false })
  isOpen24Hours: boolean;

  /** Cached aggregate rating from reviews */
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: null })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  /** How many hours before an appointment patients can cancel/reschedule */
  @Column({ default: 24 })
  cancellationWindowHours: number;

  // Lazy relation — loaded only when explicitly requested
  subscription?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}