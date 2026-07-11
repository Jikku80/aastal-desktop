'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useAuthContext } from '@/contexts/AuthProvider';
import { usePermissions } from '@/store/permissions.store';
import { useUILayoutStore } from '@/store/UILayout.store';
import { NAV_ITEMS } from '@/lib/permissions';
import TopNav from '@/components/layout/TopNav';
import ContextSidebar from '@/components/layout/ContextSIdebar';
import SubscriptionGate from '@/components/layout/SubscriptionGate';

const SIDEBAR_MARGIN_EXPANDED  = '332px'; // 308px panel + 12px left inset + 12px gap
const SIDEBAR_MARGIN_COLLAPSED = '80px';  // 56px rail + 12px left inset + 12px gap
const SIDEBAR_MARGIN_CLOSED    = '0px';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const { loading }                     = useAuthContext();
  const { can, isLoaded }               = usePermissions();
  const router                          = useRouter();
  const pathname                        = usePathname();
  const { contextSidebarCollapsed, contextSidebarClosed } = useUILayoutStore();

  const matchedNav = NAV_ITEMS.find(
    (item) => item.href !== '/dashboard' && pathname.startsWith(item.href),
  );

  const forbidden =
    !loading && isAuthenticated && isLoaded &&
    matchedNav !== undefined && !can(matchedNav.permission);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) router.replace('/auth/login');
  }, [loading, isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-lg font-display">D</span>
          </div>
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (forbidden) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <TopNav />
        <main className="min-h-screen flex flex-col items-center justify-center" style={{ paddingTop: '88px' }}>
          <div className="text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚫</span>
            </div>
            <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-3">403</h1>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Access Forbidden</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-8">
              You don't have permission to view this page. Contact your administrator if you believe this is an error.
            </p>
            <button onClick={() => router.push('/dashboard/profile')} className="btn-primary mx-auto">← Back to Dashboard</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <TopNav />
      <ContextSidebar />
      <main className="min-h-screen flex flex-col" style={{ paddingTop: '88px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}>
        <div
          className="context-sidebar-offset transition-[margin-left] duration-200 ease-out"
          style={{ '--context-sidebar-margin': contextSidebarClosed
            ? SIDEBAR_MARGIN_CLOSED
            : contextSidebarCollapsed
              ? SIDEBAR_MARGIN_COLLAPSED
              : SIDEBAR_MARGIN_EXPANDED,
          } as React.CSSProperties}
        >
          <SubscriptionGate>{children}</SubscriptionGate>
        </div>
      </main>
    </div>
  );
}