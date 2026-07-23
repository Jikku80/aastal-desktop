import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorCommission } from './entities/commission.entity';
// @ts-ignore — nepali-date-converter has no bundled types
import NepaliDate from 'nepali-date-converter';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// ── BS calendar helpers (same as analytics.service.ts) ───────────────────────

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

/** Short label for chart X-axis: "Baisakh 2082" or "Apr 2025" */
function monthLabel(adDate: Date, calendarType: string): string {
  if (calendarType === 'BS') {
    const { year, month } = adToBS(adDate);
    return `${BS_MONTHS[month]} ${year}`;
  }
  return format(adDate, 'MMM yyyy');
}

/**
 * Returns the 6-month window as an array of { start, end, label } objects,
 * oldest first, using BS or AD month boundaries.
 */
function buildMonthBuckets(
  calendarType: string,
): Array<{ start: Date; end: Date; label: string }> {
  const buckets: Array<{ start: Date; end: Date; label: string }> = [];

  if (calendarType === 'BS') {
    const { year, month } = adToBS(new Date());
    for (let i = 5; i >= 0; i--) {
      let y = year;
      let m = month - i;
      while (m < 0)  { y--; m += 12; }
      while (m > 11) { y++; m -= 12; }
      const days = getDaysInBSMonth(y, m);
      const start = bsToAD(y, m, 1);
      const end   = bsToAD(y, m, days);
      buckets.push({ start, end, label: `${BS_MONTHS[m]} ${y}` });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      buckets.push({
        start: startOfMonth(month),
        end:   endOfMonth(month),
        label: format(month, 'MMM yyyy'),
      });
    }
  }

  return buckets;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(DoctorCommission) private repo: Repository<DoctorCommission>,
  ) {}

  async deleteByInvoice(clinicId: string, invoiceId: string): Promise<void> {
    await this.repo.delete({ clinicId, invoiceId });
  }

  async createForInvoice(
    clinicId: string,
    invoiceId: string,
    items: Array<{
      serviceId?: string;
      productId?: string;
      doctorId?: string;
      total: number;
      commissionPercentage?: number;
    }>,
  ): Promise<void> {
    await this.repo.delete({ clinicId, invoiceId });

    const toInsert: Partial<DoctorCommission>[] = [];

    for (const item of items) {
      if (!item.serviceId || !item.doctorId) continue;

      const amount = (Number(item.total) * Number(item.commissionPercentage ?? 0)) / 100;
      if (amount <= 0) continue;

      toInsert.push({
        clinicId,
        invoiceId,
        doctorId: item.doctorId,
        serviceId: item.serviceId,
        amount,
        serviceRevenue: Number(item.total),
        commissionPercentage: Number(item.commissionPercentage),
      });
    }

    if (toInsert.length > 0) {
      await this.repo.save(this.repo.create(toInsert as any[]));
    }
  }

  async getSummary(clinicId: string, query?: any) {
    const { startDate, endDate, doctorId, branchId } = query || {};

    let qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.doctor', 'doctor')
      .leftJoinAndSelect('c.service', 'service')
      .where('c.clinicId = :clinicId', { clinicId });

    if (doctorId)  qb = qb.andWhere('c.doctorId = :doctorId', { doctorId });
    if (startDate) qb = qb.andWhere('c.createdAt >= :startDate', { startDate });
    if (endDate)   qb = qb.andWhere('c.createdAt <= :endDate',   { endDate });
    // DoctorCommission has no branchId column of its own — commissions are
    // scoped to a branch through the invoice that generated them.
    if (branchId) {
      qb = qb
        .innerJoin('c.invoice', 'invoice')
        .andWhere('invoice.branchId = :branchId', { branchId });
    }

    const commissions = await qb.orderBy('c.createdAt', 'DESC').getMany();

    const byDoctor: Record<string, any> = {};
    for (const c of commissions) {
      if (!byDoctor[c.doctorId]) {
        byDoctor[c.doctorId] = {
          doctorId: c.doctorId,
          doctor: c.doctor,
          totalServiceRevenue: 0,
          totalCommission: 0,
          byService: {} as Record<string, any>,
        };
      }
      const d = byDoctor[c.doctorId];
      d.totalServiceRevenue += Number(c.serviceRevenue);
      d.totalCommission     += Number(c.amount);

      const svcKey = c.serviceId || 'unknown';
      if (!d.byService[svcKey]) {
        d.byService[svcKey] = {
          serviceId: c.serviceId,
          service: c.service,
          revenue: 0,
          commission: 0,
        };
      }
      d.byService[svcKey].revenue    += Number(c.serviceRevenue);
      d.byService[svcKey].commission += Number(c.amount);
    }

    const doctors = Object.values(byDoctor).map((d: any) => ({
      ...d,
      byService: Object.values(d.byService),
    }));

    const totals = {
      totalServiceRevenue: doctors.reduce((s, d) => s + d.totalServiceRevenue, 0),
      totalCommission:     doctors.reduce((s, d) => s + d.totalCommission, 0),
    };

    return { doctors, totals };
  }

  async getMonthlyChart(clinicId: string, query?: any) {
    const { doctorId, calendarType = 'BS', branchId } = query || {};

    // Build the 6 month buckets in the correct calendar
    const buckets = buildMonthBuckets(calendarType);

    const rows = await Promise.all(
      buckets.map(async ({ start, end, label }) => {
        let qb = this.repo
          .createQueryBuilder('c')
          .select('COALESCE(SUM(c.amount), 0)::float', 'commission')
          .addSelect('COALESCE(SUM(c.serviceRevenue), 0)::float', 'revenue')
          .where('c.clinicId = :clinicId', { clinicId })
          .andWhere('c.createdAt >= :start AND c.createdAt <= :end', { start, end });

        if (doctorId) qb = qb.andWhere('c.doctorId = :doctorId', { doctorId });
        if (branchId) {
          qb = qb
            .innerJoin('c.invoice', 'invoice')
            .andWhere('invoice.branchId = :branchId', { branchId });
        }

        const raw = await qb.getRawOne();
        return {
          month:      label,
          commission: Number(raw?.commission ?? 0),
          revenue:    Number(raw?.revenue    ?? 0),
        };
      }),
    );

    return rows;
  }
}