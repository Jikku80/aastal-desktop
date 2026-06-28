'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionsStore } from '@/store/permissions.store';
import { authApi, branchesApi, rbacApi } from '@/lib/api';

interface AuthContextValue { loading: boolean; initialized: boolean; }
const AuthContext = createContext<AuthContextValue>({ loading: true, initialized: false });

const REFRESH_INTERVAL_MS = 12 * 60 * 1000;
const OWNER_ROLES         = new Set(['super_admin', 'owner']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuth, logout, setBranches, setActiveBranch, isAuthenticated } = useAuthStore();
  const { setPermissions, clearPermissions } = usePermissionsStore();
  const [loading, setLoading]  = useState(true);
  const [initialized, setInit] = useState(false);
  const refreshTimer           = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRefreshTimer = () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try { await authApi.refresh(); }
      catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          logout();
          clearPermissions();
          if (typeof window !== 'undefined') window.location.href = '/auth/login';
        }
        // For 429/network errors, just skip this cycle — don't log out
        // or redirect, the next interval will retry.
      }
    }, REFRESH_INTERVAL_MS);
  };

  const loadBranches = async (currentUser: any) => {
    try {
      let accessible: any[] = [];
      if (OWNER_ROLES.has(currentUser?.role)) {
        const res = await branchesApi.list();
        accessible = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } else {
        try {
          const res = await branchesApi.myBranches();
          accessible = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        } catch {
          const allRes = await branchesApi.list();
          const all    = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.data ?? []);
          accessible   = all.filter((b: any) => b.staff?.some((s: any) => s.id === currentUser?.id));
          if (accessible.length === 0) accessible = all;
        }
      }
      setBranches(accessible);
      if (accessible.length === 1) setActiveBranch(accessible[0]);
    } catch {
      setBranches([]);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await rbacApi.getMyPermissions();
      setPermissions(res.data.permissions as string[]);
    } catch {
      clearPermissions();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) { setLoading(false); setInit(true); }
    }, 8000);

    const verify = async () => {
      // If store already has authenticated user (fresh login/register via window.location.href),
      // skip the /me round-trip and mark as initialized immediately
      if (isAuthenticated) {
        clearTimeout(timeout);
        if (!cancelled) { setLoading(false); setInit(true); }
        startRefreshTimer();
        return;
      }
      try {
        const res = await authApi.me();
        if (!cancelled) {
          setAuth(res.data.user, res.data.clinic);
          // me() now returns permissions — use them directly if present, else fetch
          if (res.data.permissions) {
            setPermissions(res.data.permissions);
          } else {
            await loadPermissions();
          }
          await loadBranches(res.data.user);
          startRefreshTimer();
        }
      } catch (meErr: any) {
        const meStatus = meErr?.response?.status;
        // If we're being rate-limited, don't hammer /auth/refresh too —
        // just treat as logged-out for now without further requests.
        if (meStatus === 429) {
          if (!cancelled) { logout(); clearPermissions(); }
        } else {
        try {
          await authApi.refresh();
          const res = await authApi.me();
          if (!cancelled) {
            setAuth(res.data.user, res.data.clinic);
            if (res.data.permissions) {
              setPermissions(res.data.permissions);
            } else {
              await loadPermissions();
            }
            await loadBranches(res.data.user);
            startRefreshTimer();
          }
        } catch {
          if (!cancelled) {
            logout();
            clearPermissions();
          }
        }
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) { setLoading(false); setInit(true); }
      }
    };

    verify();
    return () => {
      cancelled = true;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated && refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{ loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);