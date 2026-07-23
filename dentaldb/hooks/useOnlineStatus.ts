'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '@/lib/api';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  totalPending: number;
  totalConflict: number;
  remoteConfigured: boolean;
  outbox: {
    pending: number;
    sent: number;
    failed: number;
    byActionType: Record<string, { pending: number; failed: number }>;
  };
  perEntity: Record<string, { pending: number; conflict: number }>;
}

const DEFAULT_STATUS: SyncStatus = {
  isOnline: true,
  lastSyncAt: null,
  totalPending: 0,
  totalConflict: 0,
  remoteConfigured: false,
  outbox: { pending: 0, sent: 0, failed: 0, byActionType: {} },
  perEntity: {},
};

/**
 * Polls /sync/status every 15s (matching ConnectivityService's own poll
 * interval on the backend — no point polling faster than the source of
 * truth updates). On a normal online/Postgres deployment this still works
 * fine: isOnline is always true and outbox counts are always zero, so
 * components using this hook don't need a separate "is this Electron"
 * branch — they just render nothing differently when everything's online.
 *
 * Also listens for the browser's native 'online' event (fires as soon as
 * the OS reports a network interface came back up — typically well under
 * a second, vs. waiting out the rest of the 15s poll interval) and, on
 * that signal, kicks an immediate /sync/trigger + status refetch rather
 * than waiting for the next scheduled poll. This is a renderer-side nudge
 * only — ConnectivityService's own poll is still the source of truth for
 * whether the LOCAL BACKEND can actually reach the remote server (the
 * renderer's browser 'online' event just means SOME network interface is
 * up, not that the specific remote host is reachable).
 */
export function useOnlineStatus() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => (await syncApi.status()).data as SyncStatus,
    refetchInterval: 15_000,
    // If the status check itself fails (e.g. the local backend is mid-
    // restart), default to "online" rather than flashing a false offline
    // banner — a real offline state will be caught by the next successful
    // poll showing isOnline: false from the backend's own connectivity
    // check, not by this request failing.
    retry: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      // Check remoteConfigured fresh (not the closed-over `data` from
      // render) before nudging — on a normal online/Postgres deployment
      // there's no remote to sync with at all, so skip the trigger call
      // entirely rather than firing it and letting it no-op server-side.
      syncApi.status()
        .then(({ data: s }) => {
          if (s?.remoteConfigured) {
            return syncApi.trigger().catch(() => {
              // Best-effort nudge — if the local backend genuinely can't reach
              // the remote yet, ConnectivityService's own poll will pick it up
              // on its next cycle regardless.
            });
          }
        })
        .catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    };
    window.addEventListener('online', handleOnline);

    // Also nudge once on mount. The 'online' event above only fires on a
    // transition — it never fires just because the app was opened while
    // the network interface was already up, which is the normal case.
    // ConnectivityService's own boot-time poll now covers this on the
    // backend side too (see the isOnline tri-state fix), but this renderer
    // side nudge is a cheap, harmless belt-and-braces: if the window
    // reloaded (e.g. after an auto-update) while the backend process kept
    // running and had already finished its own boot sync minutes earlier,
    // this still gets a fresh pull without waiting up to
    // PERIODIC_SYNC_INTERVAL_MS for the next automatic tick.
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  return {
    ...(data ?? DEFAULT_STATUS),
    isLoading,
  };
}