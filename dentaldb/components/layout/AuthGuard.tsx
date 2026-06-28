'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useAuthContext } from '@/contexts/AuthProvider';
import { usePermissionsStore } from '@/store/permissions.store';
import { NAV_ITEMS } from '@/lib/permissions';
import { Loader2 } from 'lucide-react';

// Paths inside (app) that do NOT require authentication
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isHydrated } = useAuthStore();
  const { loading, initialized }        = useAuthContext();
  const { can: canPerm }                = usePermissionsStore();

  // Auth pages — render immediately, no checks needed
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  // Still initialising — show spinner instead of redirecting prematurely
  const ready = isHydrated && initialized && !loading;

  // Find the most specific NAV_ITEMS entry whose href is a prefix of the current
  // path (e.g. '/dashboard/staff/123' matches '/dashboard/staff'), so deep/detail
  // routes inherit the same permission as their parent list page.
  const matchingNavItem = NAV_ITEMS
    .filter(item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const hasRouteAccess = !matchingNavItem || canPerm(matchingNavItem.permission);

  useEffect(() => {
    if (isPublic) return;
    if (ready && !isAuthenticated) {
      window.location.href = `/auth/login?from=${encodeURIComponent(pathname)}`;
    }
  }, [isPublic, ready, isAuthenticated, pathname, router]);

  if (isPublic) return <>{children}</>;

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!hasRouteAccess) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: 'var(--bg-base)' }}>
        <p className="text-lg font-semibold text-[var(--text-primary)]">You don't have access to this page</p>
        <p className="text-sm text-[var(--text-muted)]">Ask an administrator if you believe this is a mistake.</p>
        <button onClick={() => router.back()} className="mt-2 px-4 py-2 rounded-lg text-sm bg-[var(--brand)] text-white">
          Go back
        </button>
      </div>
    );
  }

  return <>{children}</>;
}