'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart,
} from 'recharts';
import { analyticsApi, reportsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Header from '@/components/layout/Header';
import { format } from 'date-fns';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Calendar,
  Activity, AlertTriangle, Download, Loader2,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'];

function StatCard({ title, value, change, icon: Icon, color, prefix = '', suffix = '' }: {
  title: string; value: string | number; change?: number;
  icon: any; color: string; prefix?: string; suffix?: string;
}) {
  const isPos = (change ?? 0) >= 0;
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{title}</p>
    </div>
  );
}

function CT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--text-secondary)] mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-xs">{message}</div>
  );
}

export default function ClinicAnalyticsPage() {
  const { activeBranch } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'revenue'>('overview');

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['analytics-dashboard', activeBranch?.id],
    queryFn: () => analyticsApi.getDashboard({ branchId: activeBranch?.id }).then(r => r.data),
  });

  const { data: aptStats, isLoading: aptLoading } = useQuery({
    queryKey: ['analytics-appointments', activeBranch?.id],
    queryFn: () => analyticsApi.getAppointmentStats({ months: 6, branchId: activeBranch?.id }).then(r => r.data),
  });

  const { data: revenueByDoctor } = useQuery({
    queryKey: ['revenue-by-doctor', activeBranch?.id],
    queryFn: () => reportsApi.getRevenueByDoctor({ branchId: activeBranch?.id }).then(r => r.data),
  });

  const { data: revenueByService } = useQuery({
    queryKey: ['revenue-by-service', activeBranch?.id],
    queryFn: () => reportsApi.getRevenueByService({ branchId: activeBranch?.id }).then(r => r.data),
  });

  const isLoading = dashLoading || aptLoading;

  // Normalize appointment stats to chart data
  const aptChartData = (aptStats?.monthly ?? aptStats?.data ?? []).map((m: any) => ({
    date:      m.month ?? m.date ?? m.label,
    completed: m.completed ?? m.completedCount ?? 0,
    cancelled: m.cancelled ?? m.cancelledCount ?? 0,
    noShow:    m.noShow    ?? m.noShowCount    ?? 0,
    scheduled: m.scheduled ?? m.scheduledCount ?? 0,
    total:     m.total     ?? m.totalCount      ?? 0,
  }));

  const statusBreakdown = dashboard?.statusBreakdown ?? dashboard?.appointmentsByStatus ?? [];
  const pieData = Array.isArray(statusBreakdown)
    ? statusBreakdown.map((s: any, i: number) => ({
        name:  s.status ?? s.label ?? s.name,
        value: s.count  ?? s.value ?? 0,
        fill:  COLORS[i % COLORS.length],
      }))
    : [];

  const doctorData = (revenueByDoctor?.data ?? revenueByDoctor ?? []).slice(0, 6).map((d: any, i: number) => ({
    name:    d.doctorName ?? d.name ?? `Doctor ${i + 1}`,
    revenue: d.revenue ?? d.totalRevenue ?? 0,
    appointments: d.appointments ?? d.appointmentCount ?? 0,
  }));

  const serviceData = (revenueByService?.data ?? revenueByService ?? []).slice(0, 8).map((s: any, i: number) => ({
    name:  s.serviceName ?? s.name ?? `Service ${i + 1}`,
    value: s.revenue     ?? s.totalRevenue ?? s.count ?? 0,
    fill:  COLORS[i % COLORS.length],
  }));

  const totalRevenue  = dashboard?.totalRevenue  ?? dashboard?.revenue  ?? 0;
  const totalPatients = dashboard?.totalPatients ?? dashboard?.patients ?? 0;
  const totalApts     = dashboard?.totalAppointments ?? dashboard?.appointments ?? 0;
  const completionRate = dashboard?.completionRate ?? (totalApts > 0 ? Math.round(((dashboard?.completedAppointments ?? 0) / totalApts) * 100) : 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header title="Clinic Analytics" subtitle="Real-time clinic performance and insights" />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard title="Total Revenue"   value={totalRevenue}   prefix="$" icon={DollarSign}    color="#22c55e" />
              <StatCard title="Total Patients"  value={totalPatients}               icon={Users}         color="#3b82f6" />
              <StatCard title="Appointments"    value={totalApts}                   icon={Calendar}      color="#8b5cf6" />
              <StatCard title="Completion Rate" value={completionRate} suffix="%"   icon={Activity}      color="#f59e0b" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-[var(--border)]">
              {([
                { key: 'overview',      label: 'Overview' },
                { key: 'appointments',  label: 'Appointments' },
                { key: 'revenue',       label: 'Revenue' },
              ] as { key: typeof activeTab; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Appointment Status Breakdown</h3>
                  <div className="h-52">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {pieData.map((s: any, i: number) => <Cell key={i} fill={s.fill} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => v.toLocaleString()} contentStyle={{ fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="No appointment status data available" />}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Revenue by Service</h3>
                  <div className="h-52">
                    {serviceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={serviceData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {serviceData.map((s: any, i: number) => <Cell key={i} fill={s.fill} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => `$${v.toLocaleString()}`} contentStyle={{ fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="No service revenue data available" />}
                  </div>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Monthly Appointment Volume</h3>
                  <div className="h-56">
                    {aptChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aptChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3,3" stroke="var(--border)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 9 }} tickLine={false} />
                          <Tooltip content={<CT />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                          <Bar dataKey="cancelled" stackId="a" fill="#f59e0b" name="Cancelled" />
                          <Bar dataKey="noShow"    stackId="a" fill="#ef4444" name="No-show" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="No monthly appointment data available" />}
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Revenue by Doctor</h3>
                  <div className="h-52">
                    {doctorData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={doctorData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3,3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v: any) => `$${v.toLocaleString()}`} />
                          <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                            {doctorData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="No doctor revenue data available" />}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Revenue Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Revenue',    value: `$${totalRevenue.toLocaleString()}`,          color: '#22c55e' },
                      { label: 'Total Patients',   value: totalPatients.toLocaleString(),                color: '#3b82f6' },
                      { label: 'Avg per Patient',  value: totalPatients > 0 ? `$${Math.round(totalRevenue / totalPatients).toLocaleString()}` : '—', color: '#8b5cf6' },
                    ].map(s => (
                      <div key={s.label} className="p-4 rounded-xl border border-[var(--border)] text-center">
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
