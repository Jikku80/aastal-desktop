import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { PatientWallet } from './patient-wallet.entity';

export enum WalletTxType { CREDIT = 'credit', DEBIT = 'debit', REFUND = 'refund' }
export enum WalletTxRefType { INVOICE = 'invoice', MANUAL = 'manual', REFUND = 'refund' }

@Entity('wallet_transactions')
@Index(['clinicId', 'patientId', 'createdAt'])
export class WalletTransaction {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column() walletId: string;
  @ManyToOne(() => PatientWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: PatientWallet;
  @Column() patientId: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: WalletTxType }) type: WalletTxType;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) balanceBefore: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) balanceAfter: number;
  @Column({ type: 'text' }) description: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: WalletTxRefType, default: WalletTxRefType.MANUAL }) referenceType: WalletTxRefType;
  @Column({ nullable: true }) referenceId: string;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
}
