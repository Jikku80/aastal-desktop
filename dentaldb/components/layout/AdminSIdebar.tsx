'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, UsersRound, CreditCard, LogOut,
  ChevronRight, Menu, X, LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { usePermissionsStore } from '@/store/permissions.store';
import { clsx } from 'clsx';

const ADMIN_NAV = [
  { label: 'Dashboard',     href: '/admin/dashboard',     icon: LayoutDashboard },
  { label: 'Users',         href: '/admin/users',          icon: UsersRound },
  { label: 'Subscriptions', href: '/admin/subscription',   icon: CreditCard },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    usePermissionsStore.getState().clearPermissions();
    window.location.replace('/auth/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}
      >
        <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
          <ShieldAlert size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[var(--text-primary)] text-sm font-display">
            Super Admin
          </p>
          <p className="text-[10px] text-red-400/70 truncate">ClinicKarobar</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto lg:hidden btn-ghost w-7 h-7 p-0 justify-center"
        >
          <X size={14} />
        </button>
      </div>

      {/* Admin badge */}
      <div className="px-3 py-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <ShieldAlert size={11} className="text-red-400 shrink-0" />
          <span className="text-xs text-red-400 font-medium">Platform Control Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">
        {ADMIN_NAV.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 text-sm font-medium',
                'transition-all duration-150 group',
                active
                  ? 'text-red-400'
                  : 'text-[var(--text-secondary)] hover:text-red-400',
              )}
              style={{ background: active ? 'rgba(239,68,68,0.1)' : undefined }}
            >
              <Icon
                size={15}
                className={clsx(
                  'shrink-0 transition-colors',
                  active
                    ? 'text-red-400'
                    : 'text-[var(--text-muted)] group-hover:text-red-400',
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight size={12} className="opacity-60 shrink-0" />}
            </Link>
          );
        })}

        {/* Back to app */}
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href="/dashboard/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
              text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150 group"
          >
            <LayoutDashboard
              size={14}
              className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
            />
            <span className="flex-1 truncate">Back to App</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert size={11} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {'Super Admin'}
            </p>
            <p className="text-[10px] text-red-400/70 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
            text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/5 transition-all duration-150"
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 xl:w-60 z-40"
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid rgba(239,68,68,0.15)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <Menu size={16} className="text-red-400" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col lg:hidden"
              style={{
                background: 'var(--bg-surface)',
                borderRight: '1px solid rgba(239,68,68,0.15)',
              }}
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}