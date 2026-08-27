import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { JournalEntry } from './journal-entry.entity';
import { Account } from './account.entity';

@Entity('finance_journal_lines')
@Index(['accountId'])
@Index(['journalEntryId'])
export class JournalLine {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() journalEntryId: string;
  @ManyToOne(() => JournalEntry, (entry) => entry.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journalEntryId' })
  journalEntry: JournalEntry;

  @Column() accountId: string;
  @ManyToOne(() => Account, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) debit: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) credit: number;
  @Column({ nullable: true }) description: string;
}