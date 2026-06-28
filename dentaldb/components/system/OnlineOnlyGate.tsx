'use client';

import { ReactNode } from 'react';
import { CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Wraps the content of an ONLINE-ONLY module's page (subscriptions,
 * super-admin, website-builder, seo, discovery, telehealth, patient-auth,
 * patient-portal — per the agreed module classification). Matches the
 * backend's online-only-gate.middleware.ts, which returns a clean
 * { error: 'online_required' } for these same routes when offline instead
 * of a raw DB error — this component is the UI-side equivalent: show a
 * clear banner instead of letting child components hit that error and
 * render broken loading states or crash on missing data.
 *
 * Usage: wrap a page's content, e.g.
 *   export default function Page() {
 *     return <OnlineOnlyGate featureName="Website Builder"><PageContent /></OnlineOnlyGate>;
 *   }
 */
export default function OnlineOnlyGate({
  children,
  featureName,
}: {
  children: ReactNode;
  featureName: string;
}) {
  const { isOnline, isLoading } = useOnlineStatus();

  // Don't flash the offline state before the first status check resolves.
  if (isLoading) return null;

  if (!isOnline) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <CloudOff size={32} style={{ color: 'var(--text-secondary)' }} />
        <div className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {featureName} requires an internet connection
        </div>
        <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          This feature isn't available in offline mode. It'll work again as soon as you're back online.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
