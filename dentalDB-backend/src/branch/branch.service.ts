import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Branch, BranchStatus } from './entities/branch.entity';
import { DowngradeSelection, DowngradeSelectionStatus } from './entities/downgrade-selection.entity';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { addDays } from 'date-fns';
import { pendingSyncFields } from '../sync/pending-sync.util';

// ── Configurable grace period (days). Set to 0 to disable. ───────────────────
export const DOWNGRADE_GRACE_PERIOD_DAYS = 7;

// ── Branch quota helpers ───────────────────────────────────────────────────────
export const PRO_BASE_MONTHLY         = 1500;
export const PRO_PER_BRANCH_MONTHLY   = 500;
export const ENT_BASE_MONTHLY         = 2500;
export const ENT_PER_BRANCH_MONTHLY   = 500;

export function branchQuotaFromAmount(plan: string, monthlyAmount: number): number {
  if (plan === 'pro') {
    return Math.max(1, Math.floor((monthlyAmount - PRO_BASE_MONTHLY) / PRO_PER_BRANCH_MONTHLY) + 1);
  }
  if (plan === 'enterprise') {
    return Math.max(1, Math.floor((monthlyAmount - ENT_BASE_MONTHLY) / ENT_PER_BRANCH_MONTHLY) + 1);
  }
  return 999; // free trial
}

function getQuota(plan: string, settings: any): number {
  if (plan === 'free') return 999;
  if (plan === 'pro' || plan === 'enterprise') {
    return (settings?.numBranches as number) ?? 1;
  }
  return 1;
}

/** Sync isActive / isLocked from canonical status field */
function derivedFields(status: BranchStatus): { isActive: boolean; isLocked: boolean } {
  switch (status) {
    case BranchStatus.ACTIVE:
      return { isActive: true,  isLocked: false };
    case BranchStatus.INACTIVE:
      return { isActive: false, isLocked: false };
    case BranchStatus.PENDING_SELECTION:
      return { isActive: false, isLocked: false };  // treated as inactive during selection
    default:
      return { isActive: false, isLocked: false };
  }
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)             private branchRepo:      Repository<Branch>,
    @InjectRepository(DowngradeSelection) private downgradeRepo:   Repository<DowngradeSelection>,
    @InjectRepository(User)               private userRepo:        Repository<User>,
    @InjectRepository(Appointment)        private aptRepo:         Repository<Appointment>,
    @InjectRepository(Invoice)            private invoiceRepo:     Repository<Invoice>,
    @InjectRepository(Patient)            private patientRepo:     Repository<Patient>,
    @InjectRepository(Clinic)             private clinicRepo:      Repository<Clinic>,
    @InjectRepository(Subscription)       private subRepo:         Repository<Subscription>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Read the subscription-driven quota for a clinic. */
  private async getClinicQuota(clinicId: string): Promise<{ quota: number; plan: string }> {
    const clinic   = await this.clinicRepo.findOne({ where: { id: clinicId } });
    const plan     = clinic?.plan || 'free';
    const settings = (clinic?.settings as any) || {};
    const quota    = getQuota(plan, settings);
    return { quota, plan };
  }

  /** Persist a status change, keeping isActive/isLocked in sync. */
  private async setStatus(branchId: string, status: BranchStatus): Promise<void> {
    const derived = derivedFields(status);
    await this.branchRepo.update({ id: branchId }, { status, ...derived });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(clinicId: string): Promise<Branch[]> {
    return this.branchRepo.find({
      where: { clinicId },
      relations: ['staff'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(clinicId: string, id: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id, clinicId },
      relations: ['staff'],
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async getUserBranches(clinicId: string, userId: string): Promise<Branch[]> {
    return this.branchRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.staff', 'staff')
      .innerJoin('b.staff', 'u', 'u.id = :userId', { userId })
      .where('b.clinicId = :clinicId', { clinicId })
      .orderBy('b.createdAt', 'ASC')
      .getMany();
  }

  async create(clinicId: string, dto: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    latitude?: number | null;
    longitude?: number | null;
    isPubliclyListed?: boolean;
  }): Promise<Branch> {
    const { quota, plan } = await this.getClinicQuota(clinicId);

    const totalCount  = await this.branchRepo.count({ where: { clinicId } });
    const activeCount = await this.branchRepo.count({ where: { clinicId, status: BranchStatus.ACTIVE } });

    if (totalCount >= quota) {
      const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
      throw new BadRequestException(
        `Your ${planLabel} plan allows ${quota} branch${quota !== 1 ? 'es' : ''}. ` +
        `Upgrade your subscription to add more branches.`,
      );
    }

    // Auto-activate if there is quota headroom; otherwise create inactive
    const status   = activeCount < quota ? BranchStatus.ACTIVE : BranchStatus.INACTIVE;
    const derived  = derivedFields(status);
    const branch   = this.branchRepo.create({ ...dto, clinicId, status, ...derived });
    return this.branchRepo.save(branch);
  }

  async update(clinicId: string, id: string, dto: Partial<Branch>): Promise<Branch> {
    const branch = await this.findOne(clinicId, id);

    if (branch.isLocked) {
      throw new ForbiddenException(
        'This branch is locked. Upgrade your subscription to unlock it.',
      );
    }

    // If caller is toggling isActive, translate to status
    if (dto.isActive !== undefined) {
      if (dto.isActive && branch.status !== BranchStatus.ACTIVE) {
        // Activating — check quota
        const { quota } = await this.getClinicQuota(clinicId);
        const activeCount = await this.branchRepo.count({ where: { clinicId, status: BranchStatus.ACTIVE } });

        if (activeCount >= quota) {
          throw new ForbiddenException({
            code:    'BRANCH_QUOTA_EXCEEDED',
            message:
              `Your subscription allows ${quota} active branch${quota !== 1 ? 'es' : ''}. ` +
              `You currently have ${activeCount} active. ` +
              `Deactivate another branch first, or upgrade your plan.`,
            quota,
            activeCount,
          });
        }

        await this.setStatus(id, BranchStatus.ACTIVE);
      } else if (!dto.isActive && branch.status === BranchStatus.ACTIVE) {
        await this.setStatus(id, BranchStatus.INACTIVE);
      }

      // Remove isActive from dto so we don't double-write
      const { isActive: _removed, ...rest } = dto as any;
      dto = rest;
    }

    if (Object.keys(dto).length > 0) {
      // Prevent accidental status corruption via raw dto
      const { status: _s, isLocked: _l, ...safeDelta } = dto as any;
      if (Object.keys(safeDelta).length > 0) {
        await this.branchRepo.update({ id, clinicId }, safeDelta);
      }
    }

    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.branchRepo.delete({ id, clinicId });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quota + Downgrade logic
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply a new quota to a clinic — called after subscription change.
   *
   * UPGRADE (quota grows or equals total):
   *   - Clear any pending downgrade selection
   *   - Unlock / activate all branches up to new quota
   *   - No user interaction needed
   *
   * DOWNGRADE (quota shrinks AND active branches > new quota):
   *   - Do NOT auto-lock random branches
   *   - Mark excess branches as pending_selection
   *   - Create / update a DowngradeSelection record
   *   - User must choose via confirmDowngradeSelection()
   *   - If grace period disabled, returns { requiresSelection: true }
   *
   * RENEWAL:
   *   - If pending downgrade selection exists and is incomplete → enforce it
   *   - Otherwise apply quota normally (upgrade path)
   *
   * NEVER deletes branches.
   */
  async applyQuota(
    clinicId: string,
    quota: number,
    newPeriodEnd?: Date,
    opts: { isRenewal?: boolean; immediateEffect?: boolean } = {},
  ): Promise<{
    requiresSelection: boolean;
    pendingSelection: DowngradeSelection | null;
    autoActivated: number;
  }> {
    const branches = await this.branchRepo.find({
      where: { clinicId },
      order: { createdAt: 'ASC' },
    });

    if (branches.length === 0) {
      return { requiresSelection: false, pendingSelection: null, autoActivated: 0 };
    }

    // ── Refresh activation-period locks on renewal ─────────────────────────
    if (newPeriodEnd) {
      for (const b of branches) {
        if (b.activationPeriodEnd && new Date(newPeriodEnd) >= new Date(b.activationPeriodEnd)) {
          await this.branchRepo.update({ id: b.id }, {
            activationPeriodEnd: null,
            activatedAt:         null,
          });
        }
      }
    }

    const activeBranches = branches.filter(b => b.status === BranchStatus.ACTIVE);
    const totalBranches  = branches.length;

    // ── AUTO-ACTIVATE RULE ─────────────────────────────────────────────────
    // If total branches ≤ quota, ALL branches should be active automatically.
    if (totalBranches <= quota) {
      await this.clearPendingDowngrade(clinicId);

      let autoActivated = 0;
      for (const b of branches) {
        if (b.status !== BranchStatus.ACTIVE) {
          await this.setStatus(b.id, BranchStatus.ACTIVE);
          autoActivated++;
        }
        // Always clear stale activation period locks on a quota increase
        if (b.activationPeriodEnd || b.activatedAt) {
          await this.branchRepo.update({ id: b.id }, { activationPeriodEnd: null, activatedAt: null });
        }
      }
      return { requiresSelection: false, pendingSelection: null, autoActivated };
    }

    // ── UPGRADE / SAME: active branches fit within quota ──────────────────
    if (activeBranches.length <= quota) {
      await this.clearPendingDowngrade(clinicId);

      // Activate inactive/pending branches up to new quota
      const slotsAvailable = quota - activeBranches.length;
      const candidates = branches
        .filter(b => b.status !== BranchStatus.ACTIVE)
        .slice(0, slotsAvailable);

      let autoActivated = 0;
      for (const b of candidates) {
        await this.setStatus(b.id, BranchStatus.ACTIVE);
        // Clear stale activation period lock so it stays active
        await this.branchRepo.update({ id: b.id }, { activationPeriodEnd: null, activatedAt: null });
        autoActivated++;
      }
      return { requiresSelection: false, pendingSelection: null, autoActivated };
    }

    // ── DOWNGRADE: active branches exceed new quota ────────────────────────
    // Do NOT auto-lock. Mark excess as pending_selection and require user choice.

    // Check for existing selection record (any status — clinicId is unique)
    const existing = await this.downgradeRepo.findOne({ where: { clinicId } });

    const gracePeriodEndsAt = DOWNGRADE_GRACE_PERIOD_DAYS > 0
      ? addDays(new Date(), DOWNGRADE_GRACE_PERIOD_DAYS)
      : null;

    let pendingSelection: DowngradeSelection;

    if (existing) {
      // Always reuse the existing row (unique constraint on clinicId — cannot INSERT a second one).
      // Reset it to PENDING regardless of prior status (completed/auto downgrades can recur).
      existing.newQuota          = quota;
      existing.previousQuota     = existing.status === DowngradeSelectionStatus.PENDING
        ? existing.previousQuota   // keep original if already mid-selection
        : activeBranches.length;   // snapshot current active count for a fresh downgrade
      existing.gracePeriodEndsAt = gracePeriodEndsAt;
      existing.effectiveAt       = new Date();
      existing.status            = DowngradeSelectionStatus.PENDING;
      existing.selectedBranchIds = null;
      existing.confirmedAt       = null;
      pendingSelection = await this.downgradeRepo.save(existing);
    } else {
      pendingSelection = await this.downgradeRepo.save(
        this.downgradeRepo.create({
          clinicId,
          newQuota:         quota,
          previousQuota:    activeBranches.length,
          gracePeriodEndsAt,
          effectiveAt:      new Date(),
          status:           DowngradeSelectionStatus.PENDING,
        }),
      );
    }

    // Mark excess active branches as pending_selection (non-destructive)
    // Only iterate active branches — inactive ones must not consume quota index slots
    const activeBranchList = branches.filter(b => b.status === BranchStatus.ACTIVE);
    for (let i = quota; i < activeBranchList.length; i++) {
      await this.setStatus(activeBranchList[i].id, BranchStatus.PENDING_SELECTION);
    }

    return { requiresSelection: true, pendingSelection, autoActivated: 0 };
  }

  /**
   * User confirms which branches to keep active after downgrade.
   * keepIds = branch IDs user selected to remain active (max = quota).
   *
   * Rules:
   * - keepIds.length must be <= quota
   * - Unselected branches become INACTIVE (data preserved, read-only)
   * - Selected branches become ACTIVE
   * - This is locked for the billing period (one selection per cycle)
   */
  async confirmDowngradeSelection(clinicId: string, keepIds: string[]): Promise<Branch[]> {
    const { quota } = await this.getClinicQuota(clinicId);
    const allBranches = await this.branchRepo.find({
      where: { clinicId },
      order: { createdAt: 'ASC' },
    });

    // Validate IDs
    const validIds = new Set(allBranches.map(b => b.id));
    const invalidIds = keepIds.filter(id => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid branch IDs: ${invalidIds.join(', ')}`);
    }

    if (keepIds.length > quota) {
      throw new BadRequestException(
        `Your plan allows ${quota} active branch${quota !== 1 ? 'es' : ''}. ` +
        `You selected ${keepIds.length}.`,
      );
    }

    const keepSet = new Set(keepIds);

    for (const b of allBranches) {
      const shouldBeActive = keepSet.has(b.id);
      const targetStatus   = shouldBeActive ? BranchStatus.ACTIVE : BranchStatus.INACTIVE;
      if (b.status !== targetStatus) {
        await this.setStatus(b.id, targetStatus);
      }
    }

    // Mark the pending downgrade as completed
    const pending = await this.downgradeRepo.findOne({ where: { clinicId } });
    if (pending) {
      pending.status           = DowngradeSelectionStatus.COMPLETED;
      pending.selectedBranchIds = keepIds;
      pending.confirmedAt       = new Date();
      await this.downgradeRepo.save(pending);
    }

    return this.findAll(clinicId);
  }

  /**
   * Grace period auto-selection: called by a scheduled task when grace period expires.
   * Selects branches by: most-recent activity first, then oldest-created first.
   */
  async autoSelectOnGraceExpiry(clinicId: string): Promise<Branch[]> {
    const pending = await this.downgradeRepo.findOne({
      where: { clinicId, status: DowngradeSelectionStatus.PENDING },
    });
    if (!pending) return this.findAll(clinicId);

    const quota = pending.newQuota;
    const branches = await this.branchRepo.find({
      where: { clinicId },
      order: { createdAt: 'ASC' },
    });

    // Sort: most-recent activity first; if tied, oldest created first (stable)
    const sorted = [...branches].sort((a, b) => {
      const aTime = a.lastActivityAt?.getTime() ?? 0;
      const bTime = b.lastActivityAt?.getTime() ?? 0;
      if (bTime !== aTime) return bTime - aTime; // descending activity
      return a.createdAt.getTime() - b.createdAt.getTime(); // ascending created
    });

    const keepIds = sorted.slice(0, quota).map(b => b.id);
    const keepSet = new Set(keepIds);

    for (const b of branches) {
      const targetStatus = keepSet.has(b.id) ? BranchStatus.ACTIVE : BranchStatus.INACTIVE;
      if (b.status !== targetStatus) {
        await this.setStatus(b.id, targetStatus);
      }
    }

    pending.status            = DowngradeSelectionStatus.AUTO;
    pending.selectedBranchIds = keepIds;
    pending.confirmedAt       = new Date();
    await this.downgradeRepo.save(pending);

    return this.findAll(clinicId);
  }

  /** Remove any pending downgrade record for a clinic (called on upgrade). */
  private async clearPendingDowngrade(clinicId: string): Promise<void> {
    await this.downgradeRepo.delete({ clinicId });
    // Also clear any pending_selection status back to inactive
    await this.branchRepo
      .createQueryBuilder()
      .update(Branch)
      .set({ status: BranchStatus.INACTIVE, isActive: false, isLocked: false, ...pendingSyncFields('Branch') })
      .where('clinicId = :clinicId AND status = :status', {
        clinicId,
        status: BranchStatus.PENDING_SELECTION,
      })
      .execute();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quota status (frontend source of truth)
  // ─────────────────────────────────────────────────────────────────────────

  async getQuotaStatus(clinicId: string): Promise<{
    quota: number;
    plan: string;
    totalBranches: number;
    activeBranches: number;
    inactiveBranches: number;
    pendingSelectionBranches: number;
    overActiveQuota: boolean;
    overTotalQuota: boolean;
    requiresDowngradeSelection: boolean;
    pendingSelection: {
      id: string;
      newQuota: number;
      previousQuota: number;
      gracePeriodEndsAt: Date | null;
      effectiveAt: Date;
      gracePeriodExpired: boolean;
    } | null;
  }> {
    const { quota, plan } = await this.getClinicQuota(clinicId);
    const branches        = await this.branchRepo.find({ where: { clinicId } });

    const active   = branches.filter(b => b.status === BranchStatus.ACTIVE).length;
    const inactive = branches.filter(b => b.status === BranchStatus.INACTIVE).length;
    const pending  = branches.filter(b => b.status === BranchStatus.PENDING_SELECTION).length;

    const pendingDowngrade = await this.downgradeRepo.findOne({
      where: { clinicId, status: DowngradeSelectionStatus.PENDING },
    });

    const now = new Date();
    const gracePeriodExpired = pendingDowngrade?.gracePeriodEndsAt
      ? now > new Date(pendingDowngrade.gracePeriodEndsAt)
      : false;

    return {
      quota,
      plan,
      totalBranches:            branches.length,
      activeBranches:           active,
      inactiveBranches:         inactive,
      pendingSelectionBranches: pending,
      overActiveQuota:          active > quota,
      overTotalQuota:           branches.length > quota,
      requiresDowngradeSelection: !!pendingDowngrade,
      pendingSelection: pendingDowngrade ? {
        id:                 pendingDowngrade.id,
        newQuota:           pendingDowngrade.newQuota,
        previousQuota:      pendingDowngrade.previousQuota,
        gracePeriodEndsAt:  pendingDowngrade.gracePeriodEndsAt,
        effectiveAt:        pendingDowngrade.effectiveAt,
        gracePeriodExpired,
      } : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Staff management
  // ─────────────────────────────────────────────────────────────────────────

  async assignStaff(clinicId: string, branchId: string, userId: string): Promise<Branch> {
    const branch = await this.findOne(clinicId, branchId);
    const user   = await this.userRepo.findOne({ where: { id: userId, clinicId } });
    if (!user) throw new NotFoundException('User not found');
    const already = branch.staff?.some(s => s.id === userId);
    if (!already) {
      branch.staff = [...(branch.staff || []), user];
      await this.branchRepo.save(branch);
    }
    return this.findOne(clinicId, branchId);
  }

  async removeStaff(clinicId: string, branchId: string, userId: string): Promise<Branch> {
    const branch = await this.findOne(clinicId, branchId);
    branch.staff  = (branch.staff || []).filter(s => s.id !== userId);
    await this.branchRepo.save(branch);
    return this.findOne(clinicId, branchId);
  }

  async getDoctorBranches(clinicId: string, doctorId: string): Promise<Branch[]> {
    return this.branchRepo
      .createQueryBuilder('b')
      .innerJoin('b.staff', 'u', 'u.id = :doctorId', { doctorId })
      .where('b.clinicId = :clinicId', { clinicId })
      .getMany();
  }

  async getBranchDoctors(clinicId: string, branchId: string): Promise<User[]> {
    const branch = await this.findOne(clinicId, branchId);
    return (branch.staff || []).filter(u => /doctor|dentist/i.test(u.role) && u.isActive);
  }

  async canAccessBranch(clinicId: string, userId: string, role: string, branchId: string): Promise<boolean> {
    if (['super_admin', 'owner'].includes(role)) return true;
    const branch = await this.branchRepo
      .createQueryBuilder('b')
      .innerJoin('b.staff', 'u', 'u.id = :userId', { userId })
      .where('b.id = :branchId AND b.clinicId = :clinicId', { branchId, clinicId })
      .getOne();
    return !!branch;
  }

  async getAccessibleBranchIds(clinicId: string, userId: string, role: string): Promise<string[]> {
    if (['super_admin', 'owner'].includes(role)) {
      const all = await this.branchRepo.find({ where: { clinicId }, select: ['id'] });
      return all.map(b => b.id);
    }
    const branches = await this.branchRepo
      .createQueryBuilder('b')
      .select('b.id')
      .innerJoin('b.staff', 'u', 'u.id = :userId', { userId })
      .where('b.clinicId = :clinicId', { clinicId })
      .getMany();
    return branches.map(b => b.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Branch statistics
  // ─────────────────────────────────────────────────────────────────────────

  async getBranchStats(clinicId: string, branchId: string): Promise<any> {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [totalPatients, totalAppointments, revenueAll, revenueMonth] = await Promise.all([
      this.aptRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patientId)', 'count')
        .where('a.clinicId = :clinicId AND a.branchId = :branchId', { clinicId, branchId })
        .getRawOne(),

      this.aptRepo.count({ where: { clinicId, branchId } as any }),

      this.invoiceRepo
        .createQueryBuilder('i')
        .select('COALESCE(SUM(i.paidAmount), 0)', 'total')
        .where('i.clinicId = :clinicId AND i.branchId = :branchId AND i.status = :status', {
          clinicId, branchId, status: InvoiceStatus.PAID,
        })
        .getRawOne(),

      this.invoiceRepo
        .createQueryBuilder('i')
        .select('COALESCE(SUM(i.paidAmount), 0)', 'total')
        .where('i.clinicId = :clinicId AND i.branchId = :branchId AND i.status = :status', {
          clinicId, branchId, status: InvoiceStatus.PAID,
        })
        .andWhere('i.paidAt >= :start AND i.paidAt <= :end', { start: monthStart, end: monthEnd })
        .getRawOne(),
    ]);

    // Update lastActivityAt if there is recent activity
    const hasActivity = parseInt(totalPatients?.count ?? '0', 10) > 0;
    if (hasActivity) {
      await this.branchRepo.update({ id: branchId }, { lastActivityAt: now });
    }

    return {
      totalPatients:     parseInt(totalPatients?.count  ?? '0', 10),
      totalAppointments: totalAppointments,
      totalRevenue:      parseFloat(revenueAll?.total   ?? '0'),
      revenueThisMonth:  parseFloat(revenueMonth?.total ?? '0'),
    };
  }
}