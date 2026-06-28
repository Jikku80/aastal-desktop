'use client';

import { Clock, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Drop into any QUEUE-WHEN-OFFLINE screen (notifications, recalls, reviews,
 * payments) to show "queued, will send when online" status. Pulls from the
 * same /sync/status poll the offline banner uses — no extra request.
 *
 * Pass `actionTypes` to scope counts to just this screen's relevant queue
 * entries (e.g. ['recall.send'] on the recalls page) — otherwise it shows
 * the global outbox total across every queue-when-offline feature, which
 * is misleading on a screen-specific page (e.g. "3 queued" on the recalls
 * screen when those 3 are actually pending SMS sends, not recalls).
 *
 * Only renders when there's something to report; silent otherwise.
 */
export default function OutboxStatusBadge({ actionTypes }: { actionTypes?: string[] }) {
  const { outbox, isLoading } = useOnlineStatus();

  if (isLoading) return null;

  const entries = actionTypes
    ? actionTypes.map((t) => outbox.byActionType[t]).filter(Boolean)
    : Object.values(outbox.byActionType);

  const pending = actionTypes ? entries.reduce((sum, e) => sum + e.pending, 0) : outbox.pending;
  const failed = actionTypes ? entries.reduce((sum, e) => sum + e.failed, 0) : outbox.failed;

  if (pending === 0 && failed === 0) return null;

  return (
    <div className="flex items-center gap-3 text-[12px]">
      {pending > 0 && (
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <Clock size={12} />
          {pending} queued — will send when online
        </span>
      )}
      {failed > 0 && (
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ background: '#7f1d1d', color: '#fecaca' }}
        >
          <AlertTriangle size={12} />
          {failed} failed to send — check Outbox
        </span>
      )}
    </div>
  );
}
