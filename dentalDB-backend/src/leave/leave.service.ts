import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeepPartial } from 'typeorm';
import { Leave, LeaveStatus } from './entities/leave.entity';
import { User, UserRole }     from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType }     from '../notifications/entities/notification.entity';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(Leave) private repo:     Repository<Leave>,
    @InjectRepository(User)  private userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly gateway:       NotificationsGateway,
  ) {}

  /** Find all owners/super_admins in the clinic to notify them */
  private async getAdminIds(clinicId: string): Promise<string[]> {
    const admins = await this.userRepo.find({
      where: { clinicId, isActive: true, role: In([UserRole.OWNER, UserRole.SUPER_ADMIN]) },
      select: ['id'],
    });
    return admins.map(a => a.id);
  }

  /** Push notification to a user and persist it */
  private async notify(
    clinicId: string,
    userId:   string,
    type:     NotificationType,
    title:    string,
    body:     string,
    link      = '/dashboard/leave',
    entityId?: string,
  ) {
    try {
      const n = await this.notifications.create({ clinicId, userId, type, title, body, link, entityId });
      this.gateway.emitToUser(userId, 'notification', n);
    } catch { /* non-critical */ }
  }

  async apply(
    clinicId: string,
    userId: string,
    dto: DeepPartial<Leave> & { leaveType?: string },
  ): Promise<Leave> {
    // Create leave entity
    const leave = this.repo.create({
      clinicId,
      userId,
      status: LeaveStatus.PENDING, // ✅ use enum
      ...dto,
    });
    // Save leave
    const saved = await this.repo.save(leave);

    // Get applicant name for notification
    const applicant = await this.userRepo.findOne({ where: { id: userId } });
    const name = applicant ? `${applicant.firstName} ${applicant.lastName}` : 'A team member';
    const leaveType = (dto.leaveType || 'leave').replace('_', ' ');

    // Notify all admins
    const adminIds = await this.getAdminIds(clinicId);
    for (const adminId of adminIds) {
      await this.notify(
        clinicId,
        adminId,
        NotificationType.LEAVE_REQUESTED,
        'New Leave Request',
        `${name} has applied for ${leaveType} leave (${dto.startDate} → ${dto.endDate}).`,
        '/dashboard/leave',
        saved.id,
      );
    }

    return saved;
  }

  async findAll(clinicId: string, query: any) {
    const { page = 1, limit = 20, userId, status } = query;
    let qb = this.repo.createQueryBuilder('l')
      .leftJoinAndSelect('l.user', 'user')
      .where('l.clinicId = :clinicId', { clinicId });
    if (userId) qb = qb.andWhere('l.userId = :userId', { userId });
    if (status) qb = qb.andWhere('l.status = :status', { status });
    qb = qb.orderBy('l.createdAt', 'DESC');
    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async approve(clinicId: string, id: string, approvedByUserId: string, note?: string): Promise<Leave> {
    const leave = await this.repo.findOne({ where: { id, clinicId }, relations: ['user'] });
    if (!leave) throw new NotFoundException('Leave not found');
    leave.status           = LeaveStatus.APPROVED;
    leave.approvedByUserId = approvedByUserId;
    leave.approvalNote     = note || '';
    leave.approvedAt       = new Date();
    const saved = await this.repo.save(leave);

    await this.notify(
      clinicId, leave.userId,
      NotificationType.LEAVE_APPROVED,
      'Leave Request Approved ✅',
      `Your ${leave.leaveType} leave request (${leave.startDate} → ${leave.endDate}) has been approved.${note ? ` Note: ${note}` : ''}`,
      '/dashboard/leave',
      id,
    );
    return saved;
  }

  async reject(clinicId: string, id: string, approvedByUserId: string, note?: string): Promise<Leave> {
    const leave = await this.repo.findOne({ where: { id, clinicId }, relations: ['user'] });
    if (!leave) throw new NotFoundException('Leave not found');
    leave.status           = LeaveStatus.REJECTED;
    leave.approvedByUserId = approvedByUserId;
    leave.approvalNote     = note || '';
    leave.approvedAt       = new Date();
    const saved = await this.repo.save(leave);

    await this.notify(
      clinicId, leave.userId,
      NotificationType.LEAVE_REJECTED,
      'Leave Request Rejected',
      `Your ${leave.leaveType} leave request (${leave.startDate} → ${leave.endDate}) was not approved.${note ? ` Reason: ${note}` : ''}`,
      '/dashboard/leave',
      id,
    );
    return saved;
  }

  async cancel(clinicId: string, id: string, userId: string): Promise<Leave> {
    const leave = await this.repo.findOne({ where: { id, clinicId } });
    if (!leave) throw new NotFoundException('Leave not found');
    if (leave.userId !== userId) throw new ForbiddenException();
    leave.status = LeaveStatus.CANCELLED;
    return this.repo.save(leave);
  }
}
