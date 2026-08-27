import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JournalEntry, JournalSourceType } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { Account } from './entities/account.entity';
import { AccountingPeriod, PeriodStatus } from './entities/accounting-period.entity';
import { CoaService } from './coa.service';
import { CreateManualJournalEntryDto } from './dto/finance.dto';
import { Invoice } from '../billing/entities/invoice.entity';
import { Expense } from '../expenses/entities/expense.entity';
import {
  CASH_ACCOUNT_CODE, SERVICE_REVENUE_ACCOUNT_CODE, PHARMACY_REVENUE_ACCOUNT_CODE,
  LAB_REVENUE_ACCOUNT_CODE, OTHER_REVENUE_ACCOUNT_CODE, EXPENSE_CATEGORY_ACCOUNT_CODE,
} from './finance-seed.data';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(JournalEntry) private entryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine) private lineRepo: Repository<JournalLine>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(AccountingPeriod) private periodRepo: Repository<AccountingPeriod>,
    @InjectDataSource() private dataSource: DataSource,
    private coaService: CoaService,
    private auditService: AuditService,
  ) {}

  // ── Period-lock guard ────────────────────────────────────────────────────

  private async assertDateNotClosed(clinicId: string, date: string): Promise<void> {
    const closed = await this.periodRepo.findOne({
      where: { clinicId, status: PeriodStatus.CLOSED },
    });
    // findOne with a plain where can't express a range check on both
    // boundaries in one shot without QueryBuilder — small clinic-scoped
    // table (one row per closed month/quarter/year), so a query builder
    // check is cheap and clearer than hand-rolling Between logic here.
    const hit = await this.periodRepo.createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.status = :status', { status: PeriodStatus.CLOSED })
      .andWhere(':date BETWEEN p.startDate AND p.endDate', { date })
      .getOne();
    if (hit) {
      throw new BadRequestException(
        `${date} falls inside the closed accounting period "${hit.label}" — this period was locked on ${new Date(hit.closedAt!).toLocaleDateString()} and can no longer receive new entries.`,
      );
    }
  }

  // ── Core posting primitive — every other posting method funnels through this ──

  /**
   * Posts a balanced journal entry. Validates debit total === credit total
   * before touching the database (the phase doc calls this "structurally
   * impossible" to violate — this is the structural enforcement).
   */
  async post(
    clinicId: string,
    params: {
      date: string;
      memo: string;
      branchId?: string | null;
      sourceType: JournalSourceType;
      sourceId?: string | null;
      postedBy: string;
      lines: { accountId: string; debit?: number; credit?: number; description?: string }[];
    },
  ): Promise<JournalEntry> {
    const { date, memo, branchId, sourceType, sourceId, postedBy, lines } = params;

    const cleanLines = lines
      .map(l => ({ ...l, debit: Number(l.debit || 0), credit: Number(l.credit || 0) }))
      .filter(l => l.debit > 0 || l.credit > 0);

    if (cleanLines.length < 2) {
      throw new BadRequestException('A journal entry needs at least two non-zero lines.');
    }
    for (const l of cleanLines) {
      if (l.debit > 0 && l.credit > 0) {
        throw new BadRequestException('A single journal line cannot have both a debit and a credit amount.');
      }
    }

    const totalDebit  = cleanLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = cleanLines.reduce((s, l) => s + l.credit, 0);
    // Round to cents before comparing — accumulated float arithmetic across
    // several lines can leave a sub-paisa residue that would otherwise
    // falsely block an obviously-balanced entry.
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
      throw new BadRequestException(
        `Journal entry is not balanced: total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)}).`,
      );
    }

    await this.assertDateNotClosed(clinicId, date);

    // Validate every account belongs to this clinic (tenant isolation).
    const accountIds = [...new Set(cleanLines.map(l => l.accountId))];
    const accounts = await this.accountRepo.findByIds(accountIds);
    for (const id of accountIds) {
      const acc = accounts.find(a => a.id === id && a.clinicId === clinicId);
      if (!acc) throw new NotFoundException(`Account ${id} not found for this clinic`);
      if (!acc.isActive) throw new BadRequestException(`Account "${acc.name}" is inactive and cannot receive new postings`);
    }

    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        clinicId, branchId: branchId ?? undefined, date, memo, sourceType,
        sourceId: sourceId ?? undefined, postedBy,
        lines: cleanLines.map(l => manager.create(JournalLine, {
          accountId: l.accountId, debit: l.debit, credit: l.credit, description: l.description,
        })),
      });
      const saved = await manager.save(JournalEntry, entry);
      await this.auditService.log({
        clinicId, userId: postedBy, action: AuditAction.CREATED,
        entityType: 'journal_entry' as AuditEntityType, entityId: saved.id,
        changes: { after: { date, memo, sourceType, sourceId, lines: cleanLines } },
      });
      return saved;
    });
  }

  /** Manual entries, authorized by finance.post_journal_entry (checked at controller level). */
  async postManual(clinicId: string, dto: CreateManualJournalEntryDto, userId: string): Promise<JournalEntry> {
    return this.post(clinicId, {
      date: dto.date,
      memo: dto.memo,
      branchId: dto.branchId,
      sourceType: JournalSourceType.MANUAL,
      postedBy: userId,
      lines: dto.lines,
    });
  }

  /** Sum of a previous posting's total for a given source, for delta-based idempotent re-posting. */
  private async alreadyPostedTotal(clinicId: string, sourceType: JournalSourceType, sourceId: string): Promise<number> {
    const entries = await this.entryRepo.find({ where: { clinicId, sourceType, sourceId } });
    let total = 0;
    for (const e of entries) {
      total += (e.lines || []).reduce((s, l) => s + Number(l.debit), 0);
    }
    return total;
  }

  // ── Invoice payment → Debit Cash, Credit Revenue (split by line-item type) ──

  /**
   * Called from BillingService whenever an invoice's paidAmount increases
   * (create-already-paid, markPaid, or a plain status-update to paid/
   * partially_paid). Idempotent: computes only the *delta* since the last
   * posting for this invoice, so it's safe to call from every one of those
   * three call sites without double-posting a payment that was already
   * recorded. Revenue is recognized cash-basis (proportional to what's
   * actually been collected so far), split across Service/Pharmacy/Lab/
   * Other by each line item's serviceId/productId/labWorkId — the same
   * categorization the invoice items already carry (Phase 5/7 wiring).
   */
  async postInvoicePayment(clinicId: string, invoice: Invoice, userId: string): Promise<JournalEntry | null> {
    const paidAmount = Number(invoice.paidAmount || 0);
    if (paidAmount <= 0) return null;

    const alreadyPosted = await this.alreadyPostedTotal(clinicId, JournalSourceType.INVOICE_PAYMENT, invoice.id);
    const delta = Math.round((paidAmount - alreadyPosted) * 100) / 100;
    if (delta <= 0) return null; // nothing new collected since the last post (or a refund reduced it — refunds aren't auto-posted, see reports)

    const total = Number(invoice.total || 0) || paidAmount;
    const ratio = delta / total;

    let serviceAmt = 0, pharmacyAmt = 0, labAmt = 0, otherAmt = 0;
    for (const item of (invoice.items || [])) {
      const lineTotal = Number(item.total || 0) * ratio;
      if (item.productId) pharmacyAmt += lineTotal;
      else if (item.labWorkId || item.bloodTestId) labAmt += lineTotal;
      else if (item.serviceId) serviceAmt += lineTotal;
      else otherAmt += lineTotal;
    }
    // Items might not sum exactly to `delta` (discount/tax/vat adjustments
    // live on the invoice header, not per line) — true up the remainder
    // into "Other Revenue" rather than silently dropping a few cents, and
    // rather than fabricating a fifth revenue category.
    const allocated = serviceAmt + pharmacyAmt + labAmt + otherAmt;
    const remainder = Math.round((delta - allocated) * 100) / 100;
    otherAmt += remainder;

    const [cash, serviceRev, pharmacyRev, labRev, otherRev] = await Promise.all([
      this.coaService.findByCode(clinicId, CASH_ACCOUNT_CODE),
      this.coaService.findByCode(clinicId, SERVICE_REVENUE_ACCOUNT_CODE),
      this.coaService.findByCode(clinicId, PHARMACY_REVENUE_ACCOUNT_CODE),
      this.coaService.findByCode(clinicId, LAB_REVENUE_ACCOUNT_CODE),
      this.coaService.findByCode(clinicId, OTHER_REVENUE_ACCOUNT_CODE),
    ]).catch((): any[] => {
      this.logger.warn(`Clinic ${clinicId} has no default COA yet — skipping auto-journal for invoice ${invoice.id}. Seed the chart of accounts (Finance → Chart of Accounts) to enable this.`);
      return [];
    }) as any;
    if (!cash) return null;

    const lines: { accountId: string; debit?: number; credit?: number; description?: string }[] = [
      { accountId: cash.id, debit: delta, description: `Payment received — invoice ${invoice.invoiceNumber}` },
    ];
    if (round2(serviceAmt)  > 0) lines.push({ accountId: serviceRev.id,  credit: round2(serviceAmt),  description: 'Service revenue' });
    if (round2(pharmacyAmt) > 0) lines.push({ accountId: pharmacyRev.id, credit: round2(pharmacyAmt), description: 'Pharmacy revenue' });
    if (round2(labAmt)      > 0) lines.push({ accountId: labRev.id,      credit: round2(labAmt),      description: 'Lab revenue' });
    if (round2(otherAmt)    > 0) lines.push({ accountId: otherRev.id,    credit: round2(otherAmt),    description: 'Other revenue' });

    try {
      return await this.post(clinicId, {
        date: (invoice.paidAt ? new Date(invoice.paidAt) : new Date()).toISOString().split('T')[0],
        memo: `Invoice ${invoice.invoiceNumber} payment`,
        branchId: invoice.branchId,
        sourceType: JournalSourceType.INVOICE_PAYMENT,
        sourceId: invoice.id,
        postedBy: userId,
        lines,
      });
    } catch (e: any) {
      // A closed-period or rounding-edge failure here must never block the
      // actual payment from being recorded on the invoice — billing already
      // succeeded by the time this runs. Log and move on, same
      // fire-and-forget philosophy as notifyJwantraInvoicePaid().
      this.logger.warn(`Failed to auto-post journal entry for invoice ${invoice.id}: ${e?.message}`);
      return null;
    }
  }

  // ── Expense approved → Debit mapped Expense account, Credit Cash ────────

  /**
   * Single shared hook for every path that produces an *approved* expense:
   * ExpensesService.approve() (manual expenses), PayrollService.finalizeRun()
   * (salary expenses), and InventoryService.recordExpiredDisposalExpense()
   * (pharmacy write-offs) — all three already funnel through the Expense
   * entity per the existing architecture, so this is the one place that
   * needs to know about journal posting, per the phase doc's instruction
   * to "wire that same event into the journal instead of building a new
   * listener." Idempotent per expense id.
   */
  async postExpenseApproved(clinicId: string, expense: Expense, userId: string): Promise<JournalEntry | null> {
    const amount = Number(expense.amount || 0);
    if (amount <= 0) return null;

    const alreadyPosted = await this.alreadyPostedTotal(clinicId, JournalSourceType.EXPENSE_APPROVED, expense.id);
    if (alreadyPosted > 0) return null; // expenses aren't partially paid the way invoices are — one post per expense

    const code = EXPENSE_CATEGORY_ACCOUNT_CODE[expense.category];
    let expenseAccount: Account, cash: Account;
    try {
      [expenseAccount, cash] = await Promise.all([
        this.coaService.findByCode(clinicId, code),
        this.coaService.findByCode(clinicId, CASH_ACCOUNT_CODE),
      ]);
    } catch {
      this.logger.warn(`Clinic ${clinicId} has no default COA yet — skipping auto-journal for expense ${expense.id}. Seed the chart of accounts (Finance → Chart of Accounts) to enable this.`);
      return null;
    }

    try {
      return await this.post(clinicId, {
        date: expense.expenseDate,
        memo: expense.description || `${expense.category} expense`,
        branchId: expense.branchId,
        sourceType: JournalSourceType.EXPENSE_APPROVED,
        sourceId: expense.id,
        postedBy: userId,
        lines: [
          { accountId: expenseAccount.id, debit: amount, description: expense.description },
          { accountId: cash.id, credit: amount, description: `Payment for: ${expense.description}` },
        ],
      });
    } catch (e: any) {
      this.logger.warn(`Failed to auto-post journal entry for expense ${expense.id}: ${e?.message}`);
      return null;
    }
  }

  // ── Read paths used by ledger/statements ─────────────────────────────────

  async findEntries(clinicId: string, params: { dateFrom?: string; dateTo?: string; branchId?: string; accountId?: string }): Promise<JournalEntry[]> {
    const qb = this.entryRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.lines', 'l')
      .leftJoinAndSelect('l.account', 'a')
      .where('e.clinicId = :clinicId', { clinicId })
      .orderBy('e.date', 'ASC').addOrderBy('e.createdAt', 'ASC');
    if (params.dateFrom) qb.andWhere('e.date >= :from', { from: params.dateFrom });
    if (params.dateTo)   qb.andWhere('e.date <= :to', { to: params.dateTo });
    // NULL-safe branch filter — entries with no branch recorded (legacy
    // records predating branch scoping, or genuinely clinic-wide postings)
    // must stay visible regardless of which branch is selected. A strict
    // "=" comparison silently drops them, since SQL NULL never equals
    // anything — see StatementsService for the matching fix on statements.
    if (params.branchId) qb.andWhere('(e.branchId = :branchId OR e.branchId IS NULL)', { branchId: params.branchId });
    if (params.accountId) {
      qb.andWhere('e.id IN (SELECT "journalEntryId" FROM finance_journal_lines WHERE "accountId" = :accountId)', { accountId: params.accountId });
    }
    return qb.getMany();
  }

  async findOne(clinicId: string, id: string): Promise<JournalEntry> {
    const entry = await this.entryRepo.findOne({ where: { id, clinicId } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  /**
   * Reverses a manual entry with an equal-and-opposite entry rather than
   * deleting it — deleting would break the immutable audit trail closed
   * periods depend on. Only manual entries can be reversed this way;
   * auto-posted entries should be corrected at the source (e.g. edit the
   * expense) which naturally supersedes rather than needing a reversal.
   */
  async reverseManualEntry(clinicId: string, id: string, userId: string): Promise<JournalEntry> {
    const original = await this.findOne(clinicId, id);
    if (original.sourceType !== JournalSourceType.MANUAL) {
      throw new BadRequestException('Only manually posted entries can be reversed directly — auto-posted entries should be corrected at their source record.');
    }
    const today = new Date().toISOString().split('T')[0];
    return this.post(clinicId, {
      date: today,
      memo: `Reversal of: ${original.memo}`,
      branchId: original.branchId,
      sourceType: JournalSourceType.REVERSAL,
      sourceId: original.id,
      postedBy: userId,
      lines: (original.lines || []).map(l => ({
        accountId: l.accountId,
        debit: Number(l.credit) || 0,
        credit: Number(l.debit) || 0,
        description: `Reversal: ${l.description ?? ''}`,
      })),
    });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}