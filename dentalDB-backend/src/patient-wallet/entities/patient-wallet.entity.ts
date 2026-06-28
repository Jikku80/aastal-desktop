import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm';

@Entity('patient_wallets')
@Unique(['clinicId', 'patientId'])
export class PatientWallet {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column() patientId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) balance: number;
  @Column({ default: 'NPR' }) currency: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
