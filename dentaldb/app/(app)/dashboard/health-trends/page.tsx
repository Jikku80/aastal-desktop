'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  ComposedChart,
} from 'recharts';
import { patientsApi, vitalsApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import Header from '@/components/layout/Header';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Heart, Activity,
  Droplets, Scale, Brain, Search, Zap, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type MetricKey = 'bloodPressureSystolic' | 'bloodPressureDiastolic' | 'bloodSugar' | 'weight' | 'painScore' | 'heartRate' | 'oxygenSaturation' | 'temperature';

interface HealthDataPoint {
  date:                   string;
  bloodPressureSystolic?:  number;
  bloodPressureDiastolic?: number;
  bloodSugar?:             number;
  weight?:                 number;
  painScore?:              number;
  heartRate?:              number;
  oxygenSaturation?:       number;
  temperature?:            number;
  appointmentId?:          string;
}

const METRIC_CONFIG: Record<MetricKey, {
  label: string; unit: string; icon: any; color: string;
  normalMin: number; normalMax: number;
  criticalMin?: number; criticalMax?: number;
}> = {
  bloodPressureSystolic:  { label: 'BP Systolic',   unit: 'mmHg', icon: Heart,    color: '#ef4444', normalMin: 90,   normalMax: 120, criticalMax: 180 },
  bloodPressureDiastolic: { label: 'BP Diastolic',  unit: 'mmHg', icon: Heart,    color: '#f97316', normalMin: 60,   normalMax: 80,  criticalMax: 120 },
  bloodSugar:             { label: 'Blood Sugar',   unit: 'mg/dL',icon: Droplets, color: '#3b82f6', normalMin: 70,   normalMax: 140, criticalMax: 400, criticalMin: 50 },
  weight:                 { label: 'Weight',        unit: 'kg',   icon: Scale,    color: '#8b5cf6', normalMin: 40,   normalMax: 120 },
  painScore:              { label: 'Pain Score',    unit: '/10',  icon: Activity, color: '#ec4899', normalMin: 0,    normalMax: 3,   criticalMax: 8 },
  heartRate:              { label: 'Heart Rate',    unit: 'bpm',  icon: Heart,    color: '#22c55e', normalMin: 60,   normalMax: 100, criticalMax: 150, criticalMin: 40 },
  oxygenSaturation:       { label: 'SpO₂',          unit: '%',    icon: Activity, color: '#06b6d4', normalMin: 95,   normalMax: 100, criticalMin: 90 },
  temperature:            { label: 'Temperature',   unit: '°C',   icon: Zap,      color: '#f59e0b', normalMin: 36.1, normalMax: 37.2, criticalMax: 39 },
};

function MetricStatCard({ metric, data, isSelected, onClick }: {
  metric: MetricKey; data: HealthDataPoint[]; isSelected: boolean; onClick: () => void;
}) {
  const cfg    = METRIC_CONFIG[metric];
  const Icon   = cfg.icon;
  const values = data.map(d => d[metric]).filter((v): v is number => v !== undefined && v !== null);
  if (!values.length) return null;

  const latest  = values[values.length - 1];
  const prev    = values[values.length - 2] ?? latest;
  const trend   = latest - prev;
  const isHigh  = latest > cfg.normalMax;
  const isLow   = latest < cfg.normalMin;
  const isCrit  = (cfg.criticalMax !== undefined && latest > cfg.criticalMax) || (cfg.criticalMin !== undefined && latest < cfg.criticalMin);
  const status  = isCrit ? 'critical' : isHigh || isLow ? 'warning' : 'normal';

  const statusColors = {
    normal:   { bg: '#f0fdf4', border: '#86efac', text: '#22c55e' },
    warning:  { bg: '#fffbeb', border: '#fcd34d', text: '#f59e0b' },
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#ef4444' },
  };
  const sc = statusColors[status];

  return (
    <button onClick={onClick}
      className="text-left p-4 rounded-xl border transition-all hover:shadow-md"
      style={{
        background: isSelected ? sc.bg : 'var(--bg-surface)',
        borderColor: isSelected ? sc.border : 'var(--border)',
        boxShadow: isSelected ? `0 0 0 2px ${sc.border}` : undefined,
      }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${cfg.color}20` }}>
            <Icon size={14} style={{ color: cfg.color }} />
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)]">{cfg.label}</span>
        </div>
        {isCrit && <AlertTriangle size={12} className="text-red-500" />}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold" style={{ color: cfg.color }}>
          {metric === 'weight' || metric === 'temperature' ? latest?.toFixed(1) : Math.round(latest ?? 0)}
        </span>
        <span className="text-xs text-[var(--text-secondary)] mb-0.5">{cfg.unit}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
          {status === 'critical' ? 'Critical' : status === 'warning' ? 'Out of range' : 'Normal'}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-0.5">
          {trend > 0 ? <TrendingUp size={10} className="text-red-500" /> : trend < 0 ? <TrendingDown size={10} className="text-green-500" /> : <Minus size={10} />}
          {Math.abs(trend).toFixed(1)}
        </span>
      </div>
      <div className="mt-2 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.slice(-14)}>
            <Line type="monotone" dataKey={metric} stroke={cfg.color} strokeWidth={1.5} dot={false} />
            <ReferenceLine y={cfg.normalMax} stroke={cfg.color} strokeDasharray="2,2" strokeWidth={0.5} />
            <ReferenceLine y={cfg.normalMin} stroke={cfg.color} strokeDasharray="2,2" strokeWidth={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}

function AIInsights({ data, metric }: { data: HealthDataPoint[]; metric: MetricKey }) {
  const cfg    = METRIC_CONFIG[metric];
  const values = data.map(d => d[metric]).filter((v): v is number => v !== undefined && v !== null);
  if (!values.length) return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1"><Brain size={12} /> Health Insights</p>
      <p className="text-xs text-[var(--text-secondary)]">No data available for {cfg.label}.</p>
    </div>
  );

  const avg    = values.reduce((a, b) => a + b, 0) / values.length;
  const max    = Math.max(...values);
  const min    = Math.min(...values);
  const latest = values[values.length - 1];
  const trend  = values.length >= 4
    ? (values.slice(-Math.ceil(values.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(values.length / 2))
      - (values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 2))
    : 0;

  const abnormal = values.filter(v => v > cfg.normalMax || v < cfg.normalMin).length;
  const abnormalPct = Math.round((abnormal / values.length) * 100);

  const insights: { type: 'info' | 'warning' | 'critical'; text: string }[] = [];

  if (latest > (cfg.criticalMax ?? Infinity)) insights.push({ type: 'critical', text: `Current ${cfg.label} is critically high at ${latest} ${cfg.unit}. Immediate attention required.` });
  else if (latest < (cfg.criticalMin ?? -Infinity)) insights.push({ type: 'critical', text: `Current ${cfg.label} is critically low at ${latest} ${cfg.unit}. Immediate attention required.` });
  else if (latest > cfg.normalMax) insights.push({ type: 'warning', text: `${cfg.label} is above normal range (${cfg.normalMin}–${cfg.normalMax} ${cfg.unit}). Current: ${latest}.` });
  else if (latest < cfg.normalMin) insights.push({ type: 'warning', text: `${cfg.label} is below normal range. Current: ${latest} ${cfg.unit}.` });

  if (abnormalPct > 40) insights.push({ type: 'warning', text: `${abnormalPct}% of readings are outside the normal range. Consider reviewing treatment plan.` });
  if (Math.abs(trend) > cfg.normalMax * 0.1) insights.push({ type: trend > 0 ? 'warning' : 'info', text: `Recent trend: ${trend > 0 ? '↑' : '↓'} ${Math.abs(trend).toFixed(1)} ${cfg.unit}. ${trend > 0 ? 'Increasing pattern detected.' : 'Decreasing pattern detected.'}` });
  if (insights.length === 0) insights.push({ type: 'info', text: `${cfg.label} readings are within normal range. Average: ${avg.toFixed(1)} ${cfg.unit} across ${values.length} readings.` });

  const typeStyle = {
    info:     { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: '💡' },
    warning:  { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '⚠️' },
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '🚨' },
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1"><Brain size={12} /> Health Insights</p>
      {insights.map((ins, i) => {
        const ts = typeStyle[ins.type];
        return (
          <div key={i} className="flex gap-2 p-2.5 rounded-lg border text-xs" style={{ background: ts.bg, borderColor: ts.border, color: ts.text }}>
            <span>{ts.icon}</span>
            <p>{ins.text}</p>
          </div>
        );
      })}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[['Avg', avg.toFixed(1)], ['Max', max.toFixed(1)], ['Min', min.toFixed(1)]].map(([l, v]) => (
          <div key={l} className="text-center p-2 bg-[var(--bg-muted)] rounded-lg">
            <p className="text-xs font-bold text-[var(--text-primary)]">{v}</p>
            <p className="text-[9px] text-[var(--text-secondary)]">{l} ({cfg.unit})</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--text-secondary)] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HealthTrendsPage() {
  const [search, setSearch]     = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedMetric, setSelectedMetric]   = useState<MetricKey>('bloodPressureSystolic');

  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', search],
    queryFn: () => patientsApi.list({ search, limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  // Fetch real vitals from vitalsApi
  const { data: vitalsHistory, isLoading: vitalsLoading } = useQuery({
    queryKey: ['patient-vitals-history', selectedPatient?.id],
    queryFn: async () => {
      const r = await vitalsApi.getPatientHistory(selectedPatient.id);
      return r.data?.data ?? r.data ?? [];
    },
    enabled: !!selectedPatient?.id,
  });

  // Normalize vitals data to HealthDataPoint format
  const allData: HealthDataPoint[] = useMemo(() => {
    if (!vitalsHistory?.length) return [];
    return vitalsHistory
      .map((v: any) => ({
        date:                   v.recordedAt ?? v.createdAt ?? v.date,
        bloodPressureSystolic:  v.bloodPressureSystolic  ?? v.bp_systolic  ?? v.bpSystolic,
        bloodPressureDiastolic: v.bloodPressureDiastolic ?? v.bp_diastolic ?? v.bpDiastolic,
        bloodSugar:             v.bloodSugar   ?? v.blood_sugar   ?? v.glucose,
        weight:                 v.weight,
        painScore:              v.painScore    ?? v.pain_score,
        heartRate:              v.heartRate    ?? v.heart_rate    ?? v.pulse,
        oxygenSaturation:       v.oxygenSaturation ?? v.spo2     ?? v.oxygen,
        temperature:            v.temperature  ?? v.temp,
        appointmentId:          v.appointmentId,
      }))
      .filter((d: HealthDataPoint) => d.date)
      .sort((a: HealthDataPoint, b: HealthDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [vitalsHistory]);

  const cfg = METRIC_CONFIG[selectedMetric];
  const Icon = cfg.icon;

  const chartData = allData.map(d => ({
    ...d,
    date: (() => { try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; } })(),
  }));

  const hasCritical = allData.some(d => {
    const v = d[selectedMetric];
    return v !== undefined && (
      (cfg.criticalMax !== undefined && v > cfg.criticalMax) ||
      (cfg.criticalMin !== undefined && v < cfg.criticalMin)
    );
  });

  // Metrics that have at least one data point
  const metricsWithData = (Object.keys(METRIC_CONFIG) as MetricKey[]).filter(m =>
    allData.some(d => d[m] !== undefined && d[m] !== null)
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header title="Health Trends" subtitle="Patient vitals history and health analytics" />

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-4">
        <div className="flex-1 max-w-xs relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            placeholder="Search patient…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {patients.length > 0 && search.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-[var(--border)] rounded-lg shadow-lg bg-[var(--bg-surface)] z-10">
              {patients.map((p: any) => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(''); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                  {p.firstName} {p.lastName} · {p.phone}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedPatient && (
          <div className="text-xs text-[var(--text-secondary)]">
            Patient: <span className="font-medium text-[var(--text-primary)]">{selectedPatient.firstName} {selectedPatient.lastName}</span>
            {allData.length > 0 && <span className="ml-2">· {allData.length} readings</span>}
          </div>
        )}
        {hasCritical && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            <AlertTriangle size={12} /> Critical readings detected
          </div>
        )}
      </div>

      {!selectedPatient ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
          <Activity size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Health Trend Analytics</p>
          <p className="text-sm mt-1 opacity-60">Search for a patient to view their vitals history</p>
        </div>
      ) : vitalsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : allData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
          <Activity size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">No Vitals Recorded</p>
          <p className="text-sm mt-1 opacity-60">Vitals are recorded during appointments. This patient has no vitals history yet.</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Metric cards */}
          <div className="w-72 shrink-0 border-r border-[var(--border)] overflow-y-auto p-4 bg-[var(--bg-surface)]">
            {metricsWithData.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-4">No metric data available</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {metricsWithData.map(m => (
                  <MetricStatCard
                    key={m} metric={m} data={allData}
                    isSelected={selectedMetric === m}
                    onClick={() => setSelectedMetric(m)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Chart + insights */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg" style={{ background: `${cfg.color}20` }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{cfg.label}</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Normal: {cfg.normalMin}–{cfg.normalMax} {cfg.unit} · {chartData.filter(d => d[selectedMetric] !== undefined).length} readings</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                {chartData.filter(d => d[selectedMetric] !== undefined).length < 1 ? (
                  <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                    <p className="text-sm">No {cfg.label} data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={cfg.color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3,3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={cfg.normalMax} stroke={cfg.color} strokeDasharray="4,4" strokeWidth={1} label={{ value: 'Max Normal', position: 'right', fontSize: 9, fill: cfg.color }} />
                      <ReferenceLine y={cfg.normalMin} stroke={cfg.color} strokeDasharray="4,4" strokeWidth={1} label={{ value: 'Min Normal', position: 'right', fontSize: 9, fill: cfg.color }} />
                      {cfg.criticalMax && <ReferenceLine y={cfg.criticalMax} stroke="#ef4444" strokeWidth={1.5} label={{ value: 'Critical', position: 'right', fontSize: 9, fill: '#ef4444' }} />}
                      <Area type="monotone" dataKey={selectedMetric} fill="url(#metricGrad)" stroke={cfg.color} strokeWidth={2} dot={false} name={cfg.label} />
                      <Line type="monotone" dataKey={selectedMetric} stroke={cfg.color} strokeWidth={2.5}
                        dot={(props: any) => {
                          const val = props.payload[selectedMetric];
                          const isCrit = val !== undefined && (
                            (cfg.criticalMax !== undefined && val > cfg.criticalMax) ||
                            (cfg.criticalMin !== undefined && val < cfg.criticalMin)
                          );
                          const isOut = val !== undefined && (val > cfg.normalMax || val < cfg.normalMin);
                          if (!isCrit && !isOut) return <></>;
                          return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={isCrit ? '#ef4444' : '#f59e0b'} stroke="white" strokeWidth={1.5} />;
                        }}
                        activeDot={{ r: 5, fill: cfg.color }} name={cfg.label} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)] p-4 bg-[var(--bg-surface)]">
              <AIInsights data={allData} metric={selectedMetric} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
