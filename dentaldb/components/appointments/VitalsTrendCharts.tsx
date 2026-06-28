'use client';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Loader2, Activity, Heart, Wind, Weight } from 'lucide-react';
import { vitalsApi } from '@/lib/api';

// ── Tooltip ───────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg text-xs"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value} {p.unit}
        </p>
      ))}
    </div>
  );
}

// ── Single chart card ─────────────────────────────────────────────────────────
function ChartCard({
  title, icon: Icon, children,
}: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-4">
        <Icon size={12} /> {title}
      </p>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VitalsTrendCharts({ patientId }: { patientId: string }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['vitals-history', patientId],
    queryFn:  () => vitalsApi.getPatientHistory(patientId).then(r => r.data),
    enabled:  !!patientId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity size={32} className="text-[var(--text-muted)] mb-3 opacity-40" />
        <p className="text-sm font-medium text-[var(--text-muted)]">No vitals recorded yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
          Vitals are added during appointments
        </p>
      </div>
    );
  }

  // Prepare data oldest→newest (charts read left→right)
  const chartData = [...records].reverse().map((v: any, i: number) => ({
    label:       format(new Date(v.recordedAt), 'MMM d'),
    visit:       `Visit ${i + 1}`,
    systolic:    v.systolic    ?? null,
    diastolic:   v.diastolic   ?? null,
    pulse:       v.pulse       ?? null,
    temperature: v.temperature != null ? Number(v.temperature) : null,
    weight:      v.weight      != null ? Number(v.weight)      : null,
    spo2:        v.spo2        ?? null,
    bloodSugar:  v.bloodSugar  != null ? Number(v.bloodSugar)  : null,
  }));

  const hasBP     = chartData.some(d => d.systolic != null || d.diastolic != null);
  const hasPulse  = chartData.some(d => d.pulse != null);
  const hasWeight = chartData.some(d => d.weight != null);
  const hasSpo2   = chartData.some(d => d.spo2 != null);

  const axisStyle = { fill: 'var(--text-muted)', fontSize: 10 };
  const gridStyle = { stroke: 'var(--border)', strokeDasharray: '3 3' };

  // Latest values summary
  const latest = records[0];

  return (
    <div className="space-y-4">
      {/* Latest reading summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: 'BP', icon: Heart,
            value: latest.systolic ? `${latest.systolic}/${latest.diastolic}` : '—',
            unit: 'mmHg',
            alert: latest.systolic > 140 || latest.diastolic > 90,
          },
          {
            label: 'SpO₂', icon: Wind,
            value: latest.spo2 ?? '—',
            unit: '%',
            alert: latest.spo2 != null && latest.spo2 < 95,
          },
          {
            label: 'Pulse', icon: Activity,
            value: latest.pulse ?? '—',
            unit: 'bpm',
            alert: false,
          },
          {
            label: 'Weight', icon: Weight,
            value: latest.weight != null ? Number(latest.weight) : '—',
            unit: 'kg',
            alert: false,
          },
        ].map(({ label, icon: Icon, value, unit, alert }) => (
          <div
            key={label}
            className={`rounded-xl p-3 text-center ${alert ? 'bg-red-400/10 border-red-400/30' : ''}`}
            style={!alert ? { background: 'var(--bg-elevated)', border: '1px solid var(--border)' } : { border: '1px solid' }}
          >
            <Icon size={12} className={`mx-auto mb-1 ${alert ? 'text-red-400' : 'text-[var(--text-muted)]'}`} />
            <p className={`text-base font-bold ${alert ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{value}</p>
            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{unit}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-muted)] text-right">
        Last {records.length} readings · most recent first shown at right
      </p>

      {/* BP Chart */}
      {hasBP && (
        <ChartCard title="Blood Pressure" icon={Heart}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: '140', fill: '#ef4444', fontSize: 9 }} />
              <ReferenceLine y={90}  stroke="#f97316" strokeDasharray="4 4" strokeWidth={1} label={{ value: '90',  fill: '#f97316', fontSize: 9 }} />
              <Line
                type="monotone" dataKey="systolic" name="Systolic"
                stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }}
                connectNulls unit=" mmHg"
              />
              <Line
                type="monotone" dataKey="diastolic" name="Diastolic"
                stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }}
                connectNulls unit=" mmHg"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* SpO₂ Chart */}
      {hasSpo2 && (
        <ChartCard title="Oxygen Saturation (SpO₂)" icon={Wind}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} domain={[85, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: '95%', fill: '#ef4444', fontSize: 9 }} />
              <Line
                type="monotone" dataKey="spo2" name="SpO₂"
                stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }}
                connectNulls unit="%"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Weight Chart */}
      {hasWeight && (
        <ChartCard title="Weight" icon={Weight}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="weight" name="Weight"
                stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: '#34d399' }}
                connectNulls unit=" kg"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Pulse (if recorded, no separate chart needed but show in BP chart area) */}
      {hasPulse && !hasBP && (
        <ChartCard title="Pulse" icon={Activity}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="pulse" name="Pulse"
                stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }}
                connectNulls unit=" bpm"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}