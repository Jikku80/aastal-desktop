import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { SyncMeta } from '../sync/entities/sync-meta.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { BranchesService } from '../branch/branch.service';
import { addMonths, addDays } from 'date-fns';
import { resolveOfflineLicense } from './offline-license.util';

// ── Per-spec plan features ─────────────────────────────────────────────────────
const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    'dashboard', 'appointments', 'patients', 'billing', 'analytics', 'staff',
    'settings', 'sms_reminders', 'notifications', 'branches',
    'attendance', 'leave', 'website',
  ],
  pro: [
    'dashboard', 'appointments', 'patients', 'billing', 'analytics', 'staff',
    'settings', 'sms_reminders', 'notifications',
    'attendance', 'leave',
  ],
  enterprise: [
    'dashboard', 'appointments', 'patients', 'billing', 'analytics', 'staff',
    'settings', 'sms_reminders', 'notifications',
    'attendance', 'leave', 'branches_unlimited', 'website', 'api_access',
    'priority_support',
  ],
};

// ── Branch-based pricing ───────────────────────────────────────────────────────
export const PRO_BASE_MONTHLY             = 800;
export const PRO_PER_BRANCH_MONTHLY       = 500;
export const ENTERPRISE_BASE_MONTHLY      = 1200;
export const ENTERPRISE_PER_BRANCH_MONTHLY = 500;

export function calcProMonthly(numBranches: number): number {
  const n = Math.max(1, numBranches);
  return PRO_BASE_MONTHLY + (n - 1) * PRO_PER_BRANCH_MONTHLY;
}
export function calcProYearly(numBranches: number): number {
  return calcProMonthly(numBranches) * 11;
}
export function calcEnterpriseMonthly(numBranches: number): number {
  const n = Math.max(1, numBranches);
  return ENTERPRISE_BASE_MONTHLY + (n - 1) * ENTERPRISE_PER_BRANCH_MONTHLY;
}
export function calcEnterpriseYearly(numBranches: number): number {
  return calcEnterpriseMonthly(numBranches) * 11;
}

export function quotaFromMonthlyAmount(plan: string, amount: number): number {
  if (plan === 'pro')        return Math.max(1, Math.floor((amount - PRO_BASE_MONTHLY)        / PRO_PER_BRANCH_MONTHLY)        + 1);
  if (plan === 'enterprise') return Math.max(1, Math.floor((amount - ENTERPRISE_BASE_MONTHLY) / ENTERPRISE_PER_BRANCH_MONTHLY) + 1);
  return 999;
}

const PLAN_PRICES_NPR: Record<string, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
};

const FREE_TRIAL_DAYS = 14;

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private subRepo:     Repository<Subscription>,
    @InjectRepository(Clinic)       private clinicRepo:  Repository<Clinic>,
    @InjectRepository(SyncMeta)     private syncMetaRepo: Repository<SyncMeta>,
    private notifications: NotificationsService,
    private branches: BranchesService,
  ) {}

  /**
   * True for the offline/desktop (SQLite) build, where the Subscription
   * entity isn't registered at all (see offline-entities.ts) — every method
   * below that touches subRepo must be skipped in that case, in favor of
   * the Clinic-only offline path (see offline-license.util.ts).
   */
  private isOffline(): boolean {
    return (process.env.DB_DRIVER ?? 'postgres') === 'sqlite';
  }

  async getCurrent(clinicId: string) {
    if (this.isOffline()) {
      return this.getCurrentOffline(clinicId);
    }

    const sub    = await this.subRepo.findOne({ where: { clinicId } });
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    const now    = new Date();

    // ── Auto-lock logic ──────────────────────────────────────────────────────
    let isLocked   = false;
    let lockReason = '';

    if (clinic?.plan === SubscriptionPlan.FREE) {
      if (clinic.trialEndsAt && now > new Date(clinic.trialEndsAt)) {
        isLocked   = true;
        lockReason = 'trial_expired';
        if (sub && sub.status === SubscriptionStatus.ACTIVE) {
          sub.status = SubscriptionStatus.EXPIRED;
          await this.subRepo.save(sub).catch(() => {});
        }
      }
    } else if (sub) {
      if (sub.currentPeriodEnd && now > new Date(sub.currentPeriodEnd)) {
        isLocked   = true;
        lockReason = 'subscription_expired';
        if (sub.status === SubscriptionStatus.ACTIVE) {
          sub.status = SubscriptionStatus.EXPIRED;
          await this.subRepo.save(sub).catch(() => {});
        }
      }
      if (sub.status === SubscriptionStatus.CANCELLED) { isLocked = true; lockReason = 'cancelled'; }
      if (sub.status === SubscriptionStatus.EXPIRED)   { isLocked = true; lockReason = 'subscription_expired'; }
    } else {
      isLocked   = true;
      lockReason = 'no_sub';
    }

    const plan = clinic?.plan || 'free';
    const numBranches: number = (clinic?.settings as any)?.numBranches ?? 1;

    // Include downgrade selection status
    const quotaStatus = await this.branches.getQuotaStatus(clinicId).catch(() => null);

    return {
      subscription:       sub,
      plan,
      features:           PLAN_FEATURES[plan],
      prices:             PLAN_PRICES_NPR,
      proPricing: {
        baseMonthly:      PRO_BASE_MONTHLY,
        perBranchMonthly: PRO_PER_BRANCH_MONTHLY,
        numBranches:      plan === 'pro' ? numBranches : 1,
        monthlyTotal:     calcProMonthly(plan === 'pro' ? numBranches : 1),
        yearlyTotal:      calcProYearly(plan === 'pro' ? numBranches : 1),
      },
      enterprisePricing: {
        baseMonthly:      ENTERPRISE_BASE_MONTHLY,
        perBranchMonthly: ENTERPRISE_PER_BRANCH_MONTHLY,
        numBranches:      plan === 'enterprise' ? numBranches : 1,
        monthlyTotal:     calcEnterpriseMonthly(plan === 'enterprise' ? numBranches : 1),
        yearlyTotal:      calcEnterpriseYearly(plan === 'enterprise' ? numBranches : 1),
      },
      trialEndsAt:        clinic?.trialEndsAt,
      isTrialActive:      clinic?.trialEndsAt ? now < new Date(clinic.trialEndsAt) : false,
      isLocked,
      lockReason,
      currentPeriodEnd:   sub?.currentPeriodEnd,
      billingCycle:       sub?.billingCycle,
      maxBranches:        this.getMaxBranches(plan, numBranches),
      // Branch seat allocation state
      requiresDowngradeSelection: quotaStatus?.requiresDowngradeSelection ?? false,
      pendingBranchSelection:     quotaStatus?.pendingSelection ?? null,
    };
  }

  /**
   * Offline (SQLite/desktop) build variant of getCurrent(). There is no
   * local Subscription row at all — plan/trialEndsAt/subscriptionEndsAt
   * live on the Clinic row and are kept current by the ordinary Clinic
   * sync (sync-registry.ts) whenever there's connectivity. This is what
   * SubscriptionGate.tsx renders its lock screen from; it's also checked
   * independently (and enforced, not just displayed) on every
   * JWT-authenticated request in jwt.strategy.ts, so this stays accurate
   * even if a request never reaches this endpoint.
   */
  private async getCurrentOffline(clinicId: string) {
    const result       = await resolveOfflineLicense(clinicId, this.clinicRepo, this.syncMetaRepo);
    const plan         = result.plan || 'free';
    const quotaStatus  = await this.branches.getQuotaStatus(clinicId).catch(() => null);

    return {
      subscription:       null,
      plan,
      features:           PLAN_FEATURES[plan] ?? PLAN_FEATURES.free,
      prices:             PLAN_PRICES_NPR,
      proPricing: {
        baseMonthly:      PRO_BASE_MONTHLY,
        perBranchMonthly: PRO_PER_BRANCH_MONTHLY,
        numBranches:      1,
        monthlyTotal:     calcProMonthly(1),
        yearlyTotal:      calcProYearly(1),
      },
      enterprisePricing: {
        baseMonthly:      ENTERPRISE_BASE_MONTHLY,
        perBranchMonthly: ENTERPRISE_PER_BRANCH_MONTHLY,
        numBranches:      1,
        monthlyTotal:     calcEnterpriseMonthly(1),
        yearlyTotal:      calcEnterpriseYearly(1),
      },
      trialEndsAt:        result.trialEndsAt ?? undefined,
      isTrialActive:      plan === 'free' && result.lockReason !== 'trial_expired',
      isLocked:           result.isLocked,
      lockReason:         result.lockReason || undefined,
      currentPeriodEnd:   result.currentPeriodEnd ?? undefined,
      billingCycle:       undefined,
      maxBranches:        this.getMaxBranches(plan, 1),
      requiresDowngradeSelection: quotaStatus?.requiresDowngradeSelection ?? false,
      pendingBranchSelection:     quotaStatus?.pendingSelection ?? null,
      offline: true,
    };
  }

  getMaxBranches(plan: string, numBranches = 1): number {
    if (plan === 'free')       return 999;
    if (plan === 'pro')        return numBranches;
    if (plan === 'enterprise') return numBranches;
    return 1;
  }

  async upgradePlan(
    clinicId: string,
    dto: {
      plan: SubscriptionPlan;
      billingCycle: 'monthly' | 'yearly';
      numBranches?: number;
      /**
       * When true, downgrade takes effect immediately (admin override).
       * When false (default), downgrade defers branch locking to renewal.
       */
      immediateDowngrade?: boolean;
    },
  ): Promise<any> {
    if (this.isOffline()) {
      throw new BadRequestException(
        'Plan changes must be made from the online portal while this device is connected — the change syncs down automatically afterwards.',
      );
    }
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const now = new Date();
    let periodEnd: Date;

    if (dto.plan === SubscriptionPlan.FREE) {
      periodEnd = addDays(now, FREE_TRIAL_DAYS);
    } else if (dto.billingCycle === 'yearly') {
      periodEnd = addMonths(now, 12);
    } else {
      periodEnd = addMonths(now, 1);
    }

    let numBranches = (dto.plan === SubscriptionPlan.PRO || dto.plan === SubscriptionPlan.ENTERPRISE)
      ? Math.max(1, dto.numBranches ?? 1)
      : undefined;

    // Detect downgrade: current plan has more branches than new plan
    const currentNumBranches: number = (clinic.settings as any)?.numBranches ?? 1;
    const currentPlan = clinic.plan;

    // Reactivating out of the free trial (which allows unlimited branches —
    // quota 999) into a branch-capped plan must never silently strand
    // branches the clinic already has into 'pending_selection'. That would
    // be a forced downgrade the owner never asked for, and it blocks billing
    // on those branches (see BranchLockGuard) and can later throw
    // RENEWAL_BLOCKED_PENDING_SELECTION on the next renewal. If the request
    // under-counts the clinic's actual active branches, raise the floor to
    // match — a genuine downgrade is still possible afterwards from an
    // already-paid plan, where this floor doesn't apply.
    if (numBranches !== undefined && currentPlan === SubscriptionPlan.FREE) {
      const existingBranches = await this.branches.findAll(clinicId).catch(() => [] as any[]);
      const activeBranchCount = existingBranches.filter((b: any) => b.status === 'active').length;
      if (activeBranchCount > numBranches) {
        numBranches = activeBranchCount;
      }
    }

    const isDowngrade = this.isDowngrade(
      currentPlan,
      currentNumBranches,
      dto.plan,
      numBranches ?? 1,
    );

    // Upsert subscription record
    let sub = await this.subRepo.findOne({ where: { clinicId } });
    if (sub) {
      sub.plan               = dto.plan;
      sub.status             = SubscriptionStatus.ACTIVE;
      sub.billingCycle       = dto.billingCycle;
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd   = periodEnd;
      sub.features           = PLAN_FEATURES[dto.plan];
      sub.cancelAt           = null;
    } else {
      sub = this.subRepo.create({
        clinicId,
        plan:               dto.plan,
        status:             SubscriptionStatus.ACTIVE,
        billingCycle:       dto.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
        features:           PLAN_FEATURES[dto.plan],
      });
    }
    await this.subRepo.save(sub);

    // Update clinic plan + settings
    const existingSettings = (clinic.settings as any) || {};
    const newSettings = numBranches !== undefined
      ? { ...existingSettings, numBranches }
      : existingSettings;

    const clinicUpdate: any = {
      plan:               dto.plan,
      subscriptionEndsAt: periodEnd,
      settings:           newSettings,
    };
    if (dto.plan === SubscriptionPlan.FREE) {
      clinicUpdate.trialEndsAt = periodEnd;
    }
    await this.clinicRepo.update({ id: clinicId }, clinicUpdate);

    // Calculate price
    let price: number;
    const nb = numBranches ?? 1;
    if (dto.plan === SubscriptionPlan.ENTERPRISE) {
      price = dto.billingCycle === 'yearly' ? calcEnterpriseYearly(nb) : calcEnterpriseMonthly(nb);
    } else if (dto.plan === SubscriptionPlan.PRO) {
      price = dto.billingCycle === 'yearly' ? calcProYearly(nb) : calcProMonthly(nb);
    } else {
      price = dto.billingCycle === 'yearly'
        ? PLAN_PRICES_NPR[dto.plan]?.yearly ?? 0
        : PLAN_PRICES_NPR[dto.plan]?.monthly ?? 0;
    }

    const quotaToApply = numBranches !== undefined ? nb : (dto.plan === SubscriptionPlan.FREE ? 999 : 1);

    // Apply branch quota with correct upgrade/downgrade semantics
    const quotaResult = await this.branches.applyQuota(
      clinicId,
      quotaToApply,
      periodEnd ?? undefined,
      { isRenewal: false, immediateEffect: dto.immediateDowngrade ?? false },
    );

    // Send invoice email
    if (clinic.email && dto.plan !== SubscriptionPlan.FREE) {
      const invoiceNum = `SUB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      this.notifications.sendSubscriptionInvoiceEmail({
        clinicEmail:   clinic.email,
        clinicName:    clinic.name,
        plan:          dto.plan,
        billingCycle:  dto.billingCycle,
        amount:        price,
        invoiceNumber: invoiceNum,
        transactionId: sub.externalSubscriptionId || `DIRECT-${Date.now()}`,
        periodStart:   now,
        periodEnd:     periodEnd,
        paymentMethod: 'direct',
      }).catch(() => {});
    }

    return {
      subscription:               sub,
      message:                    `Plan set to ${dto.plan} (${dto.billingCycle}) successfully`,
      expiresAt:                  periodEnd,
      maxBranches:                this.getMaxBranches(dto.plan, nb),
      numBranches:                nb,
      pricePaid:                  price,
      isDowngrade,
      requiresDowngradeSelection: quotaResult.requiresSelection,
      pendingBranchSelection:     quotaResult.pendingSelection,
      autoActivatedBranches:      quotaResult.autoActivated,
    };
  }

  /**
   * Determine if the new plan/branch-count is a downgrade relative to current.
   */
  private isDowngrade(
    currentPlan: string,
    currentBranches: number,
    newPlan: string,
    newBranches: number,
  ): boolean {
    // Plan rank: free < pro < enterprise
    const rank: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };
    const currentRank = rank[currentPlan] ?? 0;
    const newRank     = rank[newPlan] ?? 0;

    if (newRank < currentRank) return true;
    if (newRank === currentRank && newBranches < currentBranches) return true;
    return false;
  }

  async cancelSubscription(clinicId: string): Promise<Subscription> {
    if (this.isOffline()) {
      throw new BadRequestException('Subscription cancellation must be done from the online portal.');
    }
    const sub = await this.subRepo.findOne({ where: { clinicId } });
    if (!sub) throw new NotFoundException('No active subscription found');
    sub.status   = SubscriptionStatus.CANCELLED;
    sub.cancelAt = new Date();
    await this.subRepo.save(sub);
    await this.clinicRepo.update({ id: clinicId }, { plan: SubscriptionPlan.FREE });
    return sub;
  }

  /**
   * Renew an expired subscription for the same plan/cycle.
   *
   * Renewal logic:
   * - If a pending downgrade selection exists → enforce it at renewal
   * - Otherwise apply quota normally (handles upgrade path too)
   */
  async renewSubscription(clinicId: string): Promise<any> {
    if (this.isOffline()) {
      throw new BadRequestException('Subscription renewal must be done from the online portal while connected — it syncs down automatically afterwards.');
    }
    const sub    = await this.subRepo.findOne({ where: { clinicId } });
    if (!sub) throw new NotFoundException('No subscription found');
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    const billingCycle  = (sub.billingCycle as 'monthly' | 'yearly') || 'monthly';
    const numBranches   = (clinic?.settings as any)?.numBranches ?? 1;

    // Check if there is a pending selection from a previous downgrade
    const quotaStatus = await this.branches.getQuotaStatus(clinicId).catch(() => null);
    if (quotaStatus?.requiresDowngradeSelection && quotaStatus?.pendingSelection) {
      throw new BadRequestException({
        code:    'RENEWAL_BLOCKED_PENDING_SELECTION',
        message: 'You must complete branch selection before renewing your subscription.',
        pendingSelection: quotaStatus.pendingSelection,
      });
    }

    return this.upgradePlan(clinicId, {
      plan: sub.plan as SubscriptionPlan,
      billingCycle,
      numBranches,
    });
  }

  getPlans() {
    return Object.entries(PLAN_FEATURES).map(([plan, features]) => ({
      id:       plan,
      name:     plan.charAt(0).toUpperCase() + plan.slice(1),
      features,
      prices:   plan === 'enterprise'
        ? { monthly: ENTERPRISE_BASE_MONTHLY, yearly: calcEnterpriseYearly(1), perBranchMonthly: ENTERPRISE_PER_BRANCH_MONTHLY }
        : PLAN_PRICES_NPR[plan],
      maxBranches: plan === 'enterprise' ? null : this.getMaxBranches(plan),
    }));
  }
}