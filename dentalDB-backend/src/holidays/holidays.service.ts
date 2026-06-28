import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Holiday } from './entities/holiday.entity';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { UserRole as UserRoleAssignment } from '../rbac/entities/user-role.entity';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday) private repo:       Repository<Holiday>,
    @InjectRepository(User)    private userRepo:    Repository<User>,
    @InjectRepository(Branch)  private branchRepo:  Repository<Branch>,
    @InjectRepository(UserRoleAssignment) private userRoleRepo: Repository<UserRoleAssignment>,
    private auditService:          AuditService,
    private notificationsService:  NotificationsService,
    private notificationsGateway:  NotificationsGateway,
  ) {}

  private fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Resolve effective branchIds from dto */
  private resolvebranchIds(dto: CreateHolidayDto | UpdateHolidayDto): string[] | null {
    if (dto.isClinicWide || dto.isTeamMemberSpecific || dto.isRoleSpecific) return null;
    if ((dto as any).branchIds?.length) return (dto as any).branchIds;
    if (dto.branchId) return [dto.branchId];
    return [];
  }

  async create(clinicId: string, userId: string, dto: CreateHolidayDto): Promise<Holiday> {
    const isTeamMemberSpecific = dto.isTeamMemberSpecific === true;
    const isRoleSpecific       = dto.isRoleSpecific === true;
    const effectiveBranchIds   = this.resolvebranchIds(dto);
    const primaryBranchId      = effectiveBranchIds?.[0] ?? null;
    const targetUserIds        = isTeamMemberSpecific ? (dto.targetUserIds ?? []) : [];
    const targetRoles          = isRoleSpecific ? (dto.targetRoles ?? []) : [];

    const holiday = this.repo.create({
      clinicId,
      name:                 dto.name,
      date:                 dto.date,
      endDate:              dto.endDate,
      description:          dto.description,
      isClinicWide:         dto.isClinicWide ?? (!isTeamMemberSpecific && !isRoleSpecific && !effectiveBranchIds?.length),
      isTeamMemberSpecific,
      isRoleSpecific,
      branchId:             isTeamMemberSpecific || isRoleSpecific || dto.isClinicWide ? null : primaryBranchId,
      branchIds:            isTeamMemberSpecific || isRoleSpecific || dto.isClinicWide ? null : effectiveBranchIds,
      targetUserIds,
      targetRoles,
    });
    const saved = await this.repo.save(holiday);

    // Audit
    setImmediate(() => this.auditService.log({
      clinicId, userId,
      action:     AuditAction.CREATED,
      entityType: AuditEntityType.HOLIDAY,
      entityId:   saved.id,
      changes:    { after: this.auditService.sanitize({ ...dto }) },
    }));

    // Fire notifications
    setImmediate(() => this.notifyHolidayUsers(saved).catch(() => {}));

    return saved;
  }

  async findAll(clinicId: string, branchId?: string, userId?: string, userBuiltInRole?: string): Promise<Holiday[]> {
    const qb = this.repo.createQueryBuilder('h')
      .leftJoinAndSelect('h.branch', 'branch')
      .where('h.clinicId = :clinicId', { clinicId })
      .orderBy('h.date', 'ASC');
    // NOTE: previously used a raw `h.branchIds::jsonb @> :branchIdJson`
    // Postgres-only JSON containment operator here. branchIds is now stored
    // as `simple-json` (portable across postgres/sqlite — see holiday.entity.ts),
    // which has no native JSON query operators on either driver, so the
    // branchIds membership check happens in JS below instead of in SQL.
    if (branchId) {
      qb.andWhere(
        '(h.isClinicWide = true OR h.isTeamMemberSpecific = true OR h.isRoleSpecific = true OR h.branchId = :branchId)',
        { branchId },
      );
    }
    const all = (await qb.getMany()).filter(
      (h) => !branchId || h.isClinicWide || h.isTeamMemberSpecific || h.isRoleSpecific
        || h.branchId === branchId || (h.branchIds ?? []).includes(branchId),
    );

    // No specific user context (e.g. admin "all holidays" view) — return everything matching the branch filter.
    if (!userId) return all;

    let customRoleIds: string[] = [];
    if (all.some(h => h.isRoleSpecific)) {
      const assignments = await this.userRoleRepo.find({ where: { userId } });
      customRoleIds = assignments.map(a => a.roleId);
    }

    return all.filter(h => {
      if (h.isTeamMemberSpecific) return (h.targetUserIds || []).includes(userId);
      if (h.isRoleSpecific) {
        const roles = h.targetRoles || [];
        return (userBuiltInRole && roles.includes(userBuiltInRole)) || customRoleIds.some(id => roles.includes(id));
      }
      return true; // clinic-wide or branch-matched
    });
  }

  async findOne(clinicId: string, id: string): Promise<Holiday> {
    const h = await this.repo.findOne({ where: { id, clinicId }, relations: ['branch'] });
    if (!h) throw new NotFoundException('Holiday not found');
    return h;
  }

  async update(clinicId: string, id: string, userId: string, dto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findOne(clinicId, id);
    const before  = { ...holiday };

    const isTeamMemberSpecific = dto.isTeamMemberSpecific ?? holiday.isTeamMemberSpecific;
    const isRoleSpecific       = dto.isRoleSpecific ?? holiday.isRoleSpecific;
    const effectiveBranchIds   = this.resolvebranchIds(dto);
    const primaryBranchId      = effectiveBranchIds?.[0] ?? null;
    const targetUserIds        = isTeamMemberSpecific
      ? (dto.targetUserIds ?? holiday.targetUserIds ?? [])
      : [];
    const targetRoles          = isRoleSpecific
      ? (dto.targetRoles ?? holiday.targetRoles ?? [])
      : [];

    Object.assign(holiday, {
      ...dto,
      isTeamMemberSpecific,
      isRoleSpecific,
      targetUserIds,
      targetRoles,
      branchId:  (dto.isClinicWide || isTeamMemberSpecific || isRoleSpecific) ? null : (primaryBranchId ?? holiday.branchId),
      branchIds: (dto.isClinicWide || isTeamMemberSpecific || isRoleSpecific) ? null : (effectiveBranchIds ?? holiday.branchIds),
    });
    const saved = await this.repo.save(holiday);

    setImmediate(() => this.auditService.log({
      clinicId, userId,
      action:     AuditAction.UPDATED,
      entityType: AuditEntityType.HOLIDAY,
      entityId:   id,
      changes:    this.auditService.diff(
        this.auditService.sanitize(before),
        this.auditService.sanitize({ ...saved }),
      ),
    }));

    return saved;
  }

  async remove(clinicId: string, id: string, userId: string): Promise<void> {
    const holiday = await this.findOne(clinicId, id);
    setImmediate(() => this.auditService.log({
      clinicId, userId,
      action:     AuditAction.DELETED,
      entityType: AuditEntityType.HOLIDAY,
      entityId:   id,
      changes:    { before: this.auditService.sanitize({ ...holiday }) },
    }));
    await this.repo.remove(holiday);
  }

  // ── Notification helpers ──────────────────────────────────────────────────

  private async notifyHolidayUsers(saved: Holiday): Promise<void> {
    const dateStr = saved.endDate && saved.endDate !== saved.date
      ? `${this.fmtDate(saved.date)} – ${this.fmtDate(saved.endDate)}`
      : this.fmtDate(saved.date);

    const notifBase = {
      type:     NotificationType.HOLIDAY_CREATED,
      title:    `Holiday: ${saved.name}`,
      link:     '/dashboard/holidays',
      entityId: saved.id,
    };

    if (saved.isClinicWide) {
      // ── Clinic-wide: notify ALL active staff in this clinic ──────────────
      const allStaff = await this.userRepo.find({
        where: { clinicId: saved.clinicId, isActive: true },
      });

      for (const user of allStaff) {
        try {
          const notif = await this.notificationsService.create({
            ...notifBase,
            clinicId: saved.clinicId,
            userId:   user.id,
            branchId: null,
            body:     `${dateStr} · Clinic-wide`,
          });
          this.notificationsGateway.emitToClinic(saved.clinicId, 'notification', {
            ...notif,
            event: 'holiday_created',
          });
        } catch { /* non-critical */ }
      }

    } else if (saved.isTeamMemberSpecific && saved.targetUserIds?.length) {
      // ── Team-member specific: notify only selected users ─────────────────
      const targetUsers = await this.userRepo.find({
        where: { id: In(saved.targetUserIds), clinicId: saved.clinicId },
      });

      for (const user of targetUsers) {
        try {
          const notif = await this.notificationsService.create({
            ...notifBase,
            clinicId: saved.clinicId,
            userId:   user.id,
            branchId: null,
            body:     `${dateStr} · For you`,
          });
          this.notificationsGateway.emitToClinic(saved.clinicId, 'notification', {
            ...notif,
            event: 'holiday_created',
          });
        } catch { /* non-critical */ }
      }

    } else if (saved.isRoleSpecific && saved.targetRoles?.length) {
      // ── Role-specific: notify staff holding the targeted built-in or custom roles ─
      const builtInRoles   = saved.targetRoles.filter(r => /^[a-z_]+$/.test(r));
      const customRoleIds  = saved.targetRoles.filter(r => !builtInRoles.includes(r));
      const userSet  = new Set<string>();
      const staffList: User[] = [];

      if (builtInRoles.length) {
        const byBuiltInRole = await this.userRepo.find({
          where: { clinicId: saved.clinicId, isActive: true, role: In(builtInRoles) } as any,
        });
        for (const u of byBuiltInRole) if (!userSet.has(u.id)) { userSet.add(u.id); staffList.push(u); }
      }
      if (customRoleIds.length) {
        const assignments = await this.userRoleRepo.find({ where: { roleId: In(customRoleIds) }, relations: ['user'] });
        for (const a of assignments) {
          if (a.user && a.user.clinicId === saved.clinicId && !userSet.has(a.user.id)) {
            userSet.add(a.user.id); staffList.push(a.user);
          }
        }
      }

      for (const user of staffList) {
        try {
          const notif = await this.notificationsService.create({
            ...notifBase,
            clinicId: saved.clinicId,
            userId:   user.id,
            branchId: null,
            body:     `${dateStr} · For your role`,
          });
          this.notificationsGateway.emitToClinic(saved.clinicId, 'notification', {
            ...notif,
            event: 'holiday_created',
          });
        } catch { /* non-critical */ }
      }

    } else if (!saved.isClinicWide && saved.branchIds?.length) {
      // ── Branch-specific: notify staff in the specified branches ──────────
      const branchIdsToNotify = saved.branchIds;

      const branches = await this.branchRepo.find({
        where:     { id: In(branchIdsToNotify) },
        relations: ['staff'],
      });

      const userSet  = new Set<string>();
      const staffList: User[] = [];

      for (const branch of branches) {
        for (const user of branch.staff ?? []) {
          if (!userSet.has(user.id)) {
            userSet.add(user.id);
            staffList.push(user);
          }
        }
      }

      for (const bid of branchIdsToNotify) {
        try {
          const notif = await this.notificationsService.create({
            ...notifBase,
            clinicId: saved.clinicId,
            userId:   null,
            branchId: bid,
            body:     `${dateStr} · Branch only`,
          });
          this.notificationsGateway.emitToBranch(bid, 'notification', {
            ...notif,
            event: 'holiday_created',
          });
        } catch { /* non-critical */ }
      }
    }
  }
}