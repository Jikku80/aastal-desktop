import { Repository } from 'typeorm';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { SyncMeta } from '../sync/entities/sync-meta.entity';

// Local-only bookkeeping key in sync_meta (never synced — see SyncMeta's
// docstring). Stores the latest wall-clock time this offline instance has
// ever genuinely observed, so a user winding the OS clock backwards can't
// "un-expire" a trial or subscription that has already lapsed.
const CLOCK_ANCHOR_KEY = 'license_clock_anchor';

// How far the system clock is allowed to appear to jump backwards (relative
// to the latest timestamp we've ever seen) before we stop trusting it and
// pin to the anchor instead. Generous enough to absorb legitimate NTP/DST
// corrections without opening a multi-day window for dodging a lock.
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export type OfflineLockReason = '' | 'trial_expired' | 'subscription_expired' | 'deactivated';

export interface OfflineLockResult {
  isLocked: boolean;
  lockReason: OfflineLockReason;
  plan: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Returns "now", but never earlier than the latest timestamp this instance
 * has previously recorded. Persists the new high-water mark back to
 * sync_meta. This is the anti-clock-rollback guard for the offline license
 * check below — without it, setting the OS clock back to before
 * trialEndsAt/subscriptionEndsAt would trivially defeat the lock.
 */
async function getEffectiveNow(metaRepo: Repository<SyncMeta>): Promise<Date> {
  const now = new Date();
  const row = await metaRepo.findOne({ where: { key: CLOCK_ANCHOR_KEY } });
  const anchor = row?.value ? new Date(row.value) : null;

  const clockLooksRolledBack =
    !!anchor && now.getTime() < anchor.getTime() - ROLLBACK_TOLERANCE_MS;

  const effectiveNow = clockLooksRolledBack ? anchor! : now;
  const newAnchorTime = Math.max(effectiveNow.getTime(), anchor?.getTime() ?? 0);

  if (!anchor || newAnchorTime !== anchor.getTime()) {
    await metaRepo.save({ key: CLOCK_ANCHOR_KEY, value: new Date(newAnchorTime).toISOString() });
  }

  return effectiveNow;
}

/**
 * Computes trial/subscription lock state for the offline (SQLite/desktop)
 * build directly off the local Clinic row — the only subscription-shaped
 * data that exists offline (the Subscription entity itself is online-only,
 * see offline-entities.ts). Clinic.plan / trialEndsAt / subscriptionEndsAt
 * are kept current here by the ordinary Clinic sync (sync-registry.ts)
 * whenever the device has connectivity — see SyncService.pushPending for
 * the matching write-side protection that stops a locally-tampered copy of
 * these three fields from ever overwriting the server's truth on push.
 */
export async function resolveOfflineLicense(
  clinicId: string,
  clinicRepo: Repository<Clinic>,
  metaRepo: Repository<SyncMeta>,
): Promise<OfflineLockResult> {
  const clinic = await clinicRepo.findOne({ where: { id: clinicId } });
  const effectiveNow = await getEffectiveNow(metaRepo);

  if (!clinic) {
    return { isLocked: false, lockReason: '', plan: 'free', trialEndsAt: null, currentPeriodEnd: null };
  }

  if (!clinic.isActive) {
    return {
      isLocked: true,
      lockReason: 'deactivated',
      plan: clinic.plan,
      trialEndsAt: clinic.trialEndsAt ?? null,
      currentPeriodEnd: clinic.subscriptionEndsAt ?? null,
    };
  }

  if (clinic.plan === SubscriptionPlan.FREE) {
    const trialEnd = clinic.trialEndsAt ?? null;
    const isLocked = !!trialEnd && effectiveNow.getTime() > new Date(trialEnd).getTime();
    return {
      isLocked,
      lockReason: isLocked ? 'trial_expired' : '',
      plan: clinic.plan,
      trialEndsAt: trialEnd,
      currentPeriodEnd: null,
    };
  }

  // Paid plan (basic/pro/enterprise): subscriptionEndsAt is the local
  // mirror of the hosted Subscription's currentPeriodEnd, written together
  // by SubscriptionsService.upgradePlan and pulled down by the Clinic sync.
  const periodEnd = clinic.subscriptionEndsAt ?? null;
  const isLocked = !!periodEnd && effectiveNow.getTime() > new Date(periodEnd).getTime();
  return {
    isLocked,
    lockReason: isLocked ? 'subscription_expired' : '',
    plan: clinic.plan,
    trialEndsAt: null,
    currentPeriodEnd: periodEnd,
  };
}
