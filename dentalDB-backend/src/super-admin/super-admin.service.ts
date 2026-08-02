import { Injectable, NotFoundException } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import {
  SubscriptionRequest,
  SubscriptionRequestStatus,
  SubscriptionRequestType,
} from '../subscriptions/entities/subscription-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { addMonths, addYears, format } from 'date-fns';
import { BranchesService } from '../branch/branch.service';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(User)                private userRepo: Repository<User>,
    @InjectRepository(Clinic)              private clinicRepo: Repository<Clinic>,
    @InjectRepository(Subscription)        private subRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionRequest) private reqRepo: Repository<SubscriptionRequest>,
    private notifications: NotificationsService,
    private branchesService: BranchesService,
  ) {}

  // ── Dashboard Analytics ────────────────────────────────────────────────────

  async getDashboardStats() {
    const [totalClinics, totalUsers] = await Promise.all([
      this.clinicRepo.count(),
      this.userRepo.count(),
    ]);

    const now = new Date();

    const activeSubscriptions = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('s.currentPeriodEnd > :now', { now })
      .getCount();

    const expiredSubscriptions = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SubscriptionStatus.EXPIRED })
      .orWhere('(s.currentPeriodEnd < :now AND s.status != :cancelled)', {
        now,
        cancelled: SubscriptionStatus.CANCELLED,
      })
      .getCount();

    const pendingRequests = await this.reqRepo.count({
      where: { status: SubscriptionRequestStatus.PENDING },
    });

    // Revenue: sum of all active subscription plans by price
    const planRevenue = await this.subRepo
      .createQueryBuilder('s')
      .select('s.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('s.plan')
      .getRawMany();

    const PLAN_PRICES: Record<string, number> = {
      pro: 1499,
      enterprise: 10000,
    };
    const estimatedMonthlyRevenue = planRevenue.reduce((total, row) => {
      return total + (PLAN_PRICES[row.plan] || 0) * Number(row.count);
    }, 0);

    // Recent clinics
    const recentClinics = await this.clinicRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      totalClinics,
      totalUsers,
      activeSubscriptions,
      expiredSubscriptions,
      pendingRequests,
      estimatedMonthlyRevenue,
      recentClinics,
      planBreakdown: planRevenue,
    };
  }

  // ── Users Management ───────────────────────────────────────────────────────

  async getAllUsers(query: any) {
    const { page = 1, limit = 20, search, role } = query;
    let qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.clinic', 'clinic')
      .orderBy('u.createdAt', 'DESC');

    if (search) {
      qb = qb.andWhere(
        `(u.firstName ${ilike()} :s OR u.lastName ${ilike()} :s OR u.email ${ilike()} :s)`,
        { s: `%${search}%` },
      );
    }
    if (role) qb = qb.andWhere('u.role = :role', { role });

    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();

    // Remove sensitive fields
    const safeData = data.map(({ password, refreshToken, passwordResetToken, passwordResetExpires, ...u }: any) => u);

    return { data: safeData, total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Subscriptions Management ───────────────────────────────────────────────

  async getAllSubscriptions(query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const now = new Date();

    // Build a plain find query — Clinic has no TypeORM subscription relation
    const where: any = {};
    let allClinics: any[];

    if (search && search.trim()) {
      allClinics = await this.clinicRepo
        .createQueryBuilder('c')
        .where(`(c.name ${ilike()} :s OR c.email ${ilike()} :s)`, { s: `%${search.trim()}%` })
        .orderBy('c.createdAt', 'DESC')
        .getMany();
    } else {
      allClinics = await this.clinicRepo.find({ order: { createdAt: 'DESC' } });
    }

    // Enrich with subscription info
    const allData = await Promise.all(
      allClinics.map(async (clinic: any) => {
        const sub = await this.subRepo.findOne({ where: { clinicId: clinic.id } });
        const owner = await this.userRepo.findOne({
          where: { clinicId: clinic.id, role: UserRole.OWNER },
        });

        let subStatus = 'none';
        if (sub) {
          const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
          if (sub.status === SubscriptionStatus.ACTIVE && periodEnd && periodEnd > now) {
            subStatus = 'active';
          } else if (periodEnd && periodEnd < now) {
            subStatus = 'expired';
          } else if (sub.status) {
            subStatus = sub.status;
          }
        }

        const members = await this.userRepo.find({
          where: { clinicId: clinic.id },
          order: { createdAt: 'ASC' },
        });
        const safeMembers = members
          .filter((m: any) => m.role !== UserRole.OWNER)
          .map(({ password, refreshToken, passwordResetToken, passwordResetExpires, ...m }: any) => m);

        return {
          clinic,
          owner: owner ? { id: owner.id, firstName: owner.firstName, lastName: owner.lastName, email: owner.email, phone: owner.phone, role: owner.role } : null,
          members: safeMembers,
          subscription: sub,
          subscriptionStatus: subStatus,
        };
      }),
    );

    // Filter by status AFTER enrichment so pagination is accurate
    const filtered = status ? allData.filter(d => d.subscriptionStatus === status) : allData;
    const total    = filtered.length;
    const pageNum  = +page;
    const limitNum = +limit;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return { data: paginated, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async updateSubscription(clinicId: string, adminUserId: string, dto: {
    plan: string;
    billingCycle?: string;
    status?: SubscriptionStatus;
    durationMonths?: number;
    numBranches?: number;
    /** Optional ISO date string — overrides the duration-based calculation. */
    customPeriodEnd?: string;
  }) {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const now = new Date();
    const durationMonths = dto.durationMonths || (dto.billingCycle === 'yearly' ? 12 : 1);
    // customPeriodEnd lets the admin pin an exact expiry (e.g. force-expire now, or extend).
    const periodEnd = dto.customPeriodEnd
      ? new Date(dto.customPeriodEnd)
      : addMonths(now, durationMonths);

    let sub = await this.subRepo.findOne({ where: { clinicId } });
    if (sub) {
      sub.plan               = dto.plan;
      sub.status             = dto.status || SubscriptionStatus.ACTIVE;
      sub.billingCycle       = dto.billingCycle || 'monthly';
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd   = periodEnd;
    } else {
      sub = this.subRepo.create({
        clinicId,
        plan:               dto.plan,
        status:             dto.status || SubscriptionStatus.ACTIVE,
        billingCycle:       dto.billingCycle || 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
      });
    }
    await this.subRepo.save(sub);

    // Reactivating out of the free trial (unlimited branches, quota 999) into
    // a branch-capped plan must never silently strand branches the clinic
    // already has into 'pending_selection' — that's a forced downgrade the
    // admin/owner never chose, and it blocks billing on those branches (see
    // BranchLockGuard) plus a later RENEWAL_BLOCKED_PENDING_SELECTION 400 on
    // renewal. If the approved request under-counts the clinic's actual
    // active branches, raise the floor to match.
    let numBranchesToApply = dto.numBranches;
    if (numBranchesToApply != null && clinic.plan === 'free' && (dto.plan === 'pro' || dto.plan === 'enterprise')) {
      const existingBranches = await this.branchesService.findAll(clinicId).catch(() => [] as any[]);
      const activeBranchCount = existingBranches.filter((b: any) => b.status === 'active').length;
      if (activeBranchCount > numBranchesToApply) {
        numBranchesToApply = activeBranchCount;
      }
    }

    // For pro and enterprise plans, persist the purchased branch count in clinic settings
    const existingSettings = (clinic.settings as any) || {};
    const newSettings = ((dto.plan === 'enterprise' || dto.plan === 'pro') && numBranchesToApply != null)
      ? { ...existingSettings, numBranches: Math.max(1, numBranchesToApply) }
      : existingSettings;

    await this.clinicRepo.update(
      { id: clinicId },
      { plan: dto.plan as any, subscriptionEndsAt: periodEnd, settings: newSettings },
    );

    // Apply branch quota lock/unlock after plan change.
    // Pass periodEnd so applyQuota can clear stale activationPeriodEnd locks on upgrade.
    if (numBranchesToApply != null) {
      await this.branchesService.applyQuota(clinicId, numBranchesToApply, periodEnd);
    }

    // Trigger SMS + Email notification
    await this.sendSubscriptionNotification(clinic, sub, 'Activated');

    return { subscription: sub, message: 'Subscription updated successfully' };
  }

  // ── Subscription Requests ──────────────────────────────────────────────────

  async getPendingRequests(query: any) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await this.reqRepo.findAndCount({
      where: { status: SubscriptionRequestStatus.PENDING },
      relations: ['user', 'clinic'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: +limit,
    });
    return { data, total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) };
  }

  async approveRequest(requestId: string, adminUserId: string, adminNote?: string) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: ['user', 'clinic'],
    });
    if (!req) throw new NotFoundException('Request not found');

    // Activate/renew the subscription
    await this.updateSubscription(req.clinicId, adminUserId, {
      plan:         req.requestedPlan,
      billingCycle: req.billingCycle || 'monthly',
      status:       SubscriptionStatus.ACTIVE,
      numBranches:  (req as any).numBranches,
    });

    req.status     = SubscriptionRequestStatus.APPROVED;
    req.reviewedBy = adminUserId;
    req.reviewedAt = new Date();
    req.adminNote  = adminNote;
    await this.reqRepo.save(req);

    // Notify the user
    await this.notifications.create({
      clinicId: req.clinicId,
      userId:   req.userId,
      type:     NotificationType.SYSTEM,
      title:    'Subscription Approved',
      body:     `Your ${req.type} request for the ${req.requestedPlan} plan has been approved.`,
    });

    return req;
  }

  async rejectRequest(requestId: string, adminUserId: string, adminNote?: string) {
    const req = await this.reqRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');

    req.status     = SubscriptionRequestStatus.REJECTED;
    req.reviewedBy = adminUserId;
    req.reviewedAt = new Date();
    req.adminNote  = adminNote;
    await this.reqRepo.save(req);

    await this.notifications.create({
      clinicId: req.clinicId,
      userId:   req.userId,
      type:     NotificationType.SYSTEM,
      title:    'Subscription Request Rejected',
      body:     `Your ${req.type} request has been rejected. ${adminNote ? 'Reason: ' + adminNote : ''}`,
    });

    return req;
  }

  // ── Owner: Create Subscription Request ────────────────────────────────────

  async createSubscriptionRequest(userId: string, clinicId: string, dto: {
    requestedPlan: string;
    billingCycle?: string;
    type: SubscriptionRequestType;
    contactNumber?: string;
    paymentProofUrl?: string;
    paymentMethod?: string;
    numBranches?: number;
  }) {
    // Check for existing pending request for same plan
    const existing = await this.reqRepo.findOne({
      where: {
        clinicId,
        requestedPlan: dto.requestedPlan,
        status: SubscriptionRequestStatus.PENDING,
      },
    });
    if (existing) {
      return { message: 'A pending request already exists for this plan', request: existing };
    }

    const request = this.reqRepo.create({
      userId,
      clinicId,
      requestedPlan:    dto.requestedPlan,
      billingCycle:     dto.billingCycle || 'monthly',
      type:             dto.type,
      status:           SubscriptionRequestStatus.PENDING,
      contactNumber:    dto.contactNumber,
      paymentProofUrl:  dto.paymentProofUrl,
      paymentMethod:    dto.paymentMethod || 'manual',
      numBranches:      dto.numBranches,
    });
    const saved = await this.reqRepo.save(request);

    // Notify super admins
    const superAdmin = await this.userRepo.findOne({ where: { role: UserRole.SUPER_ADMIN } });
    if (superAdmin) {
      const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
      await this.notifications.create({
        clinicId: superAdmin.clinicId,
        userId:   superAdmin.id,
        type:     NotificationType.SYSTEM,
        title:    'New Subscription Request',
        body:     `${clinic?.name} has requested ${dto.type} for the ${dto.requestedPlan} plan.`,
        link:     '/admin/subscription',
      });
    }

    return { message: 'Request submitted successfully', request: saved };
  }

  async getUserRequests(clinicId: string) {
    return this.reqRepo.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new Error('Cannot delete super admin users');
    }
    await this.userRepo.delete({ id: userId });
    return { message: 'User deleted successfully' };
  }

  async deleteClinic(clinicId: string): Promise<{ message: string }> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    await this.subRepo.delete({ clinicId });
    await this.reqRepo.delete({ clinicId });
    await this.userRepo.delete({ clinicId });
    await this.clinicRepo.delete({ id: clinicId });
    return { message: 'Clinic deleted successfully' };
  }

    // ── Private helpers ────────────────────────────────────────────────────────

  private async sendSubscriptionNotification(clinic: Clinic, sub: Subscription, action: string) {
    const owner = await this.userRepo.findOne({
      where: { clinicId: clinic.id, role: UserRole.OWNER },
    });
    if (!owner) return;

    const startDate = sub.currentPeriodStart ? format(new Date(sub.currentPeriodStart), 'MMM dd, yyyy') : 'N/A';
    const endDate   = sub.currentPeriodEnd   ? format(new Date(sub.currentPeriodEnd),   'MMM dd, yyyy') : 'N/A';

    // Email notification
    if (owner.email) {
      await this.notifications.sendEmail({
        to:      owner.email,
        subject: `DentalOS Subscription ${action} — ${clinic.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <div style="background:#027cc6;padding:24px 28px;border-radius:10px 10px 0 0;">
              <h2 style="color:#fff;margin:0;font-size:20px;">🦷 Subscription ${action}</h2>
            </div>
            <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;">
              <p style="color:#374151;font-size:15px;">Hi <strong>${owner.firstName}</strong>,</p>
              <p style="color:#374151;font-size:15px;">Your DentalOS subscription has been <strong>${action.toLowerCase()}</strong>. Here are the details:</p>
              <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Clinic</td>
                  <td style="padding:8px 0;color:#111827;font-weight:600;font-size:13px;">${clinic.name}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Plan</td>
                  <td style="padding:8px 0;color:#111827;font-weight:600;font-size:13px;">${sub.plan?.toUpperCase()}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Start Date</td>
                  <td style="padding:8px 0;color:#111827;font-size:13px;">${startDate}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">End Date</td>
                  <td style="padding:8px 0;color:#111827;font-size:13px;">${endDate}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Status</td>
                  <td style="padding:8px 0;color:#16a34a;font-weight:600;font-size:13px;">${action}</td>
                </tr>
              </table>
              <p style="color:#9ca3af;font-size:12px;margin-top:16px;">
                Thank you for using DentalOS. Contact <a href="mailto:support@dentalos.com" style="color:#027cc6;">support@dentalos.com</a> for help.
              </p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    // SMS notification
    if (owner.phone || clinic.phone) {
      const phone = owner.phone || clinic.phone;
      await this.notifications.sendSms(
        phone,
        `ClinicKarobar: Subscription ${action} for ${clinic.name}. Plan: ${sub.plan?.toUpperCase()}, Valid: ${startDate} to ${endDate}.`,
      ).catch(() => {});
    }
  }
}