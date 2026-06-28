import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Patient } from '../../patients/entities/patient.entity';

export enum FileCategory {
  XRAY      = 'xray',
  REPORT    = 'report',
  DOCUMENT  = 'document',
  IMAGE     = 'image',
  OTHER     = 'other',
}

@Entity('patient_files')
export class PatientFile {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  originalName: string;

  @Column()
  storedName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: FileCategory, default: FileCategory.OTHER })
  category: FileCategory;

  @Column({ nullable: true })
  description: string;

  /** relative path under uploads dir, or S3 key */
  @Column()
  path: string;

  @Column({ nullable: true })
  uploadedByUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
