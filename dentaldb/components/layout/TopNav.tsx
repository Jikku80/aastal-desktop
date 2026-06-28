'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, CreditCard,
  BarChart3, Stethoscope, Globe, Settings, LogOut,
  ChevronDown, Shield, Menu, X, GitBranch,
  Clock, CalendarOff, UserCircle, Layers, ClipboardCheck,
  ShieldCheck, Lock,
  Package, Archive, DollarSign, FileText, ListOrdered,
  Bell, FlaskConical, MessageSquare, Receipt, ClipboardList,
  Activity, TrendingUp, Smile, User, ScanLine, BarChart2,
  MapPin, Award, Sun, Moon, Droplet,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { usePermissionsStore } from '@/store/permissions.store';
import { useUILayoutStore } from '@/store/UILayout.store';
import { NAV_ITEMS } from '@/lib/permissions';
import { useFeatureAccess, type Feature } from '@/hooks/useFeatureAccess';
import { useTheme } from '@/contexts/ThemeProvider';
import { clsx } from 'clsx';
import BranchSwitcher from './BranchSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Calendar, Users, CreditCard,
  BarChart3, Stethoscope, Globe, Settings, GitBranch,
  Clock, CalendarOff, UserCircle, Layers, ClipboardCheck, Shield, ShieldCheck,
  Package, Archive, DollarSign, FileText, ListOrdered, Bell, FlaskConical,
  MessageSquare, Receipt, ClipboardList,
  Activity, TrendingUp, Smile, User, ScanLine, BarChart2,
  MapPin, Award, Droplet,
};

const NAV_FEATURE_MAP: Record<string, Feature | null> = {
  '/dashboard':                 null,
  '/dashboard/queue':           null,
  '/dashboard/appointments':    null,
  '/dashboard/patients':        null,
  '/dashboard/billing':         null,
  '/dashboard/analytics':       null,
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
  '/dashboard/commissions':     null,
  '/dashboard/expenses':        null,
  '/dashboard/payroll':         null,
  '/dashboard/reports':         null,
  '/dashboard/clinical-records':null,
  '/dashboard/recalls':         null,
  '/dashboard/lab-work':        null,
  '/dashboard/blood-test':      null,
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

/** Groups: each becomes a dropdown in the navbar. Anything not listed here
 *  renders as a standalone top-level link. */
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
    hrefs: ['/dashboard/patients', '/dashboard/clinical-records', '/dashboard/lab-work', '/dashboard/blood-test'],
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
      '/dashboard/analytics',
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
    label: 'Visuals',
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

export default function TopNav() {
  const pathname = usePathname();
  const { user, clinic, logout } = useAuthStore();
  const { can: canPerm } = usePermissionsStore();
  const { can: canFeature } = useFeatureAccess();
  const { resolved, setTheme } = useTheme();
  const { navHidden, setNavHidden } = useUILayoutStore();
  const isDark = resolved === 'dark';

  const [openGroup, setOpenGroup]   = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenGroups, setMobileOpenGroups] = useState<Record<string, boolean>>({});
  const lastScrollY = useRef(0);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setOpenGroup(null);
    setProfileOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (current > lastScrollY.current && current > 80) {
        setNavHidden(true);
        setOpenGroup(null);
        setProfileOpen(false);
      } else {
        setNavHidden(false);
      }
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    usePermissionsStore.getState().clearPermissions();
    window.location.replace('/auth/login');
  };

  const allowedNavItems = NAV_ITEMS.filter(item => canPerm(item.permission));
  const isOwner       = ['super_admin', 'owner'].includes(user?.role ?? '');
  const dashboardItem  = allowedNavItems.find(i => i.href === '/dashboard');
  const standaloneItems = allowedNavItems.filter(
    item => !GROUPED_HREFS.has(item.href as any) && item.href !== '/dashboard',
  );

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const renderLockedLink = (item: typeof NAV_ITEMS[number], indent = false) => (
    <Link key={item.href} href="/dashboard/settings?tab=Subscription"
      onClick={() => setMobileOpen(false)}
      title={`Upgrade plan to unlock ${item.label}`}
      className={clsx(
        'flex items-center gap-2.5 py-2 rounded-lg text-sm font-medium transition-all opacity-40 hover:opacity-60',
        indent ? 'px-3 pl-7' : 'px-3',
      )}>
      <span className="flex-1 truncate text-[var(--text-muted)]">{item.label}</span>
      <Lock size={11} className="text-[var(--text-muted)] shrink-0" />
    </Link>
  );

  const renderDropdownLink = (item: typeof NAV_ITEMS[number]) => {
    const Icon    = ICON_MAP[item.icon];
    const reqFeat = NAV_FEATURE_MAP[item.href];
    const locked  = reqFeat !== null && reqFeat !== undefined && !canFeature(reqFeat);
    if (locked) return renderLockedLink(item, true);
    const active = isActive(item.href);
    return (
      <Link key={item.href} href={item.href}
        onClick={() => { setOpenGroup(null); setMobileOpen(false); }}
        className={clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
          active ? 'text-brand-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        )}
        style={{ background: active ? 'rgba(14,157,232,0.1)' : undefined }}>
        {/* {Icon && <Icon size={14} className={active ? 'text-brand-400 shrink-0' : 'text-[var(--text-muted)] shrink-0'} />} */}
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const visibleGroups = NAV_GROUPS.map(group => ({
    group,
    items: allowedNavItems.filter(i => (group.hrefs as readonly string[]).includes(i.href)),
  })).filter(g => g.items.length > 0);

  return (
    <div ref={navRef}>
      <header className={`fixed left-3 right-3 lg:left-4 lg:right-4 z-[100] flex items-center gap-1 px-3 sm:px-4 lg:px-5 rounded-2xl shadow-xl transition-[top] duration-300 ease-in-out ${navHidden ? '-top-24' : 'top-3 lg:top-4'}`}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', height: '60px' }}>

        {/* Mobile menu toggle */}
        <button onClick={() => setMobileOpen(o => !o)}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 px-2">
          {dashboardItem && renderDropdownLink(dashboardItem)}

          {visibleGroups.map(({ group, items }) => {
            const GroupIcon = ICON_MAP[group.icon];
            const hasActive = items.some(i => isActive(i.href));
            const open = openGroup === group.id;
            return (
              <div key={group.id} className="relative shrink-0">
                <button
                  onClick={() => setOpenGroup(open ? null : group.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    hasActive ? 'text-brand-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                  style={{ background: open || hasActive ? 'rgba(14,157,232,0.08)' : undefined }}>
                  {/* {GroupIcon && <GroupIcon size={14} className={hasActive ? 'text-brand-400' : 'text-[var(--text-muted)]'} />} */}
                  <span>{group.label}</span>
                  <ChevronDown size={12} className={clsx('opacity-50 transition-transform', open && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-0 top-full mt-1.5 w-56 rounded-xl shadow-2xl p-1.5 z-[110]"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      {items.map(renderDropdownLink)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {standaloneItems.map(renderDropdownLink)}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto pl-2">
          {isOwner && clinic?.plan === 'free' && (
            <Link href="/dashboard/settings?tab=Subscription"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-brand-400 hover:bg-brand-400/10"
              style={{ border: '1px solid rgba(14,157,232,0.2)' }}>
              <Shield size={11} /> Upgrade
            </Link>
          )}

          <div className="hidden sm:block">
            <BranchSwitcher />
          </div>

          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: isDark ? '#fbbf24' : '#6366f1' }}>
            {isDark ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
          </button>

          <NotificationBell />

          {/* Profile menu */}
          <div className="relative">
            <button onClick={() => setProfileOpen(o => !o)}
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <span className="text-[11px] font-bold text-brand-400">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-2xl p-1.5 z-[110]"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.firstName} {user?.lastName}</p>
                    <span className={`text-[10px] font-medium capitalize px-1.5 py-0.5 rounded-md ${ROLE_COLORS[user?.role ?? ''] ?? 'text-gray-400 bg-gray-400/10'}`}>
                      {user?.role}
                    </span>
                  </div>
                  <Link href="/dashboard/profile" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5">
                    <UserCircle size={14} /> My Profile
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/5">
                    <LogOut size={14} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={`lg:hidden fixed left-3 right-3 z-[100] overflow-y-auto max-h-[calc(100vh-92px)] rounded-2xl shadow-xl transition-[top] duration-300 ease-in-out ${navHidden ? '-top-24' : 'top-[76px]'}`}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-col gap-1 p-3">
              {dashboardItem && renderDropdownLink(dashboardItem)}

              {visibleGroups.map(({ group, items }) => {
                const GroupIcon = ICON_MAP[group.icon];
                const expanded = !!mobileOpenGroups[group.id];
                const hasActive = items.some(i => isActive(i.href));
                return (
                  <div key={group.id}>
                    <button
                      onClick={() =>
                        setMobileOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        hasActive ? 'text-brand-400' : 'text-[var(--text-secondary)]',
                      )}
                      style={{ background: expanded || hasActive ? 'rgba(14,157,232,0.08)' : undefined }}
                    >
                      {/* {GroupIcon && (
                        <GroupIcon size={15} className={hasActive ? 'text-brand-400' : 'text-[var(--text-muted)]'} />
                      )} */}
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronDown size={13} className={clsx('opacity-50 transition-transform', expanded && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.12 }}
                          className="flex flex-col pl-2 overflow-hidden"
                        >
                          {items.map(renderDropdownLink)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {standaloneItems.map(renderDropdownLink)}

              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="sm:hidden px-1 pb-2">
                  <BranchSwitcher />
                </div>
                {isOwner && clinic?.plan === 'free' && (
                  <Link
                    href="/dashboard/settings?tab=Subscription"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-400"
                  >
                    <Shield size={14} /> Upgrade
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}