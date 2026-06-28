'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { patientsApi, labApi, bloodTestApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import Header from '@/components/layout/Header';
import {
  Search, FlaskConical, Download, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, ChevronRight, ChevronDown, Printer,
  Calendar, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface ResultRow {
  parameter:      string;
  value:          string;
  unit?:          string;
  referenceRange?: string;
  flag?:          'normal' | 'low' | 'high' | 'critical';
}

interface LabWork {
  id:               string;
  testName:         string;
  testDescription?: string;
  status:           string;
  priority:         string;
  labName?:         string;
  clinicalNotes?:   string;
  resultSummary?:   string;
  results?:         ResultRow[];
  sampleCollectedAt?: string;
  resultsReceivedAt?: string;
  orderedBy?:       { firstName: string; lastName: string };
  createdAt:        string;
}

const FLAG_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  normal:   { label: 'Normal',   color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
  low:      { label: 'Low',      color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  high:     { label: 'High',     color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
};

function ResultRowDisplay({ row }: { row: ResultRow }) {
  const flag = row.flag ?? 'normal';
  const cfg = FLAG_META[flag] ?? FLAG_META.normal;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <div className="w-40 shrink-0">
        <p className="text-xs font-medium text-[var(--text-primary)]">{row.parameter}</p>
        {row.referenceRange && (
          <p className="text-[10px] text-[var(--text-secondary)]">Ref: {row.referenceRange}</p>
        )}
      </div>
      <div className="flex-1 text-right">
        <span className="text-sm font-bold" style={{ color: cfg.color }}>
          {row.value} <span className="text-[10px] font-normal text-[var(--text-secondary)]">{row.unit}</span>
        </span>
      </div>
      <div className="w-24 shrink-0">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
          {flag === 'critical' && ' ⚠'}
        </span>
      </div>
    </div>
  );
}

function LabWorkCard({ lab, isSelected, onClick }: {
  lab: LabWork; isSelected: boolean; onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(isSelected);
  const results = lab.results ?? [];
  const criticalCount = results.filter(r => r.flag === 'critical').length;
  const abnormalCount = results.filter(r => r.flag && r.flag !== 'normal').length;
  const hasCritical = criticalCount > 0;
  const dateStr = lab.resultsReceivedAt ?? lab.createdAt;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-[var(--brand)]' : 'border-[var(--border)]'} bg-[var(--bg-surface)]`}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg-muted)]"
        onClick={() => { onClick(); setExpanded(e => !e); }}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasCritical ? 'bg-red-100' : 'bg-blue-50'}`}>
            <FlaskConical size={14} className={hasCritical ? 'text-red-500' : 'text-blue-500'} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{lab.testName}</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">
                {(lab as any)._kind === 'blood_test' ? 'Blood Test' : 'Lab Work'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Calendar size={10} /> {format(parseISO(dateStr), 'MMM d, yyyy')}
              {lab.orderedBy && (
                <><span>·</span><span>Dr. {lab.orderedBy.firstName} {lab.orderedBy.lastName}</span></>
              )}
              {lab.labName && <><span>·</span><span>{lab.labName}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasCritical && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full font-medium">
              <AlertTriangle size={10} /> {criticalCount} Critical
            </span>
          )}
          {abnormalCount > 0 && !hasCritical && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
              {abnormalCount} Abnormal
            </span>
          )}
          {results.length > 0 && abnormalCount === 0 && <CheckCircle size={14} className="text-green-500" />}
          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
            lab.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-200' :
            lab.status === 'pending'   ? 'bg-amber-50 text-amber-600 border border-amber-200' :
            'bg-gray-50 text-gray-500 border border-gray-200'
          }`}>{lab.status}</span>
          {expanded ? <ChevronDown size={14} className="text-[var(--text-secondary)]" /> : <ChevronRight size={14} className="text-[var(--text-secondary)]" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {lab.clinicalNotes && (
            <p className="text-xs text-[var(--text-secondary)] mb-3 italic">Notes: "{lab.clinicalNotes}"</p>
          )}
          {lab.resultSummary && (
            <p className="text-xs text-[var(--text-primary)] mb-3 p-2 bg-[var(--bg-muted)] rounded-lg">{lab.resultSummary}</p>
          )}

          {results.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-2">Test Results ({results.length})</p>
              {results.map((row, i) => (
                <ResultRowDisplay key={i} row={row} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] italic py-2">
              {lab.status === 'pending' || lab.status === 'sent' || lab.status === 'in_progress'
                ? 'Results not yet available — status: ' + lab.status
                : 'No result rows recorded for this lab work.'}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)] ml-auto">
              Ordered: {format(parseISO(lab.createdAt), 'MMM d, yyyy')}
              {lab.sampleCollectedAt && ` · Collected: ${format(parseISO(lab.sampleCollectedAt), 'MMM d')}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function LabResultsPage() {
  const [search, setSearch]     = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedReport, setSelectedReport]   = useState<string | null>(null);

  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', search],
    queryFn:  () => patientsApi.list({ search, limit: 10 }).then(r => r.data),
    enabled:  search.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  const { data: labData, isLoading: labLoading, error: labError } = useQuery({
    queryKey: ['lab-results-patient', selectedPatient?.id],
    queryFn:  async () => {
      const r = await labApi.byPatient(selectedPatient.id);
      return r.data?.data ?? r.data ?? [];
    },
    enabled: !!selectedPatient?.id,
  });
  const { data: bloodData, isLoading: bloodLoading, error: bloodError } = useQuery({
    queryKey: ['lab-results-blood-patient', selectedPatient?.id],
    queryFn:  async () => {
      const r = await bloodTestApi.byPatient(selectedPatient.id);
      return r.data?.data ?? r.data ?? [];
    },
    enabled: !!selectedPatient?.id,
  });
  const labs: LabWork[] = [
    ...(labData ?? []),
    ...(bloodData ?? []).map((b: any) => ({ ...b, _kind: 'blood_test' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const critical  = labs.flatMap(l => l.results ?? []).filter(r => r.flag === 'critical').length;
  const abnormal  = labs.flatMap(l => l.results ?? []).filter(r => r.flag && r.flag !== 'normal').length;
  const completed = labs.filter(l => l.status === 'completed').length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header title="Lab Results" subtitle="Patient lab work and test results" />

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-4">
        <div className="flex-1 max-w-sm relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            placeholder="Search patient…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {patients.length > 0 && search.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-[var(--border)] rounded-lg shadow-lg bg-[var(--bg-surface)] z-10">
              {patients.map((p: any) => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(''); setSelectedReport(null); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                  {p.firstName} {p.lastName} · {p.phone}
                </button>
              ))}
            </div>
          )}
        </div>

        {critical > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold animate-pulse">
            <AlertTriangle size={12} /> {critical} Critical Result{critical > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {!selectedPatient ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
          <FlaskConical size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Lab Result Viewer</p>
          <p className="text-sm mt-1 opacity-60">Search for a patient to view their lab results</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel — summary */}
          <div className="w-64 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-surface)] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-primary)]">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{labs.length} lab orders</p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 border-b border-[var(--border)]">
              {[
                { label: 'Completed', count: completed,          color: '#22c55e', bg: '#f0fdf4' },
                { label: 'Abnormal',  count: abnormal - critical, color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Critical',  count: critical,            color: '#ef4444', bg: '#fef2f2' },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: s.bg }}>
                  <p className="text-base font-bold" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[9px]" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="p-3 flex-1">
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-2">All Orders</p>
              <div className="space-y-1">
                {labs.map(lab => (
                  <button key={lab.id}
                    onClick={() => setSelectedReport(lab.id)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors ${selectedReport === lab.id ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                    {lab.testName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — lab list */}
          <div className="flex-1 overflow-y-auto p-6">
            {(labLoading || bloodLoading) ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-[var(--text-secondary)]" />
              </div>
            ) : (labError || bloodError) ? (
              <div className="text-center py-16">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
                <p className="text-sm text-red-500">Failed to load lab results</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Please try again</p>
              </div>
            ) : labs.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-secondary)]">
                <FlaskConical size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No lab orders found for this patient</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {labs.slice().reverse().map(lab => (
                  <LabWorkCard
                    key={lab.id}
                    lab={lab}
                    isSelected={selectedReport === lab.id}
                    onClick={() => setSelectedReport(selectedReport === lab.id ? null : lab.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
