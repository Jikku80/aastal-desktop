'use client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/**
 * Renders whatever comes back in AIResponse.charts — a list of dicts
 * shaped exactly like Jwantra's own VizSpec.to_dict() (see
 * app/ml/schemas.py::VizSpec on the Jwantra side). Deliberately generic
 * rather than per-pipeline: Jwantra can add new pipelines/chart types
 * without ClinicKarobar needing a matching frontend change, as long as
 * they fit one of the eight chart_type buckets below (the same
 * contract Jwantra's own VizSpecRenderer follows).
 */

type VizSpec = {
  chart_type: 'line' | 'bar' | 'pie' | 'heatmap' | 'scatter' | 'funnel' | 'table' | 'network';
  title?: string;
  x_label?: string;
  y_label?: string;
  series?: { name: string; data: { x: any; y: any }[] }[];
  segments?: { label: string; value: number }[];
  heatmap_rows?: string[];
  heatmap_cols?: string[];
  heatmap_values?: number[][];
  table_columns?: string[];
  table_rows?: any[][];
};

const PIE_COLORS = ['#0e9de8', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#ec4899', '#6366f1'];
const tooltipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 };

/** series[] (multiple named lines/bars, each its own [{x,y}] list) share
 * an x-axis in recharts by merging into one row-per-x array. */
function mergeSeries(series: VizSpec['series']) {
  if (!series?.length) return { rows: [] as any[], keys: [] as string[] };
  const byX = new Map<string, any>();
  const keys = series.map(s => s.name);
  for (const s of series) {
    for (const point of s.data) {
      const xKey = String(point.x);
      const row = byX.get(xKey) ?? { x: point.x };
      row[s.name] = point.y;
      byX.set(xKey, row);
    }
  }
  return { rows: Array.from(byX.values()), keys };
}

export default function JwantraChart({ spec }: { spec: VizSpec }) {
  if (!spec || !spec.chart_type) return null;

  return (
    <div className="card p-4">
      {spec.title && <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{spec.title}</p>}
      {renderBody(spec)}
    </div>
  );
}

function renderBody(spec: VizSpec) {
  switch (spec.chart_type) {
    case 'line': {
      const { rows, keys } = mergeSeries(spec.series);
      if (!rows.length) return <EmptyNote />;
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} label={spec.x_label ? { value: spec.x_label, position: 'insideBottom', offset: -2, fontSize: 11 } : undefined} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} label={spec.y_label ? { value: spec.y_label, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
            <Tooltip contentStyle={tooltipStyle} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'bar': {
      const { rows, keys } = mergeSeries(spec.series);
      if (!rows.length) return <EmptyNote />;
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={tooltipStyle} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'scatter': {
      // Recharts ScatterChart needs its own import branch; funnels/scatter
      // are rare in practice for the pipelines ClinicKarobar cares about
      // (healthcare/finance), so fall back to the underlying table shape
      // via the shared series->rows helper rather than pulling in another
      // chart primitive for an edge case.
      const { rows, keys } = mergeSeries(spec.series);
      if (!rows.length) return <EmptyNote />;
      return <RawTable columns={['x', ...keys]} rows={rows.map(r => [r.x, ...keys.map(k => r[k])])} />;
    }

    case 'pie':
    case 'funnel': {
      if (!spec.segments?.length) return <EmptyNote />;
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={spec.segments} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80}
              label={({ label, percent }: any) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {spec.segments.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case 'heatmap': {
      const { heatmap_rows: rows = [], heatmap_cols: cols = [], heatmap_values: values = [] } = spec;
      if (!rows.length || !cols.length) return <EmptyNote />;
      const flat = values.flat().filter((v) => typeof v === 'number');
      const max = flat.length ? Math.max(...flat) : 1;
      return (
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="text-left text-[var(--text-muted)] font-medium pr-2 pb-1"></th>
                {cols.map(c => <th key={c} className="text-left text-[var(--text-muted)] font-medium px-1 pb-1 whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={r}>
                  <td className="text-[var(--text-secondary)] pr-2 whitespace-nowrap">{r}</td>
                  {cols.map((c, ci) => {
                    const v = values[ri]?.[ci] ?? 0;
                    const intensity = max > 0 ? Math.min(1, v / max) : 0;
                    return (
                      <td key={c} className="px-1 py-1 text-center rounded"
                        style={{ background: `rgba(14,157,232,${0.08 + intensity * 0.55})`, color: intensity > 0.5 ? '#fff' : 'var(--text-primary)' }}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'table':
    case 'network':
      if (!spec.table_columns?.length) return <EmptyNote />;
      return <RawTable columns={spec.table_columns} rows={spec.table_rows || []} />;

    default:
      return <EmptyNote />;
  }
}

function RawTable({ columns, rows }: { columns: string[]; rows: any[][] }) {
  if (!rows.length) return <EmptyNote />;
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map(c => <th key={c} className="text-left text-[var(--text-muted)] font-medium px-2 py-1.5 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 text-[var(--text-secondary)] whitespace-nowrap">{String(cell ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyNote() {
  return <p className="text-xs text-[var(--text-muted)] italic">No chartable data returned for this.</p>;
}
