import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Expense, ExpenseCategory, ApprovalStatus } from './entities/expense.entity';
import { Vendor } from './entities/vendor.entity';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilterDto } from './dto/create-expense.dto';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { User } from '../users/entities/user.entity';
import { JournalService } from '../finance/journal.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Vendor)  private vendorRepo: Repository<Vendor>,
    @InjectRepository(User)    private userRepo: Repository<User>,
    private auditService: AuditService,
    private notificationsGateway: NotificationsGateway,
    private journalService: JournalService,
  ) {}

  /**
   * Fire-and-forget auto-journal hook (Phase 9 §2 — expense approved →
   * Debit mapped Expense account, Credit Cash). Shared by create() (for
   * expenses created pre-approved, e.g. system-generated ones) and
   * approve(). Never blocks the expense flow that already succeeded.
   */
  private postExpenseJournal(clinicId: string, expense: Expense, userId: string): void {
    // journal.service.postExpenseApproved() already catches & logs its own
    // errors internally, but wrap again here defensively so a synchronous
    // throw can never bubble into the expense-approval response.
    this.journalService.postExpenseApproved(clinicId, expense, userId).catch(() => {});
  }

  /**
   * Backfills journal postings for approved expenses that predate the
   * auto-journal hook (or that were created while the clinic's chart of
   * accounts hadn't been seeded yet — see JournalService.postExpenseApproved,
   * which silently skips posting in that case). Safe to re-run any time:
   * postExpenseApproved() is itself idempotent per expense id.
   */
  async reconcileJournal(clinicId: string, userId: string): Promise<{ scanned: number; posted: number }> {
    const approved = await this.expenseRepo.find({
      where: { clinicId, approvalStatus: ApprovalStatus.APPROVED },
    });
    let posted = 0;
    for (const expense of approved) {
      const entry = await this.journalService.postExpenseApproved(clinicId, expense, userId);
      if (entry) posted++;
    }
    return { scanned: approved.length, posted };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** Fetch a map of userId → "First Last" for a set of IDs */
  private async resolveUserNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))];
    if (!uniqueIds.length) return new Map();
    const users = await this.userRepo.findByIds(uniqueIds);
    return new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
  }

  /** Enrich a single expense with resolved names */
  private async enrichExpense(expense: Expense): Promise<any> {
    const names = await this.resolveUserNames([
      expense.createdBy,
      expense.approvedBy,
      expense.staffId,
    ]);
    return {
      ...expense,
      createdByName:  expense.createdBy  ? (names.get(expense.createdBy)  ?? expense.createdBy)  : null,
      approvedByName: expense.approvedBy ? (names.get(expense.approvedBy) ?? expense.approvedBy) : null,
      staffName:      expense.staffId    ? (names.get(expense.staffId)    ?? expense.staffId)    : null,
    };
  }

  /** Enrich multiple expenses efficiently (single user batch query) */
  private async enrichExpenses(expenses: Expense[]): Promise<any[]> {
    const ids = expenses.flatMap(e => [e.createdBy, e.approvedBy, e.staffId]);
    const names = await this.resolveUserNames(ids);
    return expenses.map(e => ({
      ...e,
      createdByName:  e.createdBy  ? (names.get(e.createdBy)  ?? e.createdBy)  : null,
      approvedByName: e.approvedBy ? (names.get(e.approvedBy) ?? e.approvedBy) : null,
      staffName:      e.staffId    ? (names.get(e.staffId)    ?? e.staffId)    : null,
    }));
  }

  // ── Expenses ────────────────────────────────────────────────────────────────

  async create(clinicId: string, dto: CreateExpenseDto, userId: string): Promise<any> {
    const expense = this.expenseRepo.create({ ...dto, clinicId, createdBy: userId });
    const saved = await this.expenseRepo.save(expense);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.CREATED,
      entityType: 'expense' as AuditEntityType, entityId: saved.id,
      changes: { after: dto },
    });
    if (saved.approvalStatus === ApprovalStatus.APPROVED) {
      this.postExpenseJournal(clinicId, saved, userId);
    }
    return this.enrichExpense(saved);
  }

  async findAll(clinicId: string, filter: ExpenseFilterDto): Promise<{ data: any[]; total: number }> {
    const { branchId, category, dateFrom, dateTo, vendorId, staffId, approvalStatus, page = 1, limit = 20 } = filter;
    const where: FindOptionsWhere<Expense> = { clinicId };
    if (branchId) where.branchId = branchId;
    if (category) where.category = category;
    if (vendorId) where.vendorId = vendorId;
    if (staffId) where.staffId = staffId;
    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (dateFrom && dateTo) where.expenseDate = Between(dateFrom, dateTo) as any;

    const [raw, total] = await this.expenseRepo.findAndCount({
      where, order: { expenseDate: 'DESC' },
      skip: (page - 1) * limit, take: limit,
      relations: ['vendor'],
    });
    const data = await this.enrichExpenses(raw);
    return { data, total };
  }

  async findOne(clinicId: string, id: string): Promise<any> {
    const expense = await this.expenseRepo.findOne({ where: { id, clinicId }, relations: ['vendor'] });
    if (!expense) throw new NotFoundException('Expense not found');
    return this.enrichExpense(expense);
  }

  async update(clinicId: string, id: string, dto: UpdateExpenseDto, userId: string): Promise<any> {
    const expense = await this.expenseRepo.findOne({ where: { id, clinicId } });
    if (!expense) throw new NotFoundException('Expense not found');
    const before = { ...expense };
    Object.assign(expense, dto);
    const saved = await this.expenseRepo.save(expense);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.UPDATED,
      entityType: 'expense' as AuditEntityType, entityId: id,
      changes: { before, after: dto },
    });
    return this.enrichExpense(saved);
  }

  async delete(clinicId: string, id: string, userId: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id, clinicId } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.approvalStatus === ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Cannot delete an approved expense');
    }
    await this.expenseRepo.remove(expense);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.DELETED,
      entityType: 'expense' as AuditEntityType, entityId: id,
      changes: { before: expense },
    });
  }

  async approve(clinicId: string, id: string, approverId: string, status: ApprovalStatus): Promise<any> {
    const expense = await this.expenseRepo.findOne({ where: { id, clinicId } });
    if (!expense) throw new NotFoundException('Expense not found');
    expense.approvalStatus = status;
    expense.approvedBy = approverId;
    const saved = await this.expenseRepo.save(expense);
    await this.auditService.log({
      clinicId, userId: approverId, action: AuditAction.UPDATED,
      entityType: 'expense' as AuditEntityType, entityId: id,
      changes: { after: { approvalStatus: status } },
    });
    this.notificationsGateway.server?.to(clinicId).emit('expense:status', {
      expenseId: id, status, approverId,
    });
    if (status === ApprovalStatus.APPROVED) {
      this.postExpenseJournal(clinicId, saved, approverId);
    }
    return this.enrichExpense(saved);
  }

  async getSummaryByCategory(clinicId: string, params: { dateFrom?: string; dateTo?: string; branchId?: string }) {
    const { dateFrom, dateTo, branchId } = params;
    const qb = this.expenseRepo.createQueryBuilder('e')
      .select('e.category', 'category')
      .addSelect('SUM(e.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('e."clinicId" = :clinicId', { clinicId })
      .andWhere('e."approvalStatus" = :approved', { approved: ApprovalStatus.APPROVED });
    if (branchId) qb.andWhere('e."branchId" = :branchId', { branchId });
    if (dateFrom) qb.andWhere('e."expenseDate" >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('e."expenseDate" <= :dateTo', { dateTo });
    return qb.groupBy('e.category').getRawMany();
  }

  async getMonthlyTrend(clinicId: string, params: { months?: number; calendarType?: string; branchId?: string }) {
    const { months = 6, branchId } = params;
    const rows: any[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to   = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

      const qb = this.expenseRepo.createQueryBuilder('e')
        .select('SUM(e.amount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('e."clinicId" = :clinicId', { clinicId })
        .andWhere('e."approvalStatus" = :approved', { approved: ApprovalStatus.APPROVED })
        .andWhere('e."expenseDate" BETWEEN :from AND :to', { from, to });
      if (branchId) qb.andWhere('e."branchId" = :branchId', { branchId });
      const result = await qb.getRawOne();
      rows.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: Number(result?.total ?? 0),
        count: Number(result?.count ?? 0),
      });
    }
    return rows;
  }

  // ── Vendors ─────────────────────────────────────────────────────────────────

  async createVendor(clinicId: string, dto: CreateVendorDto): Promise<Vendor> {
    return this.vendorRepo.save(this.vendorRepo.create({ ...dto, clinicId }));
  }

  async listVendors(clinicId: string, params: any): Promise<Vendor[]> {
    const where: any = { clinicId };
    if (params?.isActive !== undefined) where.isActive = params.isActive !== 'false';
    return this.vendorRepo.find({ where, order: { name: 'ASC' } });
  }

  async updateVendor(clinicId: string, id: string, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.vendorRepo.findOne({ where: { id, clinicId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    Object.assign(vendor, dto);
    return this.vendorRepo.save(vendor);
  }

  async deleteVendor(clinicId: string, id: string): Promise<void> {
    const vendor = await this.vendorRepo.findOne({ where: { id, clinicId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    await this.vendorRepo.remove(vendor);
  }
}