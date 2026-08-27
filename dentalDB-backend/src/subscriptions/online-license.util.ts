import { Repository } from 'typeorm';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';

// Mirrors OfflineLockResult (offline-license.util.ts) so the two license
// resolvers are interchangeable from the one enforcement point that uses
// them (jwt.strategy.ts's enforceLicense).
export type OnlineLockReason = '' | 'trial_expired' | 'subscription_expired' | 'cancelled' | 'no_sub' | 'deactivated';

export interface OnlineLockResult {
  isLocked: boolean;
  lockReason: OnlineLockReason;
  plan: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Computes trial/subscription lock state for the hosted (Postgres) build,
 * straight off the Clinic + Subscription rows. This is the online
 * counterpart of resolveOfflineLicense (offline-license.util.ts) — the
 * server itself is always the trusted clock here, so there's no
 * clock-rollback concern the way there is on a user-controlled desktop
 * machine.
 *
 * Auto-expiry side effect: if a paid subscription's currentPeriodEnd has
 * passed but its status row hasn't caught up yet (e.g. the renewal
 * reminder job hasn't run), this flips it to EXPIRED so every other reader
 * of the Subscription row (billing, admin dashboards, exports) sees
 * consistent state — matching the behavior SubscriptionsService.getCurrent()
 * already had before this was centralized here.
 */
export async function resolveOnlineLicense(
  clinicId: string,
  clinicRepo: Repository<Clinic>,
  subRepo: Repository<Subscription>,
): Promise<OnlineLockResult> {
  const clinic = await clinicRepo.findOne({ where: { id: clinicId } });

  if (!clinic) {
    return { isLocked: false, lockReason: '', plan: 'free', trialEndsAt: null, currentPeriodEnd: null };
  }

  if (!clinic.isActive) {
    return {
      isLocked: true,
      lockReason: 'deactivated',
      plan: clinic.plan,
      trialEndsAt: clinic.trialEndsAt ?? null,
      currentPeriodEnd: null,
    };
  }

  const now = new Date();

  if (clinic.plan === SubscriptionPlan.FREE) {
    const trialEnd = clinic.trialEndsAt ?? null;
    const isLocked = !!trialEnd && now.getTime() > new Date(trialEnd).getTime();
    return {
      isLocked,
      lockReason: isLocked ? 'trial_expired' : '',
      plan: clinic.plan,
      trialEndsAt: trialEnd,
      currentPeriodEnd: null,
    };
  }

  const sub = await subRepo.findOne({ where: { clinicId } });

  if (!sub) {
    return { isLocked: true, lockReason: 'no_sub', plan: clinic.plan, trialEndsAt: null, currentPeriodEnd: null };
  }

  if (sub.status === SubscriptionStatus.CANCELLED) {
    return { isLocked: true, lockReason: 'cancelled', plan: clinic.plan, trialEndsAt: null, currentPeriodEnd: sub.currentPeriodEnd ?? null };
  }

  const periodEnd = sub.currentPeriodEnd ?? null;
  const periodExpired = !!periodEnd && now.getTime() > new Date(periodEnd).getTime();

  if (periodExpired && sub.status === SubscriptionStatus.ACTIVE) {
    // Best-effort — never block the request over a failed write.
    await subRepo.update({ id: sub.id }, { status: SubscriptionStatus.EXPIRED }).catch(() => {});
  }

  const isLocked = sub.status === SubscriptionStatus.EXPIRED || periodExpired;

  return {
    isLocked,
    lockReason: isLocked ? 'subscription_expired' : '',
    plan: clinic.plan,
    trialEndsAt: null,
    currentPeriodEnd: periodEnd,
  };
}
