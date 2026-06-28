import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('prescription_templates')
export class PrescriptionTemplate {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clinicId: string;

  /** Raw HTML for the clinic letterhead (top of page) */
  @Column({ type: 'text', nullable: true })
  headerHtml: string;

  /** Raw HTML for the signature / footer block */
  @Column({ type: 'text', nullable: true })
  footerHtml: string;

  /** URL / path to the clinic logo image */
  @Column({ nullable: true })
  logoUrl: string;

  /** URL / path to the doctor signature image */
  @Column({ nullable: true })
  signatureUrl: string;

  @Column({ default: true })
  showLogo: boolean;

  @Column({ default: true })
  showLicenseNumber: boolean;

  @Column({ default: true })
  showDoctorName: boolean;

  @Column({ default: true })
  showPatientAge: boolean;

  @Column({ default: true })
  showPatientGender: boolean;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}