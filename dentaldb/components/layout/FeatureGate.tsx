'use client';
import Link from 'next/link';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { useFeatureAccess, type Feature } from '@/hooks/useFeatureAccess';

const FEATURE_LABELS: Record<Feature, string> = {
  attendance:         'Attendance',
  leave:              'Leave Management',
  website:            'Website Builder',
  website_multipage:  'Multi-Page Website',
  api_access:         'API Access',
  multi_branch:       'Multiple Branches',
  branches_unlimited: 'Unlimited Branches',
  sms_reminders:      'SMS Reminders',
  notifications:      'Notifications',
};

const FEATURE_PLAN_REQUIRED: Record<Feature, string> = {
  attendance:         'Pro',
  leave:              'Pro',
  website:            'Enterprise',
  website_multipage:  'Enterprise',
  api_access:         'Enterprise',
  multi_branch:       'Enterprise',
  branches_unlimited: 'Enterprise',
  sms_reminders:      'Pro',
  notifications:      'Pro',
};

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
}

export default function FeatureGate({ feature, children }: FeatureGateProps) {
  const { can } = useFeatureAccess();

  if (can(feature)) return <>{children}</>;

  const featureLabel  = FEATURE_LABELS[feature]     ?? feature;
  const requiredPlan  = FEATURE_PLAN_REQUIRED[feature] ?? 'Pro';

  return (
    <div className="flex flex-col h-screen items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Lock icon */}
        <div className="w-20 h-20 rounded-3xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6"
          style={{ border: '1px solid rgba(14,157,232,0.2)' }}>
          <Lock size={32} className="text-brand-400" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {featureLabel} is locked
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
          Upgrade to the <strong className="text-[var(--text-secondary)]">{requiredPlan}</strong> plan or higher
          to unlock {featureLabel} and more powerful features.
        </p>

        {/* Plan comparison teaser */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { name: 'Pro',        price: '1,499', color: 'text-brand-400',  locked: ['website_multipage','api_access','branches_unlimited','website','multi_branch'].includes(feature) },
            { name: 'Enterprise', price: '10,000', color: 'text-amber-400', locked: false },
          ].map(plan => (
            <div key={plan.name}
              className="rounded-xl p-3 text-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className={`text-xs font-semibold mb-1 ${plan.color}`}>{plan.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">NPR {plan.price}/mo</p>
              <p className="text-[10px] mt-1">
                {plan.locked
                  ? <span className="text-red-400">✗ Locked</span>
                  : <span className="text-emerald-400">✓ Included</span>}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard/settings?tab=Subscription"
          className="btn-primary w-full justify-center py-3 text-sm gap-2 inline-flex">
          <Zap size={15} />
          Upgrade Now
          <ArrowRight size={14} />
        </Link>

        <p className="text-xs text-[var(--text-muted)] mt-4">
          Go to <Link href="/dashboard/settings?tab=Subscription" className="text-brand-400 hover:underline">Settings → Subscription</Link> to manage your plan.
        </p>
      </div>
    </div>
  );
}
