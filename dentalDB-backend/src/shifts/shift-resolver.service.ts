import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftAssignment, AssignmentType } from './entities/shift-assignment.entity';
import { ShiftPattern }    from './entities/shift-pattern.entity';
import { Shift }           from './entities/shift.entity';

export interface ResolvedShift {
  shift:   Shift | null;
  source:  'assignment' | 'pattern' | 'none';
  type:    AssignmentType | 'working' | 'off';
  assignmentId?: string;
  patternId?:    string;
}

/**
 * Resolves what shift (if any) a user is supposed to work on a given date.
 *
 * Priority:
 *   1. ShiftAssignment  (date-specific override / leave / off)
 *   2. ShiftPattern     (weekly standing schedule)
 *   3. none             (no schedule defined → treat as OFF)
 */
@Injectable()
export class ShiftResolver {
  constructor(
    @InjectRepository(ShiftAssignment) private assignRepo: Repository<ShiftAssignment>,
    @InjectRepository(ShiftPattern)    private patternRepo: Repository<ShiftPattern>,
  ) {}

  async resolveUserShift(
    userId:   string,
    clinicId: string,
    date:     string,           // YYYY-MM-DD
  ): Promise<ResolvedShift> {

    // ── 1. Check date-specific assignment ─────────────────────────────────────
    const assignment = await this.assignRepo.findOne({
      where: { clinicId, userId, date },
      relations: ['shift'],
    });

    if (assignment) {
      return {
        shift:        assignment.shift ?? null,
        source:       'assignment',
        type:         assignment.type === AssignmentType.OVERRIDE ? 'working' : assignment.type,
        assignmentId: assignment.id,
      };
    }

    // ── 2. Check weekly pattern ────────────────────────────────────────────────
    const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay(); // UTC noon avoids DST issues

    const pattern = await this.patternRepo.findOne({
      where: { clinicId, userId, dayOfWeek },
      relations: ['shift'],
    });

    if (pattern) {
      return {
        shift:     pattern.shiftId ? pattern.shift : null,
        source:    'pattern',
        type:      pattern.shiftId ? 'working' : 'off',
        patternId: pattern.id,
      };
    }

    // ── 3. No schedule defined ─────────────────────────────────────────────────
    return { shift: null, source: 'none', type: 'off' };
  }

  /** Batch-resolve for a list of userIds on the same date (used by cron) */
  async resolveMany(
    userIds:  string[],
    clinicId: string,
    date:     string,
  ): Promise<Map<string, ResolvedShift>> {
    const result = new Map<string, ResolvedShift>();
    await Promise.all(
      userIds.map(async uid => {
        result.set(uid, await this.resolveUserShift(uid, clinicId, date));
      }),
    );
    return result;
  }

  /** True if this clinic has configured any shift patterns or assignments at all (i.e. is actually using the Shift Module). */
  async hasAnyShiftConfig(clinicId: string): Promise<boolean> {
    const [patternCount, assignmentCount] = await Promise.all([
      this.patternRepo.count({ where: { clinicId } }),
      this.assignRepo.count({ where: { clinicId } }),
    ]);
    return patternCount > 0 || assignmentCount > 0;
  }

  /** Is this user currently within their resolved shift's working hours, in Nepal clinic-local time? */
  isWithinShiftHours(shift: ResolvedShift, nowHHMM: string): boolean {
    if (shift.type !== 'working' || !shift.shift) return false;
    const { startTime, endTime } = shift.shift;
    // Handle overnight shifts (e.g. 20:00–04:00) where endTime < startTime
    if (endTime < startTime) {
      return nowHHMM >= startTime || nowHHMM <= endTime;
    }
    return nowHHMM >= startTime && nowHHMM <= endTime;
  }
}
