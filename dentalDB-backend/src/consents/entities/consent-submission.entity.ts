import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('consent_submissions')
export class ConsentSubmission {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() templateId: string;
  @Column() appointmentId: string;
  @Column() patientAccountId: string;
  @Column({ type: 'text' }) signatureBase64: string;
  @Column({ type: 'simple-json' }) checkedBoxes: string[];
  @Column({ nullable: true }) ipAddress: string;
  @CreateDateColumn() signedAt: Date;
}
