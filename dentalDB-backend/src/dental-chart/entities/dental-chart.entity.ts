import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('dental_charts')
@Index(['clinicId', 'patientId'], { unique: true })
export class DentalChart {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  /**
   * JSONB tooth map keyed by FDI tooth number (11–48).
   * Each entry: { condition, surfaces, notes, lastUpdated }
   */
  @Column({ type: 'simple-json', default: '{}' })
  teeth: Record<number, {
    condition:   string;
    surfaces:    Record<string, string>;
    notes?:      string;
    lastUpdated?: string;
  }>;

  /**
   * Audit history of changes per tooth
   */
  @Column({ type: 'simple-json', default: '[]' })
  history: Array<{
    date:     string;
    tooth:    number;
    change:   string;
    dentist?: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
