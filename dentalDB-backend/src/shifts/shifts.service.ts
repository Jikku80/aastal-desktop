import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift }           from './entities/shift.entity';
import { ShiftPattern }    from './entities/shift-pattern.entity';
import { ShiftAssignment, AssignmentType } from './entities/shift-assignment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType }     from '../notifications/entities/notification.entity';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)           private shiftRepo:      Repository<Shift>,
    @InjectRepository(ShiftPattern)    private patternRepo:    Repository<ShiftPattern>,
    @InjectRepository(ShiftAssignment) private assignmentRepo: Repository<ShiftAssignment>,
    private readonly notifications: NotificationsService,
    private readonly gateway:       NotificationsGateway,
  ) {}

  private async notifyUser(clinicId: string, userId: string, title: string, body: string) {
    try {
      const n = await this.notifications.create({
        clinicId, userId,
        type: NotificationType.SCHEDULE_UPDATED,
        title, body,
        link: '/dashboard/attendance',
      });
      this.gateway.emitToUser(userId, 'notification', n);
    } catch { /* non-critical */ }
  }

  // ─── Shifts CRUD ────────────────────────────────────────────────────────────

  async createShift(clinicId: string, dto: {
    name: string; startTime: string; endTime: string;
    graceMinutes?: number; minHoursForPresent?: number;
  }): Promise<Shift> {
    const existing = await this.shiftRepo.findOne({ where: { clinicId, name: dto.name } });
    if (existing) throw new ConflictException(`Shift "${dto.name}" already exists`);
    return this.shiftRepo.save(this.shiftRepo.create({ ...dto, clinicId }));
  }

  async findAllShifts(clinicId: string): Promise<Shift[]> {
    return this.shiftRepo.find({ where: { clinicId, isActive: true }, order: { startTime: 'ASC' } });
  }

  async findOneShift(clinicId: string, id: string): Promise<Shift> {
    const s = await this.shiftRepo.findOne({ where: { id, clinicId } });
    if (!s) throw new NotFoundException('Shift not found');
    return s;
  }

  async updateShift(clinicId: string, id: string, dto: Partial<Shift>): Promise<Shift> {
    await this.findOneShift(clinicId, id);
    await this.shiftRepo.update({ id, clinicId }, dto as any);
    return this.findOneShift(clinicId, id);
  }

  async deleteShift(clinicId: string, id: string): Promise<void> {
    await this.findOneShift(clinicId, id);
    await this.shiftRepo.update({ id, clinicId }, { isActive: false });
  }

  // ─── Shift Patterns ─────────────────────────────────────────────────────────

  async upsertPattern(clinicId: string, dto: {
    userId: string; branchId?: string; dayOfWeek: number; shiftId?: string;
  }): Promise<ShiftPattern> {
    const existing = await this.patternRepo.findOne({
      where: { clinicId, userId: dto.userId, dayOfWeek: dto.dayOfWeek },
    });

    let saved: ShiftPattern;
    if (existing) {
      await this.patternRepo.update(existing.id, { shiftId: dto.shiftId ?? null, branchId: dto.branchId });
      saved = await this.patternRepo.findOne({ where: { id: existing.id }, relations: ['shift','user'] });
    } else {
      saved = await this.patternRepo.save(this.patternRepo.create({ ...dto, clinicId }));
      saved = await this.patternRepo.findOne({ where: { id: saved.id }, relations: ['shift','user'] });
    }

    // In-app notification to the affected user
    if (dto.shiftId) {
      const shift = await this.shiftRepo.findOne({ where: { id: dto.shiftId } });
      const day   = DAY_NAMES[dto.dayOfWeek];
      await this.notifyUser(
        clinicId, dto.userId,
        'Schedule Updated',
        `Your ${day} shift has been set to ${shift?.name ?? 'a new shift'} (${shift?.startTime}–${shift?.endTime}).`,
      );
    } else {
      const day = DAY_NAMES[dto.dayOfWeek];
      await this.notifyUser(clinicId, dto.userId, 'Schedule Updated', `${day} has been marked as your day off.`);
    }

    return saved;
  }

  async getUserPatterns(clinicId: string, userId: string): Promise<ShiftPattern[]> {
    return this.patternRepo.find({
      where: { clinicId, userId },
      relations: ['shift'],
      order: { dayOfWeek: 'ASC' },
    });
  }

  async deletePattern(clinicId: string, id: string): Promise<void> {
    const p = await this.patternRepo.findOne({ where: { id, clinicId } });
    if (!p) throw new NotFoundException('Pattern not found');
    await this.patternRepo.delete(id);
    await this.notifyUser(clinicId, p.userId, 'Schedule Updated', `Your ${DAY_NAMES[p.dayOfWeek]} schedule has been cleared.`);
  }

  async getWeeklySchedule(clinicId: string, userId: string): Promise<{
    dayOfWeek: number; day: string; pattern: ShiftPattern | null;
  }[]> {
    const patterns   = await this.getUserPatterns(clinicId, userId);
    const patternMap = new Map(patterns.map(p => [p.dayOfWeek, p]));
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      day:       DAY_NAMES[i],
      pattern:   patternMap.get(i) ?? null,
    }));
  }

  // ─── Shift Assignments ──────────────────────────────────────────────────────

  async upsertAssignment(clinicId: string, dto: {
    userId: string; date: string; shiftId?: string;
    type?: AssignmentType; note?: string; leaveId?: string; branchId?: string;
  }): Promise<ShiftAssignment> {
    const existing = await this.assignmentRepo.findOne({
      where: { clinicId, userId: dto.userId, date: dto.date },
    });

    const type = dto.type ?? AssignmentType.OVERRIDE;
    let saved: ShiftAssignment;

    if (existing) {
      await this.assignmentRepo.update(existing.id, { shiftId: dto.shiftId ?? null, type, note: dto.note, leaveId: dto.leaveId });
      saved = await this.assignmentRepo.findOne({ where: { id: existing.id }, relations: ['shift','user'] });
    } else {
      const rec = this.assignmentRepo.create({ ...dto, clinicId, type });
      saved     = await this.assignmentRepo.save(rec);
      saved     = await this.assignmentRepo.findOne({ where: { id: saved.id }, relations: ['shift','user'] });
    }

    // Notify the user about the override
    const dateLabel = new Date(dto.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
    if (type === AssignmentType.OVERRIDE && dto.shiftId) {
      const shift = await this.shiftRepo.findOne({ where: { id: dto.shiftId } });
      await this.notifyUser(
        clinicId, dto.userId,
        'Schedule Override',
        `Your shift on ${dateLabel} has been changed to ${shift?.name ?? 'a new shift'} (${shift?.startTime}–${shift?.endTime}).`,
      );
    } else if (type === 'off' as any) {
      await this.notifyUser(clinicId, dto.userId, 'Day Off Assigned', `${dateLabel} has been marked as your day off.`);
    } else if (type === AssignmentType.LEAVE) {
      await this.notifyUser(clinicId, dto.userId, 'Leave Recorded', `${dateLabel} has been recorded as leave.`);
    }

    return saved;
  }

  async getUserAssignments(clinicId: string, userId: string, startDate: string, endDate: string): Promise<ShiftAssignment[]> {
    return this.assignmentRepo
      .createQueryBuilder('sa')
      .leftJoinAndSelect('sa.shift', 'shift')
      .where('sa.clinicId = :clinicId', { clinicId })
      .andWhere('sa.userId = :userId', { userId })
      .andWhere('sa.date >= :startDate', { startDate })
      .andWhere('sa.date <= :endDate', { endDate })
      .orderBy('sa.date', 'ASC')
      .getMany();
  }

  async deleteAssignment(clinicId: string, id: string): Promise<void> {
    const a = await this.assignmentRepo.findOne({ where: { id, clinicId } });
    if (!a) throw new NotFoundException('Assignment not found');
    await this.assignmentRepo.delete(id);
    await this.notifyUser(clinicId, a.userId, 'Schedule Override Removed', `The override for ${a.date} has been removed. Your regular schedule applies.`);
  }
}
