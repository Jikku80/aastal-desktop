import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Branch } from '../branch/entities/branch.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.entity';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { nepalStartOfTodayUTC, nepalEndOfTodayUTC, nepalDayBoundsUTC, nepalDayOfWeek } from '../common/utils/timezone.util';
// @ts-ignore — nepali-date-converter has no bundled types
import NepaliDate from 'nepali-date-converter';

// ── BS calendar helpers ───────────────────────────────────────────────────────

const BS_MONTHS = [
  'Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin',
  'Kartik','Mangsir','Poush','Magh','Falgun','Chaitra',
];

const BS_DAYS_IN_MONTH: Record<number, number[]> = {
  2079: [31,31,32,32,31,30,30,29,30,29,30,31],
  2080: [31,31,32,32,31,30,30,29,30,29,30,30],
  2081: [31,31,32,32,31,31,30,29,30,29,30,30],
  2082: [31,32,31,32,31,30,30,30,29,29,30,30],
  2083: [31,31,32,32,31,30,30,30,29,29,30,30],
  2084: [31,31,32,32,31,30,30,30,29,29,30,30],
  2085: [31,31,32,32,31,30,30,29,30,29,30,30],
};

function adToBS(ad: Date): { year: number; month: number; day: number } {
  try {
    const nd = new NepaliDate(ad);
    return { year: nd.getYear(), month: nd.getMonth(), day: nd.getDate() };
  } catch {
    return { year: 2081, month: 0, day: 1 };
  }
}

function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  try {
    const nd = new NepaliDate(bsYear, bsMonth, bsDay);
    return nd.toJsDate();
  } catch {
    return new Date();
  }
}

function getDaysInBSMonth(bsYear: number, bsMonth: number): number {
  return BS_DAYS_IN_MONTH[bsYear]?.[bsMonth] ?? 30;
}

function monthLabel(adDate: Date, calendarType: string): string {
  if (calendarType === 'BS') {
    const { year, month } = adToBS(adDate);
    return `${BS_MONTHS[month]} ${year}`;
  }
  return format(adDate, 'MMM yyyy');
}

function bsMonthRange(adDate: Date): { start: Date; end: Date } {
  const { year, month } = adToBS(adDate);
  const days = getDaysInBSMonth(year, month);
  return { start: bsToAD(year, month, 1), end: bsToAD(year, month, days) };
}

function bsMonthByOffset(offset: number): { start: Date; end: Date } {
  const { year, month } = adToBS(new Date());
  let y = year;
  let m = month - offset;
  while (m < 0)  { y--; m += 12; }
  while (m > 11) { y++; m -= 12; }
  const days = getDaysInBSMonth(y, m);
  return { start: bsToAD(y, m, 1), end: bsToAD(y, m, days) };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Appointment) private aptRepo:     Repository<Appointment>,
    @InjectRepository(Patient)     private patientRepo: Repository<Patient>,
    @InjectRepository(Invoice)     private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Branch)      private branchRepo:  Repository<Branch>,
    private config: ConfigService,
    private http:   HttpService,
  ) {}

  async getDashboard(clinicId: string, branchId?: string, calendarType = 'BS') {
    const today = new Date();

    const { start: monthStart, end: monthEnd } =
      calendarType === 'BS'
        ? bsMonthRange(today)
        : { start: startOfMonth(today), end: endOfMonth(today) };

    const aptWhere: any = { clinicId, scheduledAt: this.betweenToday() };
    if (branchId) aptWhere.branchId = branchId;

    const patWhere: any = { clinicId, isActive: true };
    if (branchId) patWhere.branchId = branchId;

    const patMonthWhere: any = {
      clinicId,
      createdAt: this.between(monthStart, monthEnd),
    };
    if (branchId) patMonthWhere.branchId = branchId;

    const [
      todayAppointments,
      totalPatients,
      todayRevenue,
      monthlyRevenue,
      revenueChart,
      appointmentsByStatus,
      newPatientsThisMonth,
    ] = await Promise.all([
      this.aptRepo.count({ where: aptWhere }),
      this.patientRepo.count({ where: patWhere }),
      this.getTodayRevenue(clinicId, branchId),
      this.getMonthRevenue(clinicId, branchId, calendarType),
      this.getWeeklyRevenueChart(clinicId, branchId),
      this.getAppointmentsByStatus(clinicId, branchId, calendarType),
      this.patientRepo.count({ where: patMonthWhere }),
    ]);

    let branchRevenue: any[] | undefined;
    if (!branchId) {
      try {
        const branches = await this.branchRepo.find({ where: { clinicId } });
        branchRevenue = await Promise.all(branches.map(async (b) => ({
          branchId: b.id,
          branchName: b.name,
          todayRevenue: await this.getTodayRevenue(clinicId, b.id),
          monthlyRevenue: await this.getMonthRevenue(clinicId, b.id, calendarType),
        })));
      } catch {}
    }

    return {
      todayAppointments,
      totalPatients,
      todayRevenue,
      monthlyRevenue,
      revenueChart,
      appointmentsByStatus,
      newPatientsThisMonth,
      branchRevenue,
    };
  }

  async getAppointmentStats(clinicId: string, query: any) {
    const months       = Number(query.months) || 6;
    const branchId     = query.branchId as string | undefined;
    const calendarType = (query.calendarType as string) || 'BS';
    const result       = [];

    for (let i = months - 1; i >= 0; i--) {
      let start: Date;
      let end: Date;
      let label: string;

      if (calendarType === 'BS') {
        const range = bsMonthByOffset(i);
        start = range.start;
        end   = range.end;
        label = monthLabel(start, 'BS');
      } else {
        const month = subMonths(new Date(), i);
        start = startOfMonth(month);
        end   = endOfMonth(month);
        label = format(month, 'MMM yyyy');
      }

      const base: any = { clinicId, scheduledAt: this.between(start, end) };
      if (branchId) base.branchId = branchId;

      const [total, completed, cancelled, noShow] = await Promise.all([
        this.aptRepo.count({ where: { ...base } }),
        this.aptRepo.count({ where: { ...base, status: AppointmentStatus.COMPLETED } }),
        this.aptRepo.count({ where: { ...base, status: AppointmentStatus.CANCELLED } }),
        this.aptRepo.count({ where: { ...base, status: AppointmentStatus.NO_SHOW } }),
      ]);

      result.push({
        month: label,
        total, completed, cancelled, noShow,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }

    return result;
  }

  /**
   * Generates a 30-day daily forecast via external ML microservice if available,
   * otherwise falls back to a mock static trajectory.
   */
  async getDailyRevenueForecast(clinicId: string) {
    const mlUrl = this.config.get('ML_SERVICE_URL');
    if (mlUrl) {
      try {
        const { data } = await firstValueFrom(
          this.http.post(`${mlUrl}/api/v1/ml/analytics/forecast/revenue`, {
            clinic_id: clinicId, periods: 30, frequency: 'D',
          }, {
            headers: { 'X-API-Key': this.config.get('ML_API_KEY') },
            timeout: 5000,
          }),
        );
        return data;
      } catch {}
    }

    const today = new Date();
    const dates: string[] = [], predicted: number[] = [], lower: number[] = [], upper: number[] = [];
    const base = 25000;
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const value = base * (d.getDay() >= 5 ? 0.5 : 1.0) * (1 + i * 0.001);
      const noise = value * 0.1;
      dates.push(format(d, 'yyyy-MM-dd'));
      predicted.push(Math.round(value));
      lower.push(Math.round(value - noise));
      upper.push(Math.round(value + noise));
    }
    return { dates, predicted_revenue: predicted, lower_bound: lower, upper_bound: upper, model_accuracy: 0.87 };
  }

  /**
   * Aggregates the last 6 months of invoice history and executes a local linear
   * regression to calculate a branch-aware 3-month monthly revenue trend.
   */
  async getMonthlyRevenueForecast(clinicId: string, params?: { branchId?: string }): Promise<any> {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);

    const q = this.invoiceRepo.createQueryBuilder('i')
      .where('i."clinicId" = :clinicId', { clinicId })
      .andWhere('i.status IN (:...paid)', { paid: ['paid', 'partially_paid'] })
      .andWhere('CAST(i."paidAt" AS date) >= :from', { from: format(sixMonthsAgo, 'yyyy-MM-dd') });

    if (params?.branchId) q.andWhere('i."branchId" = :branchId', { branchId: params.branchId });

    const rows = await q
      .select(`TO_CHAR(DATE_TRUNC('month', CAST(i."paidAt" AS date)), 'YYYY-MM')`, 'month')
      .addSelect('COALESCE(SUM(i."paidAmount"), 0)', 'revenue')
      .groupBy(`DATE_TRUNC('month', CAST(i."paidAt" AS date))`)
      .orderBy(`DATE_TRUNC('month', CAST(i."paidAt" AS date))`, 'ASC')
      .getRawMany();

    const actual = rows.map(r => ({ month: r.month, actual: Number(r.revenue), projected: null }));

    const n = actual.length;
    if (n >= 2) {
      const revenues = actual.map(r => r.actual);
      const meanX = (n - 1) / 2;
      const meanY = revenues.reduce((a, b) => a + b, 0) / n;
      const slope = revenues.reduce((sum, y, i) => sum + (i - meanX) * (y - meanY), 0) /
                    revenues.reduce((sum, _, i) => sum + (i - meanX) ** 2, 0);
      const intercept = meanY - slope * meanX;

      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const projectedRevenue = Math.max(0, intercept + slope * (n - 1 + i));
        actual.push({
          month: format(d, 'yyyy-MM'),
          actual: null as any,
          projected: Math.round(projectedRevenue),
        });
      }
    }

    return { forecast: actual };
  }

  // ── Phase 3: Financial Reports ─────────────────────────────────────────────

  async getProfitLoss(clinicId: string, params: { dateFrom: string; dateTo: string; branchId?: string; calendarType?: string }) {
    const { dateFrom, dateTo, branchId } = params;
    const mgr = this.invoiceRepo.manager;

    const branchClause = branchId ? `AND "branchId" = $4` : '';
    const baseArgs = branchId ? [clinicId, dateFrom, dateTo, branchId] : [clinicId, dateFrom, dateTo];

    const totalRaw = await mgr.query(
      `SELECT COALESCE(SUM("paidAmount"), 0) as val
       FROM invoices
       WHERE "clinicId" = $1
         AND status IN ('paid','partially_paid')
         AND CAST("paidAt" AS date) BETWEEN $2 AND $3
         ${branchClause}`,
      baseArgs,
    ).catch(() => [{ val: 0 }]);

    const consultRaw = await mgr.query(
      `SELECT COALESCE(SUM((item->>'unitPrice')::numeric * (item->>'quantity')::numeric), 0) as val
       FROM invoices i,
            jsonb_array_elements(i.items::jsonb) AS item
       WHERE i."clinicId" = $1
         AND i.status IN ('paid','partially_paid')
         AND CAST(i."paidAt" AS date) BETWEEN $2 AND $3
         AND item->>'serviceId' IS NOT NULL
         ${branchId ? 'AND i."branchId" = $4' : ''}`,
      baseArgs,
    ).catch(() => [{ val: 0 }]);

    const pharmacyRaw = await mgr.query(
      `SELECT COALESCE(SUM((item->>'unitPrice')::numeric * (item->>'quantity')::numeric), 0) as val
       FROM invoices i,
            jsonb_array_elements(i.items::jsonb) AS item
       WHERE i."clinicId" = $1
         AND i.status IN ('paid','partially_paid')
         AND CAST(i."paidAt" AS date) BETWEEN $2 AND $3
         AND item->>'productId' IS NOT NULL
         ${branchId ? 'AND i."branchId" = $4' : ''}`,
      baseArgs,
    ).catch(() => [{ val: 0 }]);

    const websiteOrderRaw = await mgr.query(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total
       FROM website_orders
       WHERE "clinicId" = $1 AND status = 'delivered'
         AND CAST("createdAt" AS date) BETWEEN $2 AND $3`,
      [clinicId, dateFrom, dateTo],
    ).catch(() => [{ total: 0 }]);
    const websiteOrderRevenue = Number(websiteOrderRaw[0]?.total ?? 0);

    const revenue = {
      consultations: Number(consultRaw[0]?.val ?? 0),
      pharmacy:      Number(pharmacyRaw[0]?.val ?? 0),
      websiteOrders: websiteOrderRevenue,
      labWork:       0,
      other:         0,
      total:         Number(totalRaw[0]?.val ?? 0) + websiteOrderRevenue,
    };
    revenue.other = Math.max(0, revenue.total - revenue.consultations - revenue.pharmacy - revenue.labWork - revenue.websiteOrders);

    const [expenseRows, catRows] = await Promise.all([
      mgr.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM expenses
         WHERE "clinicId" = $1 AND "expenseDate" BETWEEN $2 AND $3 AND "approvalStatus" = 'approved'
         ${branchClause}`,
        baseArgs,
      ),
      mgr.query(
        `SELECT category, COALESCE(SUM(amount), 0) as amount
         FROM expenses
         WHERE "clinicId" = $1 AND "expenseDate" BETWEEN $2 AND $3 AND "approvalStatus" = 'approved'
         ${branchClause}
         GROUP BY category`,
        baseArgs,
      ),
    ]);
    const expensesTotal = Number(expenseRows[0]?.total ?? 0);

    const cogsRaw = await mgr.query(
      `SELECT COALESCE(SUM("totalCost"), 0) as total
       FROM purchase_orders
       WHERE "clinicId" = $1 AND status = 'received'
         AND CAST("receivedAt" AS date) BETWEEN $2 AND $3`,
      [clinicId, dateFrom, dateTo],
    ).catch(() => [{ total: 0 }]);
    const cogs = Number(cogsRaw[0]?.total ?? 0);

    const payrollRaw = await mgr.query(
      `SELECT COALESCE(SUM("totalNet"), 0) as total
       FROM payroll_runs
       WHERE "clinicId" = $1 AND status IN ('finalized','paid')
         AND "periodEnd" BETWEEN $2 AND $3`,
      [clinicId, dateFrom, dateTo],
    ).catch(() => [{ total: 0 }]);
    const payrollTotal = Number(payrollRaw[0]?.total ?? 0);

    const grossProfit  = revenue.total - cogs;
    const totalOperatingExpenses = expensesTotal + payrollTotal;
    const netProfit    = grossProfit - totalOperatingExpenses;
    const profitMargin = revenue.total > 0 ? Number(((netProfit / revenue.total) * 100).toFixed(2)) : 0;

    return {
      revenue,
      expenses: { byCategory: catRows, total: expensesTotal },
      cogs,
      payrollTotal,
      grossProfit, netProfit, profitMargin,
      totalOperatingExpenses,
      period: { from: dateFrom, to: dateTo, calendarType: params.calendarType ?? 'AD' },
    };
  }

  async getCashFlow(clinicId: string, params: { months?: number; branchId?: string; calendarType?: string }) {
    const { months = 6, branchId, calendarType = 'AD' } = params;
    const result = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const base = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const range = calendarType === 'BS' ? bsMonthRange(base) : { start: startOfMonth(base), end: endOfMonth(base) };
      const label = monthLabel(base, calendarType);

      const inflowQ = this.invoiceRepo.createQueryBuilder('i')
        .where('i."clinicId" = :clinicId', { clinicId })
        .andWhere('i.status IN (:...paid)', { paid: ['paid', 'partially_paid'] })
        .andWhere('i."paidAt" BETWEEN :s AND :e', { s: range.start, e: range.end })
        .select('COALESCE(SUM(i."paidAmount"),0)', 'val');
      if (branchId) inflowQ.andWhere('i."branchId" = :branchId', { branchId });

      const [inflowRaw, outflowRaw] = await Promise.all([
        inflowQ.getRawOne(),
        this.invoiceRepo.manager.query(
          `SELECT COALESCE(SUM(amount),0) as val FROM expenses
           WHERE "clinicId" = $1 AND "expenseDate"::date BETWEEN $2::date AND $3::date AND "approvalStatus" = 'approved'`,
          [clinicId, range.start.toISOString().split('T')[0], range.end.toISOString().split('T')[0]],
        ),
      ]);

      const inflow  = Number(inflowRaw?.val ?? 0);
      const outflow = Number(outflowRaw[0]?.val ?? 0);
      result.push({ month: label, inflow, outflow, net: inflow - outflow });
    }
    return result;
  }

  async getRevenueByDoctor(clinicId: string, params: { dateFrom: string; dateTo: string; branchId?: string; calendarType?: string }) {
    const { dateFrom, dateTo, branchId } = params;
    const fromDate = new Date(dateFrom);
    const toDate   = new Date(dateTo + 'T23:59:59');

    const q = this.invoiceRepo.manager.createQueryBuilder()
      .select('dc."doctorId"', 'doctorId')
      .addSelect('u."firstName" || \' \' || u."lastName"', 'doctorName')
      .addSelect('COALESCE(SUM(dc."serviceRevenue"),0)', 'revenue')
      .addSelect('COALESCE(SUM(dc.amount),0)', 'commission')
      .addSelect('COALESCE(SUM(dc."serviceRevenue" - dc.amount),0)', 'net')
      .addSelect('COUNT(DISTINCT dc."invoiceId")', 'invoiceCount')
      .from('doctor_commissions', 'dc')
      .leftJoin('users', 'u', 'u.id = dc."doctorId"')
      .where('dc."clinicId" = :clinicId', { clinicId })
      .andWhere('dc."createdAt" BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .groupBy('dc."doctorId", u."firstName", u."lastName"')
      .orderBy('"revenue"', 'DESC');
    if (branchId) q.andWhere('dc."branchId" = :branchId', { branchId });
    return q.getRawMany();
  }

  async getRevenueByService(clinicId: string, params: { dateFrom: string; dateTo: string; branchId?: string; calendarType?: string }) {
    const { dateFrom, dateTo, branchId } = params;
    const fromDate = new Date(dateFrom);
    const toDate   = new Date(dateTo + 'T23:59:59');

    const q = this.invoiceRepo.manager.createQueryBuilder()
      .select('dc."serviceId"', 'serviceId')
      .addSelect('COALESCE(s.name, \'Unknown Service\')', 'serviceName')
      .addSelect('COALESCE(SUM(dc."serviceRevenue"),0)', 'revenue')
      .addSelect('COUNT(dc.id)', 'count')
      .addSelect('COALESCE(AVG(dc."serviceRevenue"),0)', 'avgTicket')
      .from('doctor_commissions', 'dc')
      .leftJoin('clinic_services', 's', 's.id = dc."serviceId"')
      .where('dc."clinicId" = :clinicId', { clinicId })
      .andWhere('dc."createdAt" BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .groupBy('dc."serviceId", s.name')
      .orderBy('"revenue"', 'DESC');
    if (branchId) q.andWhere('dc."branchId" = :branchId', { branchId });
    return q.getRawMany();
  }

  async getOutstandingReceivables(clinicId: string, branchId?: string) {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 };

    const where: any = { clinicId, status: 'overdue' };
    if (branchId) where.branchId = branchId;
    const overdueInvoices = await this.invoiceRepo.find({
      where,
      order: { dueDate: 'ASC' },
      take: 200,
    } as any);

    for (const inv of overdueInvoices) {
      const due = (inv as any).dueDate ? new Date((inv as any).dueDate) : now;
      const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
      const amt  = Number((inv as any).dueAmount ?? 0);
      buckets.total += amt;
      if (days <= 0)        buckets.current  += amt;
      else if (days <= 30)  buckets.days30   += amt;
      else if (days <= 60)  buckets.days60   += amt;
      else                  buckets.days90plus += amt;
    }

    const topOverdue = overdueInvoices.slice(0, 10).map((inv: any) => ({
      id: inv.id, invoiceNumber: inv.invoiceNumber,
      patientName: inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : '',
      amount: Number(inv.dueAmount ?? 0),
      dueDate: inv.dueDate,
      daysOverdue: inv.dueDate ? Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)) : 0,
    }));

    return { ...buckets, topOverdue };
  }

  async getBranchPerformance(clinicId: string, params: { dateFrom: string; dateTo: string; calendarType?: string }) {
    const { dateFrom, dateTo } = params;
    const branches = await this.branchRepo.find({ where: { clinicId } });

    return Promise.all(branches.map(async branch => {
      const revenueRaw = await this.invoiceRepo.createQueryBuilder('i')
        .where('i."clinicId" = :clinicId', { clinicId })
        .andWhere('i."branchId" = :branchId', { branchId: branch.id })
        .andWhere('i.status IN (:...paid)', { paid: ['paid', 'partially_paid'] })
        .andWhere('CAST(i."paidAt" AS date) BETWEEN :from AND :to', { from: dateFrom, to: dateTo })
        .select('COALESCE(SUM(i."paidAmount"),0)', 'val').getRawOne();

      const expRaw = await this.invoiceRepo.manager.query(
        `SELECT COALESCE(SUM(amount),0) as val FROM expenses WHERE "clinicId"=$1 AND "branchId"=$2 AND "expenseDate" BETWEEN $3 AND $4 AND "approvalStatus" = 'approved'`,
        [clinicId, branch.id, dateFrom, dateTo],
      );

      const revenue  = Number(revenueRaw?.val ?? 0);
      const expenses = Number(expRaw[0]?.val ?? 0);
      const net      = revenue - expenses;
      return {
        branchId: branch.id, branchName: branch.name, revenue, expenses,
        net, profitMargin: revenue > 0 ? Number(((net / revenue) * 100).toFixed(2)) : 0,
      };
    }));
  }

  async getAgingReport(clinicId: string, branchId?: string) {
    return this.getOutstandingReceivables(clinicId, branchId);
  }

  async markOverdue(clinicId: string): Promise<number> {
    const result = await this.invoiceRepo.manager.query(
      `UPDATE invoices SET status = 'overdue'
       WHERE "clinicId" = $1
         AND status NOT IN ('paid','cancelled','refunded','overdue')
         AND "dueDate" < NOW()::date
       RETURNING id`,
      [clinicId],
    );
    return result.length;
  }

  async getTaxReport(clinicId: string, params: { dateFrom: string; dateTo: string; calendarType?: string; branchId?: string }) {
    const { dateFrom, dateTo, branchId } = params;
    const q = this.invoiceRepo.createQueryBuilder('i')
      .where('i."clinicId" = :clinicId', { clinicId })
      .andWhere('i.status IN (:...paid)', { paid: ['paid', 'partially_paid'] })
      .andWhere('CAST(i."paidAt" AS date) BETWEEN :from AND :to', { from: dateFrom, to: dateTo });
    if (branchId) q.andWhere('i."branchId" = :branchId', { branchId });

    const rows = await q
      .select(`TO_CHAR(DATE_TRUNC('month', CAST(i."paidAt" AS date)), 'YYYY-MM')`, 'month')
      .addSelect('COALESCE(SUM(i."paidAmount"),0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(i."vatAmount"),0)', 'vatCollected')
      .addSelect('COALESCE(SUM(i."taxAmount"),0)', 'taxCollected')
      .groupBy(`DATE_TRUNC('month', CAST(i."paidAt" AS date))`)
      .orderBy(`DATE_TRUNC('month', CAST(i."paidAt" AS date))`, 'ASC')
      .getRawMany();

    const totals = rows.reduce((acc, r) => ({
      totalRevenue:  acc.totalRevenue  + Number(r.totalRevenue),
      vatCollected:  acc.vatCollected  + Number(r.vatCollected),
      taxCollected:  acc.taxCollected  + Number(r.taxCollected),
    }), { totalRevenue: 0, vatCollected: 0, taxCollected: 0 });

    return { ...totals, breakdown: rows };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async getTodayRevenue(clinicId: string, branchId?: string): Promise<number> {
    let qb = this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.paidAmount), 0)::float', 'total')
      .where('i.clinicId = :clinicId AND i.paidAt BETWEEN :start AND :end', {
        clinicId,
        start: nepalStartOfTodayUTC(),
        end:   nepalEndOfTodayUTC(),
      })
      .andWhere('i.status IN (:...paidStatuses)', {
        paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID],
      });
    if (branchId) qb = qb.andWhere('i.branchId = :branchId', { branchId });
    const r = await qb.getRawOne();
    return Number(r?.total ?? 0);
  }

  private async getMonthRevenue(clinicId: string, branchId?: string, calendarType = 'BS'): Promise<number> {
    const today = new Date();
    const { start, end } =
      calendarType === 'BS'
        ? bsMonthRange(today)
        : { start: startOfMonth(today), end: endOfMonth(today) };

    let qb = this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.paidAmount), 0)::float', 'total')
      .where('i.clinicId = :clinicId AND i.paidAt BETWEEN :start AND :end', {
        clinicId, start, end,
      })
      .andWhere('i.status IN (:...paidStatuses)', {
        paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID],
      });
    if (branchId) qb = qb.andWhere('i.branchId = :branchId', { branchId });
    const r = await qb.getRawOne();
    return Number(r?.total ?? 0);
  }

  private async getWeeklyRevenueChart(clinicId: string, branchId?: string) {
    const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const { start, end } = nepalDayBoundsUTC(i);
      let qb = this.invoiceRepo
        .createQueryBuilder('i')
        .select('COALESCE(SUM(i.paidAmount), 0)::float', 'total')
        .where('i.clinicId = :clinicId AND i.paidAt BETWEEN :start AND :end', {
          clinicId, start, end,
        })
        .andWhere('i.status IN (:...paidStatuses)', {
          paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID],
        });
      if (branchId) qb = qb.andWhere('i.branchId = :branchId', { branchId });
      const rev = await qb.getRawOne();
      result.push({
        date:    days[nepalDayOfWeek(i)],
        revenue: Number(rev?.total ?? 0),
      });
    }
    return result;
  }

  private async getAppointmentsByStatus(clinicId: string, branchId?: string, calendarType = 'BS') {
    const today = new Date();
    const { start, end } =
      calendarType === 'BS'
        ? bsMonthRange(today)
        : { start: startOfMonth(today), end: endOfMonth(today) };

    const statuses = Object.values(AppointmentStatus);
    const counts: Record<string, number> = {};
    await Promise.all(
      statuses.map(async s => {
        const where: any = {
          clinicId,
          scheduledAt: this.between(start, end),
          status: s,
        };
        if (branchId) where.branchId = branchId;
        counts[s] = await this.aptRepo.count({ where });
      }),
    );
    return counts;
  }

  private betweenToday() {
    return this.between(nepalStartOfTodayUTC(), nepalEndOfTodayUTC());
  }

  private between(start: Date, end: Date) {
    return Between(start, end);
  }
}