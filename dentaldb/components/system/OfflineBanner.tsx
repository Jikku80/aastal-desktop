'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Global, persistent indicator — NOT a dismissible toast, since "you're
 * working offline" is ongoing state the user should be able to glance at
 * any time, not a one-off event. Only renders when genuinely offline; a
 * normal online (Postgres/web) deployment never shows this, since isOnline
 * defaults to true there (see ConnectivityService on the backend).
 */
export default function OfflineBanner() {
  const { isOnline, totalPending, isLoading } = useOnlineStatus();

  if (isLoading || isOnline) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-1.5 text-[12px] font-medium"
      style={{ background: '#7c2d12', color: '#fed7aa' }}
      role="status"
    >
      <WifiOff size={13} />
      <span>
        Working offline — changes are saved locally
        {totalPending > 0 ? ` (${totalPending} pending sync)` : ''}.
      </span>
    </div>
  );
}
