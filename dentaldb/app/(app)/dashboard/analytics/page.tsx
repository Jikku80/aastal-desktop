'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Calendar, CheckCircle, Building2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatMonthYear } from '@/lib/calendar';
import Header from '@/components/layout/Header';

const COLORS = ['#0e9de8','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

const STATUS_LABELS: Record<string,string> = {
  scheduled:'Scheduled', confirmed:'Confirmed', completed:'Completed',
  cancelled:'Cancelled', no_show:'No Show', in_progress:'In Progress',
};

function StatCard({ label, value, icon: Icon, color, i }: any) {
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
      className="card p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { activeBranch } = useAuthStore();
  const calendarType = useCalendarType();

  const { data: dashboard } = useQuery({
    queryKey: ['analytics-dashboard', activeBranch?.id, calendarType],
    queryFn: () =>
      analyticsApi.getDashboard({ branchId: activeBranch?.id, calendarType }).then(r => r.data),
  });

  const { data: aptStats } = useQuery({
    queryKey: ['analytics-appointments', activeBranch?.id, calendarType],
    queryFn: () =>
      analyticsApi.getAppointmentStats({ months: 6, branchId: activeBranch?.id, calendarType }).then(r => r.data),
  });

  const { data: forecast } = useQuery({
    queryKey: ['revenue-forecast'],
    queryFn: () => analyticsApi.getRevenueForecast().then(r => r.data),
  });

  const revenueChart = dashboard?.revenueChart || [];
  const forecastData = forecast?.dates?.slice(0,14).map((d: string, i: number) => ({
    date:      new Date(d).toLocaleDateString('en', { month:'short', day:'numeric' }),
    predicted: forecast.predicted_revenue[i],
    lower:     forecast.lower_bound[i],
    upper:     forecast.upper_bound[i],
  })) || [];

  const statusData = dashboard?.appointmentsByStatus
    ? Object.entries(dashboard.appointmentsByStatus)
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v as number }))
    : [];

  // Month label shown on the revenue stat card — respects BS/AD
  const thisMonthLabel = formatMonthYear(new Date(), calendarType);

  const summaryStats = [
    { label: "Today's Appointments", value: dashboard?.todayAppointments ?? '—', icon: Calendar,    color: 'bg-brand-600' },
    { label: 'Active Patients',       value: dashboard?.totalPatients      ?? '—', icon: Users,      color: 'bg-brand-600' },
    { label: 'New This Month',        value: dashboard?.newPatientsThisMonth?? '—', icon: TrendingUp, color: 'bg-emerald-600' },
    { label: `Revenue — ${thisMonthLabel}`,
      value: dashboard != null
        ? `NPR ${Math.round((dashboard.monthlyRevenue || 0) / 1000)}k` : '—',
      icon: CheckCircle, color: 'bg-amber-600' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Analytics" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-5">

        {/* Branch indicator */}
        {activeBranch && (
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(14,157,232,0.06)', border: '1px solid rgba(14,157,232,0.15)' }}>
            <Building2 size={13} className="text-brand-400 shrink-0" />
            <span className="text-xs text-brand-400 font-medium">Showing data for: {activeBranch.name}</span>
          </div>
        )}

        {/* Calendar mode badge */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            calendarType === 'BS'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-brand-500/10 text-brand-400'
          }`}>
            {calendarType === 'BS' ? '🇳🇵 Nepali BS calendar' : '🌐 English AD calendar'}
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {summaryStats.map((s, i) => <StatCard key={s.label} {...s} i={i} />)}
        </div>

        {/* Revenue + forecast */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
            className="card p-4 sm:p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1 text-sm">Revenue This Week</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Daily revenue in NPR{activeBranch ? ` · ${activeBranch.name}` : ''}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                  formatter={(v:any) => [`NPR ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#0e9de8" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
            className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Revenue Forecast</h3>
              <span className="badge bg-amber-500/10 text-amber-400 text-[10px]">AI Powered</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4">Next 14 days prediction</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                  formatter={(v:any) => [`NPR ${Number(v).toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} fill="url(#fg)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Appointment trends + status */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
            className="card p-4 sm:p-6 xl:col-span-2">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1 text-sm">Appointment Trends</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Last 6 months{activeBranch ? ` · ${activeBranch.name}` : ''}
              {' '}· {calendarType === 'BS' ? 'BS months' : 'AD months'}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aptStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:11, color:'var(--text-secondary)' }} />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
                <Bar dataKey="noShow"    stackId="a" fill="#6b7280" radius={[4,4,0,0]} name="No Show" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
            className="card p-4 sm:p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-1 text-sm">This Month</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              By status · {thisMonthLabel}
            </p>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={3} dataKey="value">
                      {statusData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {statusData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">No data yet</div>
            )}
          </motion.div>
        </div>

        {/* Monthly breakdown table */}
        {aptStats && aptStats.length > 0 && (
          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
            className="card overflow-hidden">
            <div className="px-4 sm:px-6 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">Monthly Breakdown</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {calendarType === 'BS' ? 'Nepali BS months' : 'Gregorian AD months'}
              </p>
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead style={{ background:'var(--bg-elevated)' }}>
                  <tr>
                    {['Month','Total','Completed','Cancelled','No Show','Rate'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 sm:px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aptStats.map((row: any) => (
                    <tr key={row.month} style={{ borderTop:'1px solid var(--border)' }}
                      className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 sm:px-6 py-3 text-sm font-medium text-[var(--text-primary)]">{row.month}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-[var(--text-secondary)]">{row.total}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-emerald-400">{row.completed}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-red-400">{row.cancelled}</td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-gray-400">{row.noShow}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-white/10 max-w-20">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width:`${row.completionRate}%` }} />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{row.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y" style={{ borderColor:'var(--border)' }}>
              {aptStats.map((row: any) => (
                <div key={row.month} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{row.month}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.total} total · {row.completed} completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{row.completionRate}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">completion</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
