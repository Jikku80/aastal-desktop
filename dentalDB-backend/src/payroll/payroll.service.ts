import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollRun, PayrollRunStatus } from './entities/payroll-run.entity';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollDeductionRule } from './entities/payroll-deduction-rule.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { Expense, ExpenseCategory, ApprovalStatus } from '../expenses/entities/expense.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';

// ─── Default rules (used when no DB row exists yet) ──────────────────────────
const DEFAULT_RULES = {
  lateDeductionPerHour:   1.0,
  halfDayDeductionRate:   0.5,
  absentDeductionRate:    1.0,
  overtimeRateMultiplier: 1.5,
  leaveAttendedBonusRate: 1.0,
  standardHoursPerDay:    8,
  workingDaysPerMonth:    26,
};

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRun)           private runRepo:    Repository<PayrollRun>,
    @InjectRepository(PayrollEntry)         private entryRepo:  Repository<PayrollEntry>,
    @InjectRepository(PayrollDeductionRule) private ruleRepo:   Repository<PayrollDeductionRule>,
    @InjectRepository(Attendance)           private attendRepo: Repository<Attendance>,
    @InjectRepository(DoctorCommission)     private commRepo:   Repository<DoctorCommission>,
    @InjectRepository(User)                 private userRepo:   Repository<User>,
    @InjectRepository(Branch)              private branchRepo: Repository<Branch>,
    @InjectRepository(Expense)             private expenseRepo: Repository<Expense>,
    private auditService: AuditService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // ─── Deduction rules CRUD ─────────────────────────────────────────────────

  async getDeductionRule(clinicId: string): Promise<PayrollDeductionRule> {
    const rule = await this.ruleRepo.findOne({ where: { clinicId } });
    if (!rule) {
      // Return an in-memory default — never saved, never throws
      const defaults = new PayrollDeductionRule();
      Object.assign(defaults, { ...DEFAULT_RULES, clinicId });
      return defaults;
    }
    return rule;
  }

  async upsertDeductionRule(
    clinicId: string,
    userId: string,
    dto: Partial<Omit<PayrollDeductionRule, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PayrollDeductionRule> {
    let rule = await this.ruleRepo.findOne({ where: { clinicId } });
    if (!rule) {
      rule = new PayrollDeductionRule();
      Object.assign(rule, { ...DEFAULT_RULES, clinicId });
    }
    Object.assign(rule, dto);
    const saved = await this.ruleRepo.save(rule);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.UPDATED,
      entityType: 'payroll_deduction_rule' as AuditEntityType,
      entityId: saved.id,
      changes: { after: dto },
    });
    return saved;
  }

  // ─── Calculate ────────────────────────────────────────────────────────────

  async calculateRun(
    clinicId: string,
    userId: string,
    params: { periodStart: string; periodEnd: string; branchId?: string; staffIds?: string[] },
  ): Promise<PayrollRun> {
    const { periodStart, periodEnd, branchId, staffIds } = params;

    // ── 1. Load staff ────────────────────────────────────────────────────────
    let staffQb = this.userRepo.createQueryBuilder('u')
      .where('u.clinicId = :clinicId', { clinicId })
      .andWhere('u.isActive = true');
    if (branchId) {
      staffQb = staffQb.innerJoin(
        'user_branches', 'ub',
        'ub.user_id = u.id AND ub.branch_id = :branchId', { branchId },
      );
    }
    let staff = await staffQb.getMany();
    if (staffIds?.length) staff = staff.filter(s => staffIds.includes(s.id));

    // ── 2. Load attendance — FIX #1: date string comparison, not Between() ──
    const attendances = await this.attendRepo
      .createQueryBuilder('a')
      .where('a.clinicId = :clinicId', { clinicId })
      .andWhere('a.date >= :start', { start: periodStart })
      .andWhere('a.date <= :end',   { end: periodEnd })
      .getMany();

    // ── 3. Load commissions ─────────────────────────────────────────────────
    const commissions = await this.commRepo
      .createQueryBuilder('c')
      .where('c."clinicId" = :clinicId', { clinicId })
      .andWhere('c."createdAt" BETWEEN :from AND :to', {
        from: new Date(periodStart),
        to:   new Date(periodEnd + 'T23:59:59'),
      })
      .getMany();

    // ── 4. Load deduction rules ─────────────────────────────────────────────
    const rules = await this.getDeductionRule(clinicId);

    // ── 5. Working-day denominator for proration ────────────────────────────
    const totalWorkingDays = rules.workingDaysPerMonth
      ?? this._countCalendarWorkingDays(periodStart, periodEnd);

    // ── 6. Create run ───────────────────────────────────────────────────────
    const run = this.runRepo.create({
      clinicId, branchId, periodStart, periodEnd,
      status: PayrollRunStatus.DRAFT, createdBy: userId,
    });
    const savedRun = await this.runRepo.save(run);

    let totalGross = 0, totalDeductions = 0, totalNet = 0;
    const entries: PayrollEntry[] = [];

    for (const member of staff) {
      const memberAttend = attendances.filter(a => a.userId === member.id);

      const presentDays        = memberAttend.filter(a => a.status === 'present').length;
      const lateDays           = memberAttend.filter(a => a.status === 'late').length;
      const halfDays           = memberAttend.filter(a => a.status === 'half_day').length;
      const absentDays         = memberAttend.filter(a => a.status === 'absent').length;
      const leaveDays          = memberAttend.filter(a => a.status === 'leave').length;
      const leaveAttendedDays  = memberAttend.filter(a => a.status === 'leave' && a.checkIn).length;

      const hoursWorked      = memberAttend.reduce((s, a) => s + Number(a.hoursWorked  ?? 0), 0);
      const lateMinutesTotal = memberAttend.reduce((s, a) => s + Number(a.lateMinutes  ?? 0), 0);

      // FIX #2: prorate base salary
      const baseSalary  = Number(member.baseSalary ?? 0);
      const dailyRate   = baseSalary / (totalWorkingDays || 1);
      const hourlyRate  = dailyRate  / Number(rules.standardHoursPerDay || 8);

      // Deductions
      const absentDeduction   = absentDays  * dailyRate  * Number(rules.absentDeductionRate);
      const halfDayDeduction  = halfDays    * dailyRate  * Number(rules.halfDayDeductionRate);
      const lateDeduction     = (lateMinutesTotal / 60) * hourlyRate * Number(rules.lateDeductionPerHour);
      const attendanceDeduction = absentDeduction + halfDayDeduction + lateDeduction;

      // Additions
      const stdHours    = (presentDays + lateDays) * Number(rules.standardHoursPerDay);
      const overtimeHrs = Math.max(0, hoursWorked - stdHours);
      const overtimePay = overtimeHrs * hourlyRate * Number(rules.overtimeRateMultiplier);
      const leaveBonus  = leaveAttendedDays * dailyRate * Number(rules.leaveAttendedBonusRate);

      const commissionEarned = commissions
        .filter(c => c.doctorId === member.id)
        .reduce((s, c) => s + Number(c.amount), 0);

      const grossPay = baseSalary + commissionEarned + overtimePay + leaveBonus;
      const netPay   = Math.max(0, grossPay - attendanceDeduction);

      totalGross      += grossPay;
      totalDeductions += attendanceDeduction;
      totalNet        += netPay;

      entries.push(this.entryRepo.create({
        clinicId,
        payrollRunId:     savedRun.id,
        userId:           member.id,
        branchId:         branchId ?? null,
        baseSalary,
        hoursWorked,
        overtimeHours:    overtimeHrs,
        overtimeRate:     overtimePay,
        commissionEarned,
        bonus:            leaveBonus,
        allowances:       0,
        grossPay,
        taxDeduction:     0,
        otherDeductions:  Number(attendanceDeduction.toFixed(2)),
        netPay,
        attendanceDays:   presentDays + lateDays,
        absentDays,
        leaveDays,
      }));
    }

    await this.entryRepo.save(entries);
    savedRun.totalGross      = totalGross;
    savedRun.totalDeductions = totalDeductions;
    savedRun.totalNet        = totalNet;
    await this.runRepo.save(savedRun);

    await this.auditService.log({
      clinicId, userId, action: AuditAction.CREATED,
      entityType: 'payroll_run' as AuditEntityType, entityId: savedRun.id,
      changes: { after: params },
    });

    return this.getRunSummary(clinicId, savedRun.id);
  }

  // ─── FIX #3: per-entry deduction editing ─────────────────────────────────

  async updateEntry(
    clinicId: string,
    runId: string,
    entryId: string,
    userId: string,
    dto: {
      taxDeduction?:    number;
      otherDeductions?: number;
      bonus?:           number;
      allowances?:      number;
      notes?:           string;
    },
  ): Promise<PayrollEntry> {
    const entry = await this.entryRepo.findOne({
      where: { id: entryId, payrollRunId: runId, clinicId },
      relations: ['payrollRun'],
    });
    if (!entry) throw new NotFoundException('Payroll entry not found');
    if (entry.payrollRun?.status !== PayrollRunStatus.DRAFT)
      throw new BadRequestException('Entries can only be edited on draft runs');

    if (dto.taxDeduction    !== undefined) entry.taxDeduction    = dto.taxDeduction;
    if (dto.otherDeductions !== undefined) entry.otherDeductions = dto.otherDeductions;
    if (dto.bonus           !== undefined) entry.bonus           = dto.bonus;
    if (dto.allowances      !== undefined) entry.allowances      = dto.allowances;
    if (dto.notes           !== undefined) entry.notes           = dto.notes;

    entry.grossPay = Number(entry.baseSalary)
      + Number(entry.commissionEarned)
      + Number(entry.bonus)
      + Number(entry.allowances)
      + Number(entry.overtimeRate);

    entry.netPay = Math.max(
      0,
      entry.grossPay - Number(entry.taxDeduction) - Number(entry.otherDeductions),
    );

    const saved = await this.entryRepo.save(entry);
    await this._recalcRunTotals(clinicId, runId);

    await this.auditService.log({
      clinicId, userId, action: AuditAction.UPDATED,
      entityType: 'payroll_entry' as AuditEntityType, entityId: entryId,
      changes: { after: dto },
    });

    return saved;
  }

  // ─── List / get ───────────────────────────────────────────────────────────

  async listRuns(clinicId: string, params: {
    page?: number; limit?: number; branchId?: string; status?: PayrollRunStatus;
  }) {
    const { page = 1, limit = 20, branchId, status } = params;
    const where: any = { clinicId };
    if (branchId) where.branchId = branchId;
    if (status)   where.status   = status;
    const [data, total] = await this.runRepo.findAndCount({
      where, order: { periodStart: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });

    // FIX #5: resolve branch names
    const branchIds = [...new Set(data.map(r => r.branchId).filter(Boolean))] as string[];
    const branchMap: Record<string, string> = {};
    if (branchIds.length) {
      const branches = await this.branchRepo.findByIds(branchIds);
      branches.forEach(b => { branchMap[b.id] = b.name; });
    }
    const enriched = data.map(r => ({
      ...r,
      branchName: r.branchId ? (branchMap[r.branchId] ?? null) : null,
    }));

    return { data: enriched, total };
  }

  async getRunSummary(clinicId: string, runId: string): Promise<PayrollRun & { branchName?: string | null }> {
    const run = await this.runRepo.findOne({
      where: { id: runId, clinicId },
      relations: ['entries', 'entries.user'],
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    let branchName: string | null = null;
    if (run.branchId) {
      const branch = await this.branchRepo.findOne({ where: { id: run.branchId } });
      branchName = branch?.name ?? null;
    }

    return { ...run, branchName } as any;
  }

  async finalizeRun(clinicId: string, runId: string, userId: string): Promise<PayrollRun> {
    const run = await this.runRepo.findOne({
      where: { id: runId, clinicId },
      relations: ['entries', 'entries.user'],
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT)
      throw new BadRequestException('Only draft runs can be finalized');

    run.status      = PayrollRunStatus.FINALIZED;
    run.finalizedAt = new Date();
    const saved     = await this.runRepo.save(run);

    const salaryExpenses: Expense[] = [];
    for (const entry of run.entries) {
      if (entry.netPay > 0) {
        const staffName = entry.user
          ? `${entry.user.firstName} ${entry.user.lastName}`
          : entry.userId;
        salaryExpenses.push(this.expenseRepo.create({
          clinicId,
          branchId:       entry.branchId ?? run.branchId,
          category:       ExpenseCategory.SALARIES,
          amount:         Number(entry.netPay),
          description:    `Salary — ${staffName} (${run.periodStart} to ${run.periodEnd})`,
          expenseDate:    run.periodEnd,
          staffId:        entry.userId,
          payrollRunId:   run.id,
          createdBy:      userId,
          approvalStatus: ApprovalStatus.APPROVED,
        }));
      }
    }
    if (salaryExpenses.length) await this.expenseRepo.save(salaryExpenses);

    await this.auditService.log({
      clinicId, userId, action: AuditAction.UPDATED,
      entityType: 'payroll_run' as AuditEntityType, entityId: runId,
      changes: { after: { status: 'finalized' } },
    });
    this.notificationsGateway.server?.to(clinicId).emit('payroll:finalized', { runId });
    return saved;
  }

  async markPaid(clinicId: string, runId: string, userId: string): Promise<PayrollRun> {
    const run = await this.runRepo.findOne({
      where: { id: runId, clinicId },
      relations: ['entries'],
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.FINALIZED)
      throw new BadRequestException('Only finalized runs can be marked paid');
    run.status = PayrollRunStatus.PAID;
    const now  = new Date();
    for (const entry of run.entries) { entry.paidAt = now; }
    await this.entryRepo.save(run.entries);
    const saved = await this.runRepo.save(run);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.UPDATED,
      entityType: 'payroll_run' as AuditEntityType, entityId: runId,
      changes: { after: { status: 'paid' } },
    });
    return saved;
  }

  async generatePayslipPdf(clinicId: string, entryId: string): Promise<Buffer> {
    const entry = await this.entryRepo.findOne({
      where: { id: entryId, clinicId },
      relations: ['user', 'payrollRun'],
    });
    if (!entry) throw new NotFoundException('Payroll entry not found');
    const deductions = Number(entry.taxDeduction) + Number(entry.otherDeductions);

    const html = `
      <html><body style="font-family:sans-serif;padding:40px">
        <h1 style="color:#0e9de8">Payslip</h1>
        <p><b>Employee:</b> ${entry.user?.firstName} ${entry.user?.lastName}</p>
        <p><b>Period:</b> ${entry.payrollRun?.periodStart} to ${entry.payrollRun?.periodEnd}</p>
        <hr/>
        <p><b>Base Salary:</b> NPR ${Number(entry.baseSalary).toFixed(2)}</p>
        <p><b>Commission:</b> NPR ${Number(entry.commissionEarned).toFixed(2)}</p>
        <p><b>Overtime Pay:</b> NPR ${Number(entry.overtimeRate).toFixed(2)}</p>
        <p><b>Bonus / Leave Attended:</b> NPR ${Number(entry.bonus).toFixed(2)}</p>
        <p><b>Allowances:</b> NPR ${Number(entry.allowances).toFixed(2)}</p>
        <hr/>
        <p><b>Gross Pay:</b> NPR ${Number(entry.grossPay).toFixed(2)}</p>
        <p><b>Tax Deduction:</b> NPR ${Number(entry.taxDeduction).toFixed(2)}</p>
        <p><b>Other Deductions (absent/late/half-day):</b> NPR ${Number(entry.otherDeductions).toFixed(2)}</p>
        <p><b>Total Deductions:</b> NPR ${deductions.toFixed(2)}</p>
        <h2>Net Pay: NPR ${Number(entry.netPay).toFixed(2)}</h2>
        <p>Attendance: ${entry.attendanceDays} days present | ${entry.absentDays} absent | ${entry.leaveDays} leave</p>
      </body></html>
    `;
    return Buffer.from(html);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async _recalcRunTotals(clinicId: string, runId: string) {
    const entries        = await this.entryRepo.find({ where: { payrollRunId: runId, clinicId } });
    const totalGross      = entries.reduce((s, e) => s + Number(e.grossPay), 0);
    const totalDeductions = entries.reduce((s, e) => s + Number(e.taxDeduction) + Number(e.otherDeductions), 0);
    const totalNet        = entries.reduce((s, e) => s + Number(e.netPay), 0);
    await this.runRepo.update({ id: runId }, { totalGross, totalDeductions, totalNet });
  }

  private _countCalendarWorkingDays(start: string, end: string): number {
    const s = new Date(start), e = new Date(end);
    let count = 0;
    for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) count++; // exclude Sundays
    }
    return count || 26;
  }
}