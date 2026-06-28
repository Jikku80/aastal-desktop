'use client';

import { useQuery } from '@tanstack/react-query';
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
 */
export function useOnlineStatus() {
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

  return {
    ...(data ?? DEFAULT_STATUS),
    isLoading,
  };
}
