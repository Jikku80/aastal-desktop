import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

/**
 * A single lab parameter template — pre-populates the result-entry row for
 * a service so the technician only has to type the observed value.
 * `referenceRange` is used when there's no sex-specific range; when a test
 * differs by sex (e.g. Uric Acid, Creatinine — see the sample report),
 * `referenceRangeMale` / `referenceRangeFemale` take precedence.
 */
export interface LabServiceParameterTemplate {
  parameter: string;
  unit?: string;
  referenceRange?: string;
  referenceRangeMale?: string;
  referenceRangeFemale?: string;
  method?: string;
}

/**
 * Dynamic, per-clinic lab service catalog. Replaces the old hardcoded
 * `BloodTestType` enum — each clinic/tenant defines the tests it actually
 * runs (a diagnostics-heavy clinic configures dozens; a small dental clinic
 * configures none or a handful) instead of picking from a fixed global list.
 *
 * `panelName` groups services on a printed report the way the sample lab
 * report groups tests under section headers ("LIVER FUNCTION TEST",
 * "RENAL FUNCTION TEST", "LIPID PROFILE", etc.) — several services can
 * share the same panelName so they render together as one section.
 */
@Entity('lab_services')
@Index(['clinicId', 'isActive'])
@Index(['clinicId', 'category'])
export class LabService {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** Short display name, e.g. "Lipid Profile", "CBC", "HbA1c" */
  @Column()
  name: string;

  /** Free-text grouping category for the catalog UI, e.g. "Hematology", "Biochemistry" */
  @Column({ nullable: true })
  category: string;

  /**
   * Section header used when printing — e.g. "LIVER FUNCTION TEST". Falls
   * back to `name` if not set. Multiple services can share a panelName so
   * they group together on one report.
   */
  @Column({ nullable: true })
  panelName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultPrice: number;

  /** Typical turnaround time in hours, shown to staff when ordering */
  @Column({ type: 'int', nullable: true })
  defaultTurnaroundHours: number;

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  defaultParameters: LabServiceParameterTemplate[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}