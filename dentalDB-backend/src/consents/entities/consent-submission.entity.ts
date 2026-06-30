import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

@Entity('consent_submissions')
export class ConsentSubmission {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() templateId: string;
  @Column() appointmentId: string;
  @Column() patientAccountId: string;
  @Column({ type: 'text' }) signatureBase64: string;
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb' }) checkedBoxes: string[];
  @Column({ nullable: true }) ipAddress: string;
  @CreateDateColumn() signedAt: Date;
}
