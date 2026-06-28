import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('intake_form_submissions')
export class IntakeFormSubmission {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() templateId: string;
  @Column() appointmentId: string;
  @Column() patientAccountId: string;
  @Column({ type: 'simple-json' }) responses: Record<string, any>;
  @CreateDateColumn() submittedAt: Date;
}
