'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, CreditCard,
  BarChart3, Stethoscope, Globe, Settings, LogOut,
  ChevronRight, Shield, Menu, X, GitBranch,
  Clock, CalendarOff, UserCircle, Layers, ClipboardCheck,
  ShieldCheck, Lock,
  Package, Archive, DollarSign, FileText, ListOrdered,
  Bell, FlaskConical, MessageSquare, Receipt, ChevronDown, ClipboardList,
  Activity, TrendingUp, Smile, User, ScanLine, BarChart2,
  MapPin, Award, Droplet, Sparkles, Pill, Landmark,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { usePermissionsStore } from '@/store/permissions.store';
import { NAV_ITEMS } from '@/lib/permissions';
import { useFeatureAccess, type Feature } from '@/hooks/useFeatureAccess';
import { clsx } from 'clsx';
import BranchSwitcher from './BranchSwitcher';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Calendar, Users, CreditCard,
  BarChart3, Stethoscope, Globe, Settings, GitBranch,
  Clock, CalendarOff, UserCircle, Layers, ClipboardCheck, Shield, ShieldCheck,
  Package, Archive, DollarSign, FileText, ListOrdered, Bell, FlaskConical,
  MessageSquare, Receipt, ClipboardList,
  Activity, TrendingUp, Smile, User, ScanLine, BarChart2,
  MapPin, Award, Droplet, Sparkles, Pill, Landmark,
};

const NAV_FEATURE_MAP: Record<string, Feature | null> = {
  '/dashboard':                 null,
  '/dashboard/queue':           null,
  '/dashboard/appointments':    null,
  '/dashboard/patients':        null,
  '/dashboard/billing':         null,
  '/dashboard/analytics':       null,
  '/dashboard/jwantra-ai':      null,
  '/dashboard/staff':           null,
  '/dashboard/staff-performance':null,
  '/dashboard/branches':        null,
  '/dashboard/public-listing':  null,
  '/dashboard/shifts':          'attendance',
  '/dashboard/attendance':      'attendance',
  '/dashboard/leave':           'leave',
  '/website-builder':           'website',
  '/dashboard/roles':           null,
  '/dashboard/settings':        null,
  '/dashboard/services':        null,
  '/dashboard/inventory':       null,
  '/dashboard/pharmacy':        null,
  '/dashboard/commissions':     null,
  '/dashboard/expenses':        null,
  '/dashboard/payroll':         null,
  '/dashboard/reports':         null,
  '/dashboard/finance':         null,
  '/dashboard/clinical-records':null,
  '/dashboard/recalls':         null,
  '/dashboard/lab-work':        null,
  '/dashboard/holidays':        null,
  '/dashboard/tasks':           null,
  '/dashboard/imaging':         null,
  '/dashboard/dental-chart':    null,
  '/dashboard/anatomy':         null,
  '/dashboard/timeline':        null,
  '/dashboard/health-trends':   null,
  '/dashboard/lab-results':     null,
  '/dashboard/clinic-analytics':null,
  '/dashboard/dermatology':     null,
};

/** Groups: each group has a label, icon and list of hrefs that belong to it.
 *  Items listed here are rendered inside the collapsible group.
 *  Any item NOT in any group falls into the top-level (standalone) list. */
const NAV_GROUPS = [
  {
    id: 'appointments',
    label: 'Appointments',
    icon: 'Calendar',
    hrefs: ['/dashboard/queue', '/dashboard/appointments', '/dashboard/recalls', '/dashboard/tasks'],
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: 'Users',
    hrefs: ['/dashboard/patients', '/dashboard/clinical-records', '/dashboard/lab-work'],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'CreditCard',
    hrefs: [
      '/dashboard/billing',
      '/dashboard/expenses',
      '/dashboard/payroll',
      '/dashboard/commissions',
      '/dashboard/reports',
      '/dashboard/finance',
      '/dashboard/analytics',
      '/dashboard/jwantra-ai',
    ],
  },
  {
    id: 'hr',
    label: 'Staff & HR',
    icon: 'Stethoscope',
    hrefs: [
      '/dashboard/staff',
      '/dashboard/staff-performance',
      '/dashboard/shifts',
      '/dashboard/attendance',
      '/dashboard/leave',
      '/dashboard/holidays',
    ],
  },
  {
    id: 'clinic',
    label: 'Clinic',
    icon: 'Settings',
    hrefs: [
      '/dashboard/services',
      '/dashboard/inventory',
      '/dashboard/pharmacy',
      '/dashboard/branches',
      '/dashboard/roles',
      '/dashboard/audit',
      '/dashboard/settings',
    ],
  },
  {
    id: 'online',
    label: 'Online Presence',
    icon: 'Globe',
    hrefs: ['/website-builder', '/dashboard/public-listing', '/dashboard/messages', '/dashboard/seo'],
  },
  {
    id: 'medical-viz',
    label: 'Medical Visualization',
    icon: 'Activity',
    hrefs: [
      '/dashboard/imaging',
      '/dashboard/dental-chart',
      '/dashboard/anatomy',
      '/dashboard/timeline',
      '/dashboard/health-trends',
      '/dashboard/lab-results',
      '/dashboard/clinic-analytics',
      '/dashboard/dermatology',
    ],
  },
] as const;

// hrefs that belong to any group
const GROUPED_HREFS = new Set(NAV_GROUPS.flatMap(g => g.hrefs));

const ROLE_COLORS: Record<string, string> = {
  owner:        'text-amber-400 bg-amber-400/10',
  dentist:      'text-brand-400 bg-brand-400/10',
  doctor:       'text-brand-400 bg-brand-400/10',
  receptionist: 'text-emerald-400 bg-emerald-400/10',
  accountant:   'text-brand-400 bg-brand-400/10',
  staff:        'text-gray-400 bg-gray-400/10',
  super_admin:  'text-red-400 bg-red-400/10',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, clinic, logout, activeBranch, branches } = useAuthStore();
  const { can: canPerm } = usePermissionsStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can: canFeature } = useFeatureAccess();

  // Which groups are open — default open if current path is inside the group
  const defaultOpen = NAV_GROUPS.reduce<Record<string, boolean>>((acc, g) => {
    acc[g.id] = g.hrefs.some(h => pathname === h || (h !== '/dashboard' && pathname.startsWith(h)));
    return acc;
  }, {});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpen);

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    usePermissionsStore.getState().clearPermissions();
    window.location.replace('/auth/login');
  };

  const allowedNavItems = NAV_ITEMS.filter(item => canPerm(item.permission));
  const isOwner       = ['super_admin', 'owner'].includes(user?.role ?? '');

  const renderNavItem = (item: typeof NAV_ITEMS[number], indent = false) => {
    const Icon    = ICON_MAP[item.icon];
    const active  = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
    const reqFeat = NAV_FEATURE_MAP[item.href];
    const locked  = reqFeat !== null && reqFeat !== undefined && !canFeature(reqFeat);

    if (locked) {
      return (
        <Link key={item.href}
          href="/dashboard/settings?tab=Subscription"
          onClick={() => setMobileOpen(false)}
          title={`Upgrade plan to unlock ${item.label}`}
          className={clsx(
            'flex items-center gap-3 py-2 rounded-xl mb-0.5 text-sm font-medium transition-all opacity-40 hover:opacity-60',
            indent ? 'px-3 pl-8' : 'px-3',
          )}>
          {Icon && <Icon size={15} className="text-[var(--text-muted)] shrink-0" />}
          <span className="flex-1 truncate text-[var(--text-muted)]">{item.label}</span>
          <Lock size={11} className="text-[var(--text-muted)] shrink-0" />
        </Link>
      );
    }

    return (
      <Link key={item.href} href={item.href}
        onClick={() => setMobileOpen(false)}
        className={clsx(
          'flex items-center gap-3 py-2 rounded-xl mb-0.5 text-sm font-medium',
          'transition-all duration-150 group',
          indent ? 'px-3 pl-8' : 'px-3',
          active ? 'text-brand-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        )}
        style={{ background: active ? 'rgba(14,157,232,0.1)' : undefined }}>
        {Icon && (
          <Icon size={15}
            className={active ? 'text-brand-400 shrink-0' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] shrink-0'} />
        )}
        <span className="flex-1 truncate">{item.label}</span>
        {active && <ChevronRight size={12} className="opacity-60 shrink-0" />}
      </Link>
    );
  };

  const SidebarContent = () => {
    // standalone items = allowed items that are NOT in any group
    const standaloneItems = allowedNavItems.filter(
      item => !GROUPED_HREFS.has(item.href as any) && item.href !== '/dashboard',
    );
    const dashboardItem = allowedNavItems.find(i => i.href === '/dashboard');

    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm font-display">D</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[var(--text-primary)] text-sm font-display">ClinicKarobar</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{clinic?.name || '…'}</p>
          </div>
          <button onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden btn-ghost w-7 h-7 p-0 justify-center">
            <X size={14} />
          </button>
        </div>

        {/* Plan badge */}
        {isOwner && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Shield size={11} className="text-brand-400" />
                <span className="text-xs text-[var(--text-secondary)] capitalize">{clinic?.plan || 'free'}</span>
              </div>
              {clinic?.plan === 'free' && (
                <Link href="/dashboard/settings?tab=Subscription"
                  className="text-[10px] text-brand-400 hover:text-brand-300 font-medium">
                  Upgrade
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">

          {/* Dashboard — always standalone */}
          {dashboardItem && renderNavItem(dashboardItem, false)}

          {/* Grouped sections */}
          {NAV_GROUPS.map(group => {
            const groupItems = allowedNavItems.filter(i => (group.hrefs as readonly string[]).includes(i.href));
            if (groupItems.length === 0) return null;

            const GroupIcon = ICON_MAP[group.icon];
            const isOpen    = !!openGroups[group.id];
            const hasActive = groupItems.some(
              i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)),
            );

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
                    'transition-all duration-150 group',
                    hasActive && !isOpen
                      ? 'text-brand-400'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                  style={{ background: hasActive && !isOpen ? 'rgba(14,157,232,0.08)' : undefined }}
                >
                  {GroupIcon && (
                    <GroupIcon size={15}
                      className={clsx(
                        'shrink-0 transition-colors',
                        hasActive && !isOpen
                          ? 'text-brand-400'
                          : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
                      )} />
                  )}
                  <span className="flex-1 truncate text-left">{group.label}</span>
                  <ChevronDown
                    size={13}
                    className={clsx(
                      'shrink-0 transition-transform duration-200 opacity-50',
                      isOpen ? 'rotate-180' : '',
                    )} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pl-2 mt-0.5 space-y-0.5 pb-1"
                        style={{ borderLeft: '1px solid var(--border)', marginLeft: '19px' }}>
                        {groupItems.map(item => renderNavItem(item, true))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Standalone items not in any group */}
          {standaloneItems.map(item => renderNavItem(item, false))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
          <Link href="/dashboard/profile"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all duration-150">
            <UserCircle size={14} />
            <span>My Profile</span>
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/5 transition-all duration-150">
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 xl:w-60 z-40"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </aside>

      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <Menu size={16} className="text-[var(--text-primary)]" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col lg:hidden"
              style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}