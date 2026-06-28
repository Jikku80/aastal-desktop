'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { Users, TrendingUp, Star, Calendar, DollarSign, CheckCircle, AlertCircle, Award } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)] font-medium">{label}</p>
        <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Doctor Row ────────────────────────────────────────────────────────────────
function DoctorRow({ d, rank }: { d: any; rank: number }) {
  const showRate = d.totalAppointments > 0
    ? Math.round(((d.totalAppointments - (d.noShows ?? 0)) / d.totalAppointments) * 100)
    : null;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm flex-shrink-0">
        {medal ?? rank}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand)] to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {d.firstName?.[0]}{d.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--text-primary)] text-sm truncate">
          Dr. {d.firstName} {d.lastName}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">{d.role} {d.specialization ? `· ${d.specialization}` : ''}</p>
      </div>
      <div className="hidden sm:flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="font-bold text-[var(--text-primary)]">{d.completedAppointments ?? 0}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Completed</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--text-primary)]">
            {d.totalRevenue != null ? `NPR ${Number(d.totalRevenue).toLocaleString()}` : '—'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">Revenue</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--text-primary)] flex items-center gap-1">
            {d.averageRating != null ? (
              <><Star size={11} className="text-amber-400 fill-amber-400" />{Number(d.averageRating).toFixed(1)}</>
            ) : '—'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">Rating</p>
        </div>
        {showRate != null && (
          <div className="text-center">
            <p className={`font-bold text-sm ${showRate >= 85 ? 'text-emerald-500' : showRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {showRate}%
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Show rate</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffPerformancePage() {
  const [sortBy, setSortBy] = useState<'revenue' | 'appointments' | 'rating'>('appointments');
  const [selected, setSelected] = useState<any | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dentist-performance'],
    queryFn: () => usersApi.getAdminDentistPerformance().then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const doctors: any[] = data?.data || data || [];

  const sorted = [...doctors].sort((a, b) => {
    if (sortBy === 'revenue')      return (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0);
    if (sortBy === 'rating')       return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    return (b.completedAppointments ?? b.totalAppointments ?? 0) - (a.completedAppointments ?? a.totalAppointments ?? 0);
  });

  // Aggregated totals
  const totals = doctors.reduce((acc, d) => ({
    appointments: acc.appointments + (d.completedAppointments ?? 0),
    revenue:      acc.revenue      + (Number(d.totalRevenue) ?? 0),
    noShows:      acc.noShows      + (d.noShows ?? 0),
  }), { appointments: 0, revenue: 0, noShows: 0 });

  const avgRating = doctors.length > 0
    ? doctors.reduce((s, d) => s + (Number(d.averageRating) || 0), 0) / doctors.filter(d => d.averageRating != null).length
    : null;

  // Chart data
  const barData = sorted.slice(0, 8).map(d => ({
    name: `Dr. ${d.lastName}`,
    completed: d.completedAppointments ?? 0,
    revenue: Number(d.totalRevenue ?? 0),
  }));

  const radarData = selected
    ? [
        { metric: 'Completed',  value: Math.min(100, ((selected.completedAppointments ?? 0) / Math.max(...doctors.map(d => d.completedAppointments ?? 1))) * 100) },
        { metric: 'Revenue',    value: Math.min(100, ((Number(selected.totalRevenue) ?? 0) / Math.max(...doctors.map(d => Number(d.totalRevenue) ?? 1))) * 100) },
        { metric: 'Rating',     value: Math.min(100, ((Number(selected.averageRating) ?? 0) / 5) * 100) },
        { metric: 'Show Rate',  value: selected.totalAppointments > 0 ? Math.round(((selected.totalAppointments - (selected.noShows ?? 0)) / selected.totalAppointments) * 100) : 0 },
        { metric: 'Reviews',    value: Math.min(100, ((selected.totalReviews ?? 0) / Math.max(...doctors.map(d => d.totalReviews ?? 1))) * 100) },
      ]
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)]">
      <Header
        title="Staff Performance"
        subtitle="KPIs per doctor — appointments, revenue, ratings & show rate"
      />

      <div className="flex-1 p-4 md:p-6 space-y-5">

        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Doctors" value={doctors.length} icon={Users} color="bg-sky-100 text-sky-600" />
          <MetricCard label="Appointments Completed" value={totals.appointments.toLocaleString()} icon={CheckCircle} color="bg-emerald-100 text-emerald-600" />
          <MetricCard label="Total Revenue" value={`NPR ${totals.revenue.toLocaleString()}`} icon={DollarSign} color="bg-violet-100 text-violet-600" />
          <MetricCard label="Avg Rating" value={avgRating != null ? avgRating.toFixed(1) : '—'} sub={`across ${doctors.filter(d => d.averageRating != null).length} doctors`} icon={Star} color="bg-amber-100 text-amber-600" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error || doctors.length === 0 ? (
          <div className="card p-12 text-center">
            <AlertCircle size={40} className="text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-[var(--text-secondary)]">No performance data available</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Data appears once appointments are completed.</p>
          </div>
        ) : (
          <>
            {/* Bar Chart */}
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[var(--text-primary)] text-sm">Appointments Completed by Doctor</h2>
                <div className="flex gap-1.5">
                  {([['appointments', 'Appts'], ['revenue', 'Revenue'], ['rating', 'Rating']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setSortBy(k)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
                        ${sortBy === k ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => sortBy === 'revenue' ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
                    formatter={(v: any) => [sortBy === 'revenue' ? `NPR ${Number(v).toLocaleString()}` : v, sortBy === 'revenue' ? 'Revenue' : 'Completed']}
                  />
                  <Bar dataKey={sortBy === 'revenue' ? 'revenue' : 'completed'} fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Two-column: leaderboard + radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Leaderboard */}
              <div className="lg:col-span-2 space-y-2">
                <h2 className="font-semibold text-[var(--text-primary)] text-sm mb-1">Doctor Leaderboard</h2>
                {sorted.map((d, i) => (
                  <button key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)} className="w-full text-left">
                    <DoctorRow d={d} rank={i + 1} />
                  </button>
                ))}
              </div>

              {/* Radar for selected doctor */}
              <div className="card p-4">
                {selected ? (
                  <>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1">
                      Dr. {selected.firstName} {selected.lastName}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mb-3">Relative performance vs team</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData} margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <Radar name="Performance" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5 text-xs">
                      {[
                        { label: 'Completed', val: selected.completedAppointments ?? 0 },
                        { label: 'Revenue', val: `NPR ${Number(selected.totalRevenue ?? 0).toLocaleString()}` },
                        { label: 'Avg Rating', val: selected.averageRating != null ? `${Number(selected.averageRating).toFixed(1)} ★` : '—' },
                        { label: 'Total Reviews', val: selected.totalReviews ?? 0 },
                        { label: 'No-shows', val: selected.noShows ?? 0 },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-[var(--text-muted)]">{row.label}</span>
                          <span className="font-semibold text-[var(--text-primary)]">{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <TrendingUp size={32} className="text-[var(--text-muted)] opacity-30 mb-2" />
                    <p className="text-sm text-[var(--text-muted)]">Click a doctor to see their radar chart</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
