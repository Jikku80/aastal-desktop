'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, Users, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Lock, Stethoscope, DollarSign, Building2 } from 'lucide-react';
import { endOfMonth, format, startOfMonth, startOfToday } from 'date-fns';
import { formatNepalClockTime } from '@/lib/timezone';
import { analyticsApi, appointmentsApi, commissionsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Appointment } from '@/types';

const VARIANTS = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const STATUS_ICON: Record<string, any> = {
  scheduled:   <Clock size={13} className="text-blue-400 shrink-0" />,
  confirmed:   <CheckCircle size={13} className="text-brand-400 shrink-0" />,
  completed:   <CheckCircle size={13} className="text-emerald-400 shrink-0" />,
  cancelled:   <XCircle size={13} className="text-red-400 shrink-0" />,
  no_show:     <AlertCircle size={13} className="text-gray-400 shrink-0" />,
  in_progress: <Clock size={13} className="text-amber-400 shrink-0" />,
};

const REVENUE_ROLES = new Set(['super_admin', 'owner', 'accountant']);

function StatCard({ icon: Icon, label, value, color, i, hidden, href }: any) {
  const router = useRouter();
  const clickable = !hidden && !!href;
  return (
    <motion.div
      custom={i}
      variants={VARIANTS}
      initial="hidden"
      animate="visible"
      onClick={clickable ? () => router.push(href) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') router.push(href); } : undefined}
      className={`card p-3.5 sm:p-5 transition-all ${
        clickable ? 'cursor-pointer hover:shadow-lg hover:border-[var(--brand)]/40 hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1.5 leading-tight">
            {label}
          </p>
          {hidden ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Lock size={12} className="text-[var(--text-muted)] shrink-0" />
              <p className="text-xs text-[var(--text-muted)]">Restricted</p>
            </div>
          ) : (
            <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">
              {value}
            </p>
          )}
        </div>
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
            hidden ? 'bg-white/5' : color
          }`}
        >
          {hidden
            ? <Lock size={14} className="text-[var(--text-muted)]" />
            : <Icon size={15} className="text-white" />
          }
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, activeBranch, branches } = useAuthStore();
  const { can }                          = usePermissions();
  const router                           = useRouter();
  const canSeeRevenue                    = can('analytics.view') || can('billing.view');
  const isAdmin                          = can('settings.manage') || can('branch.manage');
  const isAllBranches                    = !activeBranch && branches.length > 1;

  const { data: dashStats } = useQuery({
    queryKey: ['dashboard-stats', activeBranch?.id],
    queryFn: () =>
      analyticsApi.getDashboard({ branchId: activeBranch?.id }).then(r => r.data),
  });

  const { data: todayAppts } = useQuery({
    queryKey: ['today-appointments', activeBranch?.id],
    queryFn: () =>
      appointmentsApi.list({
        date:     format(startOfToday(), 'yyyy-MM-dd'),
        limit:    8,
        branchId: activeBranch?.id,
      }).then(r => r.data),
  });

  const { data: dentistPerf } = useQuery({
    queryKey: ['admin-dentist-performance'],
    queryFn:  () => usersApi.getAdminDentistPerformance().then(r => r.data),
    enabled:  isAdmin,
  });


  const { data: forecastData } = useQuery({
    queryKey: ['revenue-forecast', activeBranch?.id],
    queryFn: () => analyticsApi.getRevenueForecast({ branchId: activeBranch?.id }).then(r => r.data.forecast || []),
    staleTime: 1000 * 60 * 10,
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['admin-commissions-this-month'],
    queryFn: () => commissionsApi.getSummary({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate:   format(endOfMonth(new Date()),   'yyyy-MM-dd'),
    }).then(r => r.data),
    enabled: isAdmin,
  });

  // Merge actual commission into dentistPerf rows
  const dentistPerfWithCommission = (dentistPerf as any[] | undefined)?.map((d: any) => {
    const actual = commissionSummary?.doctors?.find((c: any) => c.doctorId === d.dentistId);
    return {
      ...d,
      actualCommission:    actual?.totalCommission    ?? null,
      actualServiceRevenue: actual?.totalServiceRevenue ?? null,
    };
  });

  const revenueChart = dashStats?.revenueChart || [];

  const branchRevenue: any[] = dashStats?.branchRevenue || [];

  const stats = [
    {
      icon: Calendar, label: "Today's Appointments",
      value: dashStats?.todayAppointments ?? '—',
      color: 'bg-brand-600', hidden: false, href: '/dashboard/appointments',
    },
    {
      icon: Users, label: 'Total Patients',
      value: dashStats?.totalPatients ?? '—',
      color: 'bg-brand-600', hidden: false, href: '/dashboard/patients',
    },
    {
      icon: CreditCard, label: "Today's Revenue",
      value: dashStats != null
        ? `NPR ${Math.round(Number(dashStats.todayRevenue)).toLocaleString()}` : '—',
      color: 'bg-emerald-600', hidden: !canSeeRevenue, href: '/dashboard/billing',
    },
    {
      icon: TrendingUp, label: 'Monthly Revenue',
      value: dashStats != null
        ? `NPR ${Math.round(Number(dashStats.monthlyRevenue)).toLocaleString()}` : '—',
      color: 'bg-amber-600', hidden: !canSeeRevenue, href: '/dashboard/billing',
    },
  ];

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        // title={`${greeting}, ${user?.role === 'dentist' ? 'Dr. ' : ''}${user?.lastName || 'there'}`}
        title={`${greeting}`}
        subtitle={activeBranch ? activeBranch.name : format(new Date(), 'EEEE, MMMM d yyyy')}
        action={{ label: 'New appointment', onClick: () => router.push('/dashboard/appointments') }}
      />

      <div className="page-container space-y-4 sm:space-y-5 flex-1">

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {stats.map((s, i) => <StatCard key={s.label} {...s} i={i} />)}
        </div>

        {/* ── Branch Revenue Breakdown (admin + all-branches view) ── */}
        {isAdmin && canSeeRevenue && isAllBranches && branchRevenue.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center">
                <Building2 size={15} className="text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">Branch Revenue</h3>
                <p className="text-[10px] text-[var(--text-muted)]">All branches · {format(new Date(), 'MMMM yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {branchRevenue.map((b: any) => (
                <div key={b.branchId} className="rounded-xl p-3.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0">
                      <Building2 size={12} className="text-brand-400" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.branchName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)]">Today</p>
                      <p className="text-xs font-semibold text-emerald-400">NPR {Number(b.todayRevenue).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)]">This Month</p>
                      <p className="text-xs font-semibold text-amber-400">NPR {Number(b.monthlyRevenue).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div className="mt-3 rounded-xl p-3.5 flex items-center justify-between"
              style={{ background: 'rgba(14,157,232,0.06)', border: '1px solid rgba(14,157,232,0.15)' }}>
              <p className="text-xs font-semibold text-brand-400">Total (All Branches)</p>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-muted)]">Today</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    NPR {branchRevenue.reduce((s: number, b: any) => s + Number(b.todayRevenue), 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-muted)]">This Month</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    NPR {branchRevenue.reduce((s: number, b: any) => s + Number(b.monthlyRevenue), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Revenue chart + today's appointments ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">

          {/* Revenue chart */}
          {canSeeRevenue ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4 sm:p-6 xl:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                    Revenue Overview
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    This week (NPR){activeBranch ? ` · ${activeBranch.name}` : ' · All branches'}
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={160} className="sm:!h-[200px]">
                <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#027cc6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#027cc6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--text-primary)',
                    }}
                    formatter={(v: any) => [`NPR ${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0e9de8"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4 sm:p-6 xl:col-span-2 flex items-center justify-center min-h-[160px] sm:min-h-[220px]"
            >
              <div className="text-center">
                <Lock size={28} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
                <p className="text-sm font-medium text-[var(--text-muted)]">Revenue data restricted</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">
                  Only admins and accountants can view revenue.
                </p>
              </div>
            </motion.div>
          )}


          {/* ── Revenue Forecast ── */}
          {canSeeRevenue && forecastData && forecastData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-4 sm:p-5 col-span-full"
            >
              <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1">Revenue Forecast</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">Actuals + 3-month linear projection</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={forecastData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v: any, name: string) => [`NPR ${Number(v).toLocaleString()}`, name === 'actual' ? 'Actual' : 'Projected']}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2}
                    fill="url(#forecastActual)" dot={false} name="actual" connectNulls={false} />
                  <Area type="monotone" dataKey="projected" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3"
                    fill="url(#forecastProjected)" dot={false} name="projected" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" /> Actual
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span className="w-3 h-0.5 bg-indigo-400 rounded-full inline-block border-dashed" /> Projected
                </span>
              </div>
            </motion.div>
          )}

          {/* Today's appointments */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm truncate pr-2">
                Today{activeBranch ? ` · ${activeBranch.name}` : ''}
              </h3>
              <button
                onClick={() => router.push('/dashboard/appointments')}
                className="text-xs text-brand-400 hover:text-brand-300 shrink-0"
              >
                View all →
              </button>
            </div>

            <div className="space-y-1.5">
              {!todayAppts?.data?.length ? (
                <div className="text-center py-8">
                  <Calendar size={24} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No appointments today</p>
                </div>
              ) : (
                (todayAppts.data as Appointment[]).slice(0, 6).map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => router.push('/dashboard/appointments')}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-600/15 flex items-center justify-center shrink-0 text-[10px] font-bold text-brand-400">
                      {apt.patient?.firstName?.[0]}{apt.patient?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {apt.patient?.firstName} {apt.patient?.lastName}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {formatNepalClockTime(apt.scheduledAt)} · {apt.type}
                        {apt.branch && ` · ${apt.branch.name}`}
                      </p>
                    </div>
                    {STATUS_ICON[apt.status]}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Dentist Performance (admin/owner only) ── */}
        {isAdmin && dentistPerf && (dentistPerf as any[]).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="card p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center">
                <Stethoscope size={15} className="text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">Doctor Performance — This Month</h3>
                <p className="text-[10px] text-[var(--text-muted)]">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    {['Doctor', 'Completed Apts', 'Service Revenue', 'Commission Earned'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dentistPerf as any[]).map((d: any, i: number) => {
                    const actual = commissionSummary?.doctors?.find((c: any) => c.doctorId === d.dentistId);
                    return (
                    <tr key={d.dentistId} style={{ borderBottom: i < (dentistPerf as any[]).length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                            {d.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <p className="font-medium text-[var(--text-primary)] text-sm">{d.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> {d.totalAppointments}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                        {actual ? `NPR ${Number(actual.totalServiceRevenue).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-amber-400">
                          {actual ? `NPR ${Number(actual.totalCommission).toLocaleString()}` : '—'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {(dentistPerf as any[]).map((d: any) => {
                const actual = commissionSummary?.doctors?.find((c: any) => c.doctorId === d.dentistId);
                return (
                  <div key={d.dentistId} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                        {d.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <p className="font-medium text-[var(--text-primary)] text-sm">{d.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)]">Completed</p>
                        <p className="text-xs font-semibold text-emerald-400">{d.totalAppointments}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)]">Service Revenue</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {actual ? `NPR ${Number(actual.totalServiceRevenue).toLocaleString()}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)]">Commission Earned</p>
                        <p className="text-xs font-semibold text-amber-400">
                          {actual ? `NPR ${Number(actual.totalCommission).toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Quick actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"
        >
          {[
            { label: 'Book Appointment', href: '/dashboard/appointments', color: 'text-brand-400 bg-brand-400/10 border-brand-400/20' },
            { label: 'Add Patient',      href: '/dashboard/patients',     color: 'text-brand-400 bg-brand-400/10 border-brand-400/20' },
            { label: 'Create Invoice',   href: '/dashboard/billing',      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
            { label: 'View Analytics',   href: '/dashboard/analytics',    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
          ].map(({ label, href, color }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className={`p-3 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${color}`}
            >
              {label} →
            </button>
          ))}
        </motion.div>

      </div>
    </div>
  );
}