'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  Building2, Users, CheckCircle2, XCircle,
  TrendingUp, Clock, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate">{value}</p>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-snug">{label}</p>
        {sub && <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-500/10 text-gray-400',
  basic: 'bg-brand-500/10 text-brand-400',
  pro: 'bg-purple-500/10 text-purple-400',
  enterprise: 'bg-amber-500/10 text-amber-400',
};

export default function AdminDashboardPage() {
  const calendarType = useCalendarType();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn:  () => adminApi.getDashboard().then(r => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data || {};

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Super Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">Platform-wide analytics &amp; overview</p>
        </div>
        <button onClick={() => refetch()}
          className="btn-ghost gap-1.5 text-xs sm:text-sm shrink-0">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stat Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Building2}    label="Total Clinics"          value={stats.totalClinics ?? 0}
          color="bg-brand-500/10 text-brand-400" />
        <StatCard icon={Users}        label="Total Users"            value={stats.totalUsers ?? 0}
          color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={CheckCircle2} label="Active Subscriptions"   value={stats.activeSubscriptions ?? 0}
          color="bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={XCircle}      label="Expired Subscriptions"  value={stats.expiredSubscriptions ?? 0}
          color="bg-red-500/10 text-red-400" />
      </div>

      {/* Revenue + Plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue + Pending — stacked on mobile */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard icon={TrendingUp} label="Est. Monthly Revenue"
            value={`NPR ${(stats.estimatedMonthlyRevenue ?? 0).toLocaleString()}`}
            color="bg-amber-500/10 text-amber-400" />
          <StatCard icon={Clock}      label="Pending Requests"
            value={stats.pendingRequests ?? 0}
            sub="Awaiting review"
            color="bg-orange-500/10 text-orange-400" />
        </div>

        {/* Plan Breakdown */}
        <div className="rounded-2xl p-4 sm:p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Plan Breakdown</p>
          {stats.planBreakdown?.length ? (
            <div className="space-y-2">
              {stats.planBreakdown.map((row: any) => (
                <div key={row.plan} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[row.plan] || 'bg-gray-500/10 text-gray-400'}`}>
                    {row.plan}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{row.count} clinics</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No active subscriptions</p>
          )}
        </div>
      </div>

      {/* Recent Clinics */}
      <div className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recently Joined Clinics</p>
        {stats.recentClinics?.length ? (
          <div className="space-y-2">
            {stats.recentClinics.map((clinic: any) => (
              <div key={clinic.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)' }}>
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{clinic.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{clinic.email || clinic.slug}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[clinic.plan] || 'bg-gray-500/10 text-gray-400'}`}>
                    {clinic.plan}
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 hidden sm:block">
                    {clinic.createdAt ? formatDate(new Date(clinic.createdAt), calendarType) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">No clinics yet</p>
        )}
      </div>
    </div>
  );
}
