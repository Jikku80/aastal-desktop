import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType } from './entities/account.entity';
import { JournalLine } from './entities/journal-line.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { CoaService } from './coa.service';

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  /** Signed balance in the account's natural direction (positive = normal). */
  balance: number;
}

@Injectable()
export class StatementsService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(JournalLine) private lineRepo: Repository<JournalLine>,
    @InjectRepository(JournalEntry) private entryRepo: Repository<JournalEntry>,
    private coaService: CoaService,
  ) {}

  // ── Ledger: running balance per account ──────────────────────────────────

  async getLedger(clinicId: string, accountId: string, params: { dateFrom?: string; dateTo?: string; branchId?: string }) {
    const account = await this.coaService.findOne(clinicId, accountId);

    const qb = this.lineRepo.createQueryBuilder('l')
      .innerJoin(JournalEntry, 'e', 'e.id = l."journalEntryId"')
      .select(['l.id AS id', 'l.debit AS debit', 'l.credit AS credit', 'l.description AS description',
        'e.date AS date', 'e.memo AS memo', 'e.sourceType AS "sourceType"', 'e.id AS "entryId"'])
      .where('e.clinicId = :clinicId', { clinicId })
      .andWhere('l."accountId" = :accountId', { accountId })
      .orderBy('e.date', 'ASC').addOrderBy('e.createdAt', 'ASC');
    if (params.dateFrom) qb.andWhere('e.date >= :from', { from: params.dateFrom });
    if (params.dateTo)   qb.andWhere('e.date <= :to', { to: params.dateTo });
    // Entries with no branch recorded (legacy records from before branch
    // scoping, or clinic-wide postings) must stay visible under every
    // branch filter — a strict "=" comparison would silently drop them,
    // since SQL NULL never equals anything, even the branch you're viewing.
    if (params.branchId) qb.andWhere('(e.branchId = :branchId OR e.branchId IS NULL)', { branchId: params.branchId });

    const rows = await qb.getRawMany();
    const isDebitNormal = account.normalBalance === 'debit';
    let running = 0;
    const entries = rows.map((r) => {
      const debit = Number(r.debit);
      const credit = Number(r.credit);
      running += isDebitNormal ? (debit - credit) : (credit - debit);
      return {
        id: r.id, date: r.date, memo: r.memo, description: r.description,
        sourceType: r.sourceType, entryId: r.entryId,
        debit, credit, runningBalance: Math.round(running * 100) / 100,
      };
    });
    return { account, entries };
  }

  // ── Trial balance: every account, debit/credit totals, must net to zero ──

  async getTrialBalance(clinicId: string, params: { dateTo?: string; branchId?: string } = {}): Promise<{ rows: AccountBalance[]; totalDebit: number; totalCredit: number; isBalanced: boolean }> {
    const accounts = await this.accountRepo.find({ where: { clinicId }, order: { code: 'ASC' } });
    const balances = await this.computeBalances(clinicId, accounts, params);
    const totalDebit  = round2(balances.reduce((s, b) => s + b.debit, 0));
    const totalCredit = round2(balances.reduce((s, b) => s + b.credit, 0));
    return { rows: balances, totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  }

  /** Raw debit/credit totals per account up to (and optionally from) a date — the shared building block for trial balance and all three statements. */
  private async computeBalances(
    clinicId: string,
    accounts: Account[],
    params: { dateFrom?: string; dateTo?: string; branchId?: string },
  ): Promise<AccountBalance[]> {
    if (!accounts.length) return [];
    const qb = this.lineRepo.createQueryBuilder('l')
      .innerJoin(JournalEntry, 'e', 'e.id = l."journalEntryId"')
      .select('l."accountId"', 'accountId')
      .addSelect('SUM(l.debit)', 'debit')
      .addSelect('SUM(l.credit)', 'credit')
      .where('e.clinicId = :clinicId', { clinicId })
      .groupBy('l."accountId"');
    if (params.dateFrom) qb.andWhere('e.date >= :from', { from: params.dateFrom });
    if (params.dateTo)   qb.andWhere('e.date <= :to', { to: params.dateTo });
    // Same NULL-safe branch filter as getLedger — see comment there.
    if (params.branchId) qb.andWhere('(e.branchId = :branchId OR e.branchId IS NULL)', { branchId: params.branchId });

    const rows = await qb.getRawMany();
    const byAccount = new Map(rows.map(r => [r.accountId, { debit: Number(r.debit) || 0, credit: Number(r.credit) || 0 }]));

    return accounts.map(a => {
      const totals = byAccount.get(a.id) || { debit: 0, credit: 0 };
      const balance = a.normalBalance === 'debit'
        ? totals.debit - totals.credit
        : totals.credit - totals.debit;
      return {
        accountId: a.id, code: a.code, name: a.name, type: a.type,
        debit: round2(totals.debit), credit: round2(totals.credit), balance: round2(balance),
      };
    });
  }

  // ── Balance Sheet — Assets / Liabilities / Equity, as-of-date ───────────

  /**
   * Equity section rolls current-period net income (Revenue − Expense,
   * accumulated to date) into Owner's Equity for display, rather than
   * requiring a formal period-end closing journal entry before the
   * statement can be generated — standard for a real-time balance sheet.
   */
  async getBalanceSheet(clinicId: string, params: { asOfDate?: string; branchId?: string } = {}) {
    const asOfDate = params.asOfDate || new Date().toISOString().split('T')[0];
    const accounts = await this.accountRepo.find({ where: { clinicId }, order: { code: 'ASC' } });
    const balances = await this.computeBalances(clinicId, accounts, { dateTo: asOfDate, branchId: params.branchId });

    const byType = (t: AccountType) => balances.filter(b => b.type === t && (b.debit > 0 || b.credit > 0));

    const assets      = byType(AccountType.ASSET);
    const liabilities = byType(AccountType.LIABILITY);
    const equity      = byType(AccountType.EQUITY);
    const revenue     = byType(AccountType.REVENUE);
    const expense     = byType(AccountType.EXPENSE);

    const totalAssets      = round2(assets.reduce((s, a) => s + a.balance, 0));
    const totalLiabilities = round2(liabilities.reduce((s, a) => s + a.balance, 0));
    const totalEquityAccts = round2(equity.reduce((s, a) => s + a.balance, 0));
    const netIncomeToDate  = round2(
      revenue.reduce((s, a) => s + a.balance, 0) - expense.reduce((s, a) => s + a.balance, 0),
    );
    const totalEquity = round2(totalEquityAccts + netIncomeToDate);

    return {
      asOfDate,
      assets, liabilities, equity,
      totalAssets, totalLiabilities, totalEquity,
      netIncomeToDate,
      // Assets = Liabilities + Equity, the fundamental check
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  // ── Profit & Loss — Revenue and Expense over a date range ───────────────

  async getProfitAndLoss(clinicId: string, params: { dateFrom: string; dateTo: string; branchId?: string }) {
    const accounts = await this.accountRepo.find({
      where: { clinicId },
      order: { code: 'ASC' },
    });
    const revenueAccounts = accounts.filter(a => a.type === AccountType.REVENUE);
    const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSE);
    const balances = await this.computeBalances(clinicId, [...revenueAccounts, ...expenseAccounts], params);

    const revenue = balances.filter(b => b.type === AccountType.REVENUE);
    const expenses = balances.filter(b => b.type === AccountType.EXPENSE);
    const totalRevenue  = round2(revenue.reduce((s, a) => s + a.balance, 0));
    const totalExpenses = round2(expenses.reduce((s, a) => s + a.balance, 0));

    return {
      dateFrom: params.dateFrom, dateTo: params.dateTo,
      revenue, expenses,
      totalRevenue, totalExpenses,
      netIncome: round2(totalRevenue - totalExpenses),
    };
  }

  // ── Cash Flow — operating activities, derived from the journal ──────────

  /**
   * "At least operating activities" per the phase doc — every posted entry
   * in this system so far (invoice payments, expense payments) is an
   * operating cash movement, since there's no investing/financing subledger
   * yet. Reports net cash movement through the Cash account, broken down by
   * source type so a reader can see what drove it.
   */
  async getCashFlow(clinicId: string, params: { dateFrom: string; dateTo: string; branchId?: string }) {
    const cash = await this.coaService.findByCode(clinicId, '1000');
    const { entries } = await this.getLedger(clinicId, cash.id, params);

    const openingBalance = await this.cashBalanceAsOf(clinicId, cash.id, params.dateFrom, params.branchId, true);
    const closingBalance = await this.cashBalanceAsOf(clinicId, cash.id, params.dateTo, params.branchId, false);

    const bySource = new Map<string, number>();
    for (const e of entries) {
      const net = e.debit - e.credit; // cash in − cash out
      bySource.set(e.sourceType, round2((bySource.get(e.sourceType) || 0) + net));
    }
    const operatingActivities = Array.from(bySource.entries()).map(([sourceType, netAmount]) => ({ sourceType, netAmount }));
    const netCashFlow = round2(operatingActivities.reduce((s, a) => s + a.netAmount, 0));

    return {
      dateFrom: params.dateFrom, dateTo: params.dateTo,
      openingBalance, closingBalance, netCashFlow,
      operatingActivities,
    };
  }

  private async cashBalanceAsOf(clinicId: string, accountId: string, date: string, branchId: string | undefined, exclusive: boolean): Promise<number> {
    const qb = this.lineRepo.createQueryBuilder('l')
      .innerJoin(JournalEntry, 'e', 'e.id = l."journalEntryId"')
      .select('SUM(l.debit)', 'debit').addSelect('SUM(l.credit)', 'credit')
      .where('e.clinicId = :clinicId', { clinicId })
      .andWhere('l."accountId" = :accountId', { accountId });
    if (exclusive) qb.andWhere('e.date < :date', { date });
    else qb.andWhere('e.date <= :date', { date });
    // Same NULL-safe branch filter as getLedger — see comment there.
    if (branchId) qb.andWhere('(e.branchId = :branchId OR e.branchId IS NULL)', { branchId });
    const row = await qb.getRawOne();
    return round2(Number(row?.debit || 0) - Number(row?.credit || 0));
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}