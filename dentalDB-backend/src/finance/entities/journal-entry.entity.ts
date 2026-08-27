import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { JournalLine } from './journal-line.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

// What automatically posted this entry — lets the ledger/audit trail answer
// "why does this line exist" without guessing from the memo text, and lets
// posting hooks be idempotent (look up "have I already posted for this
// sourceType+sourceId" before writing another entry).
export enum JournalSourceType {
  INVOICE_PAYMENT   = 'invoice_payment',
  EXPENSE_APPROVED  = 'expense_approved',
  MANUAL            = 'manual',
  OPENING_BALANCE   = 'opening_balance',
  REVERSAL          = 'reversal',
}

@Entity('finance_journal_entries')
@Index(['clinicId', 'date'])
@Index(['clinicId', 'sourceType', 'sourceId'])
export class JournalEntry {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column({ nullable: true }) branchId: string;

  @Column({ type: 'date' }) date: string;
  @Column({ type: 'text' }) memo: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: JournalSourceType, default: JournalSourceType.MANUAL })
  sourceType: JournalSourceType;

  /** e.g. invoiceId, expenseId — null for pure manual entries with no linked record. */
  @Column({ nullable: true }) sourceId: string;

  @Column() postedBy: string;

  /** True when this entry exists only to reverse another (e.g. a voided manual entry inside a closed period can't be deleted, only reversed). */
  @Column({ default: false }) isReversal: boolean;
  @Column({ nullable: true }) reversalOfId: string;

  @OneToMany(() => JournalLine, (line) => line.journalEntry, { cascade: true, eager: true })
  lines: JournalLine[];

  @CreateDateColumn() createdAt: Date;
}