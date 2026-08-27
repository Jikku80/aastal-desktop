import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

// Phase 9 — Finance Module. Standard 5-type chart-of-accounts structure.
// Reuses the existing tenant/clinic scoping pattern (clinicId column, same
// as Expense/Invoice/etc.) rather than inventing a separate finance tenancy
// concept — see Phase 9 architecture note in the phase doc.
export enum AccountType {
  ASSET     = 'asset',
  LIABILITY = 'liability',
  EQUITY    = 'equity',
  REVENUE   = 'revenue',
  EXPENSE   = 'expense',
}

/**
 * Which side of a journal entry increases this account's balance.
 * Asset/Expense accounts have a natural DEBIT balance; Liability/Equity/
 * Revenue accounts have a natural CREDIT balance. Derived from `type` at
 * creation time and stored so ledger/trial-balance math never has to
 * re-derive it from a switch statement scattered across services.
 */
export enum NormalBalance {
  DEBIT  = 'debit',
  CREDIT = 'credit',
}

export function normalBalanceForType(type: AccountType): NormalBalance {
  return (type === AccountType.ASSET || type === AccountType.EXPENSE)
    ? NormalBalance.DEBIT
    : NormalBalance.CREDIT;
}

@Entity('finance_accounts')
@Index(['clinicId', 'type'])
@Index(['clinicId', 'code'], { unique: true })
export class Account {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;

  /** Short numeric-ish code, e.g. "1000" — used for stable ordering and display, not a real accounting-standard requirement. */
  @Column() code: string;
  @Column() name: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AccountType }) type: AccountType;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: NormalBalance }) normalBalance: NormalBalance;

  /** Nullable — sub-accounts hang off a parent (e.g. "Pharmacy Revenue" under "Revenue"). */
  @Column({ nullable: true }) parentId: string;

  /** Seeded default accounts (Cash, default revenue/expense mappings, etc.) — protected from deletion, still editable/renamable. */
  @Column({ default: false }) isSystem: boolean;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) description: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}