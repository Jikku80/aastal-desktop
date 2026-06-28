import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notice, NoticeScope, NoticeType } from './entities/notice.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { UserRole as UserRoleAssignment } from '../rbac/entities/user-role.entity';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)  private repo:      Repository<Notice>,
    @InjectRepository(User)    private userRepo:   Repository<User>,
    @InjectRepository(Branch)  private branchRepo: Repository<Branch>,
    @InjectRepository(UserRoleAssignment) private userRoleRepo: Repository<UserRoleAssignment>,
    private notificationsService: NotificationsService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(clinicId: string, createdByUserId: string, dto: {
    type:            NoticeType;
    title:           string;
    description?:    string;
    startDate?:      string;
    endDate?:        string;
    scope:           NoticeScope;
    targetBranchIds?: string[];
    targetUserIds?:   string[];
    targetRoles?:     string[];
  }): Promise<Notice> {
    const notice = this.repo.create({
      clinicId,
      createdByUserId,
      ...dto,
      targetBranchIds: dto.targetBranchIds || [],
      targetUserIds:   dto.targetUserIds   || [],
      targetRoles:     dto.targetRoles     || [],
    });

    const saved = await this.repo.save(notice);

    // Fire notifications to relevant users
    await this.notifyTargetUsers(saved).catch(() => {});

    return saved;
  }

  // ── Find all (filtered by user's branch/scope) ────────────────────────────────

  /**
   * Returns notices visible to a specific user:
   * - All CLINIC_WIDE notices for the clinic
   * - BRANCH notices where user's branch is in targetBranchIds
   * - TEAM_MEMBER notices where userId is in targetUserIds
   */
  async findForUser(clinicId: string, userId: string, branchIds: string[], userBuiltInRole?: string): Promise<Notice[]> {
    const all = await this.repo.find({
      where: { clinicId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    // Only resolve custom RBAC role assignments if at least one ROLE-scoped notice exists, to avoid an unnecessary query.
    let customRoleIds: string[] = [];
    if (all.some(n => n.scope === NoticeScope.ROLE)) {
      const assignments = await this.userRoleRepo.find({ where: { userId } });
      customRoleIds = assignments.map(a => a.roleId);
    }

    return all.filter(n => {
      if (n.scope === NoticeScope.CLINIC_WIDE) return true;

      if (n.scope === NoticeScope.BRANCH) {
        return (n.targetBranchIds || []).some(bId => branchIds.includes(bId));
      }

      if (n.scope === NoticeScope.TEAM_MEMBER) {
        return (n.targetUserIds || []).includes(userId);
      }

      if (n.scope === NoticeScope.ROLE) {
        const roles = n.targetRoles || [];
        return (userBuiltInRole && roles.includes(userBuiltInRole)) || customRoleIds.some(id => roles.includes(id));
      }

      return false;
    });
  }

  /** Admin view: all notices for a clinic */
  async findAll(clinicId: string, type?: NoticeType): Promise<Notice[]> {
    const where: any = { clinicId };
    if (type) where.type = type;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  async update(clinicId: string, id: string, dto: Partial<Notice>): Promise<Notice> {
    const n = await this.repo.findOne({ where: { id, clinicId } });
    if (!n) throw new NotFoundException('Notice not found');
    Object.assign(n, dto);
    return this.repo.save(n);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async remove(clinicId: string, id: string): Promise<void> {
    const n = await this.repo.findOne({ where: { id, clinicId } });
    if (!n) throw new NotFoundException('Notice not found');
    await this.repo.remove(n);
  }

  // ── Notify target users ───────────────────────────────────────────────────────

  private async notifyTargetUsers(notice: Notice): Promise<void> {
    let targetUsers: User[] = [];

    if (notice.scope === NoticeScope.CLINIC_WIDE) {
      targetUsers = await this.userRepo.find({ where: { clinicId: notice.clinicId, isActive: true } });
    } else if (notice.scope === NoticeScope.BRANCH && notice.targetBranchIds?.length) {
      // Load all users whose primary branch is in targetBranchIds
      // We query user_branches join table via raw query or branch staff relation
      const branches = await this.branchRepo.find({
        where:     { id: In(notice.targetBranchIds) },
        relations: ['staff'],
      });
      const userSet = new Set<string>();
      const users: User[] = [];
      for (const b of branches) {
        for (const u of b.staff || []) {
          if (!userSet.has(u.id)) { userSet.add(u.id); users.push(u); }
        }
      }
      targetUsers = users;
    } else if (notice.scope === NoticeScope.TEAM_MEMBER && notice.targetUserIds?.length) {
      targetUsers = await this.userRepo.find({
        where: { id: In(notice.targetUserIds), clinicId: notice.clinicId },
      });
    } else if (notice.scope === NoticeScope.ROLE && notice.targetRoles?.length) {
      const builtInRoles = notice.targetRoles.filter(r => /^[a-z_]+$/.test(r)); // e.g. 'dentist', 'receptionist'
      const customRoleIds = notice.targetRoles.filter(r => !builtInRoles.includes(r));

      const userSet = new Set<string>();
      const users: User[] = [];

      if (builtInRoles.length) {
        const byBuiltInRole = await this.userRepo.find({
          where: { clinicId: notice.clinicId, isActive: true, role: In(builtInRoles) } as any,
        });
        for (const u of byBuiltInRole) if (!userSet.has(u.id)) { userSet.add(u.id); users.push(u); }
      }
      if (customRoleIds.length) {
        const assignments = await this.userRoleRepo.find({ where: { roleId: In(customRoleIds) }, relations: ['user'] });
        for (const a of assignments) {
          if (a.user && a.user.clinicId === notice.clinicId && !userSet.has(a.user.id)) {
            userSet.add(a.user.id); users.push(a.user);
          }
        }
      }
      targetUsers = users;
    }

    const isHoliday = notice.type === NoticeType.HOLIDAY;
    const notifType = isHoliday ? NotificationType.SYSTEM : NotificationType.SYSTEM;
    const title     = isHoliday ? `Holiday: ${notice.title}` : `Notice: ${notice.title}`;
    const body      = notice.description || '';

    for (const user of targetUsers) {
      try {
        await this.notificationsService.create({
          clinicId: notice.clinicId,
          userId:   user.id,
          type:     notifType,
          title,
          body,
          entityId: notice.id,
          link:     '/dashboard/notices',
        });
      } catch {}
    }
  }
}
