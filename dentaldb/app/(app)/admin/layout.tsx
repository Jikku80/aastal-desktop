'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import AdminSidebar from '@/components/layout/AdminSIdebar';
import OnlineOnlyGate from '@/components/system/OnlineOnlyGate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    if (user?.role !== 'super_admin') { router.replace('/dashboard/profile'); }
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated || !isAuthenticated || user?.role !== 'super_admin') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <AdminSidebar />
      <main className="flex-1 lg:ml-56 xl:ml-60 min-h-screen flex flex-col">
        <OnlineOnlyGate featureName="Platform Admin">
          {children}
        </OnlineOnlyGate>
      </main>
    </div>
  );
}