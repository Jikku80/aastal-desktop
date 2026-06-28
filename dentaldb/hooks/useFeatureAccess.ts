'use client';
import { useAuthStore } from '@/store/auth.store';

export type Feature =
  | 'attendance'
  | 'leave'
  | 'website'
  | 'website_multipage'
  | 'api_access'
  | 'multi_branch'
  | 'branches_unlimited'
  | 'sms_reminders'
  | 'notifications';

type Plan = 'free' | 'pro' | 'enterprise';

const PLAN_FEATURES: Record<Plan, Feature[]> = {
  free: [
    'attendance','leave','website','website_multipage','api_access',
    'multi_branch','branches_unlimited','sms_reminders','notifications',
  ],
  pro: [
    'attendance','leave','sms_reminders','notifications',
    'multi_branch', // Pro can have multiple branches (paid per branch)
  ],
  enterprise: [
    'attendance','leave','website','website_multipage','api_access',
    'multi_branch','branches_unlimited','sms_reminders','notifications',
  ],
};

export function useFeatureAccess() {
  const { clinic, user } = useAuthStore();

  if (user?.role === 'super_admin') {
    return {
      can: (_feature: Feature) => true,
      cannot: (_feature: Feature) => false,
      plan: 'enterprise' as Plan,
      maxBranches: Infinity,
    };
  }

  const plan = (clinic?.plan || 'free') as Plan;
  const allowed = PLAN_FEATURES[plan] ?? [];

  // Both pro and enterprise use settings.numBranches (set by super admin or payment)
  const purchasedBranches = ((clinic as any)?.settings?.numBranches as number) ?? 1;

  const maxBranches =
    plan === 'free'       ? Infinity :
    plan === 'pro'        ? purchasedBranches :
    plan === 'enterprise' ? purchasedBranches :
    1;

  return {
    can:              (feature: Feature) => allowed.includes(feature),
    cannot:           (feature: Feature) => !allowed.includes(feature),
    plan,
    maxBranches,
    purchasedBranches,
  };
}
