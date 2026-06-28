import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { ShiftResolver }  from '../shifts/shift-resolver.service';
import { AssignmentType } from '../shifts/entities/shift-assignment.entity';
import { Shift }          from '../shifts/entities/shift.entity';
import { User }           from '../users/entities/user.entity';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function computeLateMinutes(checkIn: Date, shift: Shift): number {
  const deadline  = timeToMinutes(shift.startTime) + shift.graceMinutes;
  const checkedIn = checkIn.getHours() * 60 + checkIn.getMinutes();
  return Math.max(0, checkedIn - deadline);
}

function deriveStatus(lateMinutes: number, hoursWorked: number, shift: Shift | null): AttendanceStatus {
  if (!shift) return AttendanceStatus.PRESENT;
  const minHours = Number(shift.minHoursForPresent);
  if (hoursWorked < minHours / 2) return AttendanceStatus.HALF_DAY;
  if (hoursWorked < minHours)     return AttendanceStatus.HALF_DAY;
  if (lateMinutes > 0)            return AttendanceStatus.LATE;
  return AttendanceStatus.PRESENT;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private repo:     Repository<Attendance>,
    @InjectRepository(User)       private userRepo: Repository<User>,
    private readonly shiftResolver: ShiftResolver,
  ) {}

  async checkIn(clinicId: string, userId: string, branchId?: string): Promise<Attendance> {
    const today    = new Date().toISOString().slice(0, 10);
    const existing = await this.repo.findOne({ where: { clinicId, userId, date: today } });
    if (existing?.checkIn) throw new BadRequestException('Already checked in today');

    const resolved = await this.shiftResolver.resolveUserShift(userId, clinicId, today);
    if (resolved.type === 'off')
      throw new BadRequestException('You are not scheduled to work today (OFF)');
    if (resolved.type === AssignmentType.LEAVE)
      throw new BadRequestException('You are on approved leave today');

    const now = new Date();
    const shift = resolved.shift;
    const lateMinutes = shift ? computeLateMinutes(now, shift) : 0;
    const status = lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    if (existing) {
      Object.assign(existing, { checkIn: now, shiftId: shift?.id ?? null, lateMinutes, status, isAutoMarked: false });
      return this.repo.save(existing);
    }

    return this.repo.save(this.repo.create({
      clinicId, userId, branchId, date: today,
      checkIn: now, shiftId: shift?.id ?? null, lateMinutes, status, isAutoMarked: false,
    }));
  }

  async checkOut(clinicId: string, userId: string): Promise<Attendance> {
    const today  = new Date().toISOString().slice(0, 10);
    const record = await this.repo.findOne({ where: { clinicId, userId, date: today }, relations: ['shift'] });
    if (!record)         throw new NotFoundException('No attendance record found for today');
    if (!record.checkIn) throw new BadRequestException('You have not checked in yet');
    if (record.checkOut) throw new BadRequestException('Already checked out');

    record.checkOut    = new Date();
    const ms           = record.checkOut.getTime() - record.checkIn.getTime();
    record.hoursWorked = parseFloat((ms / 3600000).toFixed(2));
    record.status      = deriveStatus(record.lateMinutes ?? 0, record.hoursWorked, record.shift ?? null);
    return this.repo.save(record);
  }

  async getTodayStatus(clinicId: string, userId: string) {
    const today         = new Date().toISOString().slice(0, 10);
    const attendance    = await this.repo.findOne({ where: { clinicId, userId, date: today }, relations: ['shift'] });
    const resolvedShift = await this.shiftResolver.resolveUserShift(userId, clinicId, today);
    return { attendance, resolvedShift };
  }

  async findAll(clinicId: string, query: any) {
    const { page = 1, limit = 50, userId, branchId, startDate, endDate, date, status } = query;
    const effectiveStart = date || startDate;
    const effectiveEnd   = date || endDate;

    let qb = this.repo.createQueryBuilder('a')
      .leftJoinAndSelect('a.user',  'user')
      .leftJoinAndSelect('a.shift', 'shift')
      .where('a.clinicId = :clinicId', { clinicId });

    if (userId)         qb = qb.andWhere('a.userId = :userId', { userId });
    if (branchId)       qb = qb.andWhere('a.branchId = :branchId', { branchId });
    if (effectiveStart) qb = qb.andWhere('a.date >= :startDate', { startDate: effectiveStart });
    if (effectiveEnd)   qb = qb.andWhere('a.date <= :endDate',   { endDate: effectiveEnd });
    if (status)         qb = qb.andWhere('a.status = :status', { status });

    qb = qb.orderBy('a.date', 'DESC').addOrderBy('a.checkIn', 'DESC');
    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async getMonthlySummary(clinicId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate   = new Date(year, month, 0).toISOString().slice(0, 10);
    const records   = await this.repo.find({
      where: { clinicId, date: Between(startDate, endDate) as any },
      relations: ['user'],
    });
    const summary: Record<string, any> = {};
    for (const r of records) {
      if (!summary[r.userId]) {
        summary[r.userId] = {
          user: r.user, present: 0, absent: 0, late: 0,
          halfDay: 0, leave: 0, off: 0, totalHours: 0, totalLateMinutes: 0,
        };
      }
      const s = summary[r.userId];
      s.totalHours       += Number(r.hoursWorked || 0);
      s.totalLateMinutes += Number(r.lateMinutes || 0);
      if (r.status === AttendanceStatus.HALF_DAY) s.halfDay++;
      else s[r.status]++;
    }
    return Object.values(summary);
  }

  async adminOverride(clinicId: string, id: string, dto: any): Promise<Attendance> {
    const record = await this.repo.findOne({ where: { id, clinicId } });
    if (!record) throw new NotFoundException('Attendance record not found');
    Object.assign(record, dto);
    return this.repo.save(record);
  }

  @Cron('0 23 * * *')
  async autoMarkAbsent(): Promise<void> {
    const today    = new Date().toISOString().slice(0, 10);
    const allUsers = await this.userRepo.find({ where: { isActive: true }, select: ['id', 'clinicId'] });

    for (const u of allUsers) {
      if (!u.clinicId) continue;
      const resolved = await this.shiftResolver.resolveUserShift(u.id, u.clinicId, today);
      if (resolved.type === 'off' || resolved.type === AssignmentType.LEAVE) continue;

      const existing = await this.repo.findOne({ where: { clinicId: u.clinicId, userId: u.id, date: today } });
      if (existing?.checkIn) continue;

      const payload = { status: AttendanceStatus.ABSENT, isAutoMarked: true, shiftId: resolved.shift?.id ?? null };
      if (existing) {
        await this.repo.save(Object.assign(existing, payload));
      } else {
        await this.repo.save(this.repo.create({ clinicId: u.clinicId, userId: u.id, date: today, ...payload }));
      }
    }
  }
}
