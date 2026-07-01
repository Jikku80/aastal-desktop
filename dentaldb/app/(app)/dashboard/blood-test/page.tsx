'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bloodTestApi, labApi, usersApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { format } from 'date-fns';
import {
  Droplet, Plus, Search, X, Loader2,
  AlertTriangle, CheckCircle2, Clock, TestTube2, XCircle, Pencil, Trash2,
  FileText, Beaker, User, ExternalLink, FlaskConical, TrendingUp, TrendingDown, AlertOctagon, ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import PatientCombobox from '@/components/ui/PatientCombobox';

// ── Types ─────────────────────────────────────────────────────────────────────
type BloodTestStatus   = 'pending' | 'sample_collected' | 'in_progress' | 'completed' | 'cancelled';
type BloodTestPriority = 'routine' | 'urgent' | 'stat';
type BloodTestTypeKey =
  | 'cbc' | 'blood_sugar' | 'lipid_profile' | 'lft' | 'kft' | 'thyroid'
  | 'hba1c' | 'blood_grouping' | 'coagulation' | 'electrolytes'
  | 'vitamin_panel' | 'hormone_panel' | 'serology' | 'other';
type ResultFlag = 'normal' | 'low' | 'high' | 'critical';

interface ResultRow {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: ResultFlag;
}

interface BloodTest {
  id: string;
  clinicId: string;
  patientId: string;
  patient: { id: string; firstName: string; lastName: string; phone?: string };
  orderedById: string;
  orderedBy: { id: string; firstName: string; lastName: string };
  appointmentId?: string;
  labName?: string;
  testType: BloodTestTypeKey;
  testName: string;
  testDescription?: string;
  status: BloodTestStatus;
  priority: BloodTestPriority;
  fasting: boolean;
  clinicalNotes?: string;
  sampleCollectedAt?: string;
  resultsReceivedAt?: string;
  patientNotifiedAt?: string;
  results?: ResultRow[];
  resultSummary?: string;
  attachments?: { name: string; url: string }[];
  externalRef?: string;
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<BloodTestStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:           { label: 'Pending',           color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock        },
  sample_collected:  { label: 'Sample Collected',  color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: TestTube2    },
  in_progress:       { label: 'In Progress',       color: 'text-purple-400',  bg: 'bg-purple-500/10',  icon: Beaker       },
  completed:         { label: 'Completed',         color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  cancelled:         { label: 'Cancelled',         color: 'text-red-400',     bg: 'bg-red-500/10',     icon: XCircle      },
};

const PRIORITY_META: Record<BloodTestPriority, { label: string; color: string }> = {
  routine: { label: 'Routine', color: 'text-[var(--text-muted)]' },
  urgent:  { label: 'Urgent',  color: 'text-amber-400' },
  stat:    { label: 'STAT',    color: 'text-red-400' },
};

const TEST_TYPE_META: Record<BloodTestTypeKey, string> = {
  cbc:             'CBC (Complete Blood Count)',
  blood_sugar:     'Blood Sugar',
  lipid_profile:   'Lipid Profile',
  lft:             'Liver Function Test (LFT)',
  kft:             'Kidney Function Test (KFT)',
  thyroid:         'Thyroid Panel (TSH/T3/T4)',
  hba1c:           'HbA1c',
  blood_grouping:  'Blood Grouping',
  coagulation:     'Coagulation (PT/INR/APTT)',
  electrolytes:    'Electrolytes',
  vitamin_panel:   'Vitamin Panel',
  hormone_panel:   'Hormone Panel',
  serology:        'Serology (HIV/HBsAg/HCV…)',
  other:           'Other',
};

// Explicit flag metadata — always resolved from the row's own flag value,
// falling back to "normal" only when a flag is genuinely absent.
const FLAG_META: Record<ResultFlag, { label: string; color: string; bg: string; icon: any }> = {
  normal:   { label: 'Normal',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  low:      { label: 'Low',      color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: TrendingDown },
  high:     { label: 'High',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: TrendingUp   },
  critical: { label: 'Critical', color: 'text-red-400',     bg: 'bg-red-500/10',     icon: AlertOctagon },
};

function resolveFlag(flag?: string | null): ResultFlag {
  return flag === 'low' || flag === 'high' || flag === 'critical' ? flag : 'normal';
}

let rowIdSeq = 0;
const nextRowId = () => `row-${Date.now()}-${rowIdSeq++}`;

const emptyResultRow = (): ResultRow & { _id: string } => ({
  _id: nextRowId(), parameter: '', value: '', unit: '', referenceRange: '', flag: 'normal',
});

// ── Order Form ────────────────────────────────────────────────────────────────
function OrderModal({
  initial, onClose, onSaved,
}: {
  initial?: BloodTest | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    patientId:          initial?.patientId         ?? '',
    orderedById:        initial?.orderedById        ?? user?.id ?? '',
    labName:            initial?.labName            ?? '',
    testType:           (initial?.testType          ?? 'cbc') as BloodTestTypeKey,
    testName:           initial?.testName           ?? '',
    testDescription:    initial?.testDescription    ?? '',
    priority:           (initial?.priority          ?? 'routine') as BloodTestPriority,
    fasting:            initial?.fasting            ?? false,
    clinicalNotes:      initial?.clinicalNotes      ?? '',
    sampleCollectedAt:  initial?.sampleCollectedAt?.slice(0, 10) ?? '',
    cost:               initial?.cost?.toString()   ?? '',
    externalRef:        initial?.externalRef        ?? '',
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.listStaff().then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    }),
  });

  const mut = useMutation({
    mutationFn: (d: any) =>
      initial ? bloodTestApi.update(initial.id, d) : bloodTestApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blood-test'] }); onSaved(); },
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mut.mutateAsync({
        ...form,
        cost: form.cost ? parseFloat(form.cost) : undefined,
      });
    } finally { setSaving(false); }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key] as any,
    onChange: (e: any) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Droplet size={18} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                {initial ? 'Edit Blood Test' : 'New Blood Test'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {initial ? `Editing ${initial.testName}` : 'Order a new blood test for a patient'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 sm:px-6 py-5 space-y-4">

            {/* Patient */}
            <div>
              <label className="label">Patient *</label>
              <PatientCombobox
                value={form.patientId}
                onChange={(id, _patient) => setForm(f => ({ ...f, patientId: id }))}
              />
            </div>

            {/* Test type + Test name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Test Type</label>
                <select {...field('testType')} className="input w-full">
                  {Object.entries(TEST_TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Test Name *</label>
                <input {...field('testName')} required placeholder="e.g. Fasting Blood Sugar" className="input w-full" />
              </div>
            </div>

            {/* Lab + Fasting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Laboratory</label>
                <input {...field('labName')} placeholder="PathCare, CityLab…" className="input w-full" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
                  <input type="checkbox" checked={form.fasting}
                    onChange={e => setForm(f => ({ ...f, fasting: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-500" />
                  Fasting required
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label">Test Description</label>
              <textarea {...field('testDescription')} rows={2}
                placeholder="Brief description of what this test covers…"
                className="input w-full resize-none" />
            </div>

            {/* Priority + Ordered by */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Priority</label>
                <select {...field('priority')} className="input w-full">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
              <div>
                <label className="label">Ordered By</label>
                <select {...field('orderedById')} className="input w-full">
                  {staffData?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clinical notes */}
            <div>
              <label className="label">Clinical Notes / Reason for Order</label>
              <textarea {...field('clinicalNotes')} rows={3}
                placeholder="Clinical indication, relevant history…"
                className="input w-full resize-none" />
            </div>

            {/* Sample date + Ref + Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Sample Date</label>
                <input type="date" {...field('sampleCollectedAt')} className="input w-full" />
              </div>
              <div>
                <label className="label">Lab Ref / Accession</label>
                <input {...field('externalRef')} placeholder="BT-2024-001" className="input w-full" />
              </div>
              <div>
                <label className="label">Cost</label>
                <input type="number" min="0" step="0.01" {...field('cost')}
                  placeholder="0.00" className="input w-full" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 flex justify-end gap-3 shrink-0"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving || !form.patientId || !form.testName}
              className="btn-primary gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? 'Save Changes' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Results Modal ─────────────────────────────────────────────────────────────
function ResultsModal({
  bloodTest, onClose, onSaved,
}: {
  bloodTest: BloodTest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<(ResultRow & { _id: string })[]>(
    bloodTest.results?.length
      ? bloodTest.results.map(r => ({ ...r, flag: resolveFlag(r.flag), _id: nextRowId() }))
      : [emptyResultRow()]
  );
  const [summary, setSummary] = useState(bloodTest.resultSummary ?? '');
  const [receivedAt, setReceivedAt] = useState(bloodTest.resultsReceivedAt ?? '');
  const [saving, setSaving] = useState(false);

  const setRow = (id: string, key: keyof ResultRow, val: string) =>
    setRows(rs => rs.map(r => r._id === id ? { ...r, [key]: val } : r));

  const addRow    = () => setRows(rs => [...rs, emptyResultRow()]);
  const removeRow = (id: string) => setRows(rs => rs.filter(r => r._id !== id));

  const mut = useMutation({
    mutationFn: (d: any) => bloodTestApi.update(bloodTest.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blood-test'] }); onSaved(); },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mut.mutateAsync({
        results: rows
          .filter(r => r.parameter.trim())
          .map(({ _id, ...r }) => ({ ...r, flag: resolveFlag(r.flag) })),
        resultSummary: summary,
        resultsReceivedAt: receivedAt || undefined,
        status: 'completed',
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="relative w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Beaker size={18} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Enter Results</h2>
              <p className="text-xs text-[var(--text-muted)] truncate">{bloodTest.testName} · {bloodTest.patient.firstName} {bloodTest.patient.lastName}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center shrink-0"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 sm:px-6 py-5 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Results Received Date</label>
                <input type="date" value={receivedAt}
                  onChange={e => setReceivedAt(e.target.value)} className="input w-full" />
              </div>
            </div>

            {/* Results table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Result Parameters</label>
                <button type="button" onClick={addRow}
                  className="btn-ghost text-xs px-2.5 py-1.5 gap-1 text-brand-400 hover:bg-brand-500/10">
                  <Plus size={12} /> Add Parameter
                </button>
              </div>

              {/* Mobile: stacked cards */}
              <div className="sm:hidden space-y-2.5">
                {rows.map(row => {
                  const fm = FLAG_META[resolveFlag(row.flag)];
                  return (
                    <div key={row._id} className="p-3 rounded-xl relative"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className={fm.color}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${fm.color}`}>
                            <fm.icon size={11} /> {fm.label}
                          </span>
                          <button type="button" onClick={() => removeRow(row._id)}
                            className="btn-ghost w-6 h-6 p-0 justify-center text-red-400">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={row.parameter} onChange={e => setRow(row._id, 'parameter', e.target.value)}
                          placeholder="Parameter" className="input h-8 text-xs col-span-2" />
                        <input value={row.value} onChange={e => setRow(row._id, 'value', e.target.value)}
                          placeholder="Value" className="input h-8 text-xs" />
                        <input value={row.unit ?? ''} onChange={e => setRow(row._id, 'unit', e.target.value)}
                          placeholder="Unit" className="input h-8 text-xs" />
                        <input value={row.referenceRange ?? ''} onChange={e => setRow(row._id, 'referenceRange', e.target.value)}
                          placeholder="Ref range" className="input h-8 text-xs" />
                        <select value={resolveFlag(row.flag)} onChange={e => setRow(row._id, 'flag', e.target.value)}
                          className="input h-8 text-xs">
                          <option value="normal">Normal</option>
                          <option value="low">Low</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Parameter', 'Value', 'Unit', 'Ref Range', 'Flag', ''].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[var(--text-muted)] font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const currentFlag = resolveFlag(row.flag);
                      const fm = FLAG_META[currentFlag];
                      return (
                        <tr key={row._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-2 py-1.5">
                            <input value={row.parameter} onChange={e => setRow(row._id, 'parameter', e.target.value)}
                              placeholder="Hemoglobin" className="input h-8 text-xs w-full min-w-[110px]" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.value} onChange={e => setRow(row._id, 'value', e.target.value)}
                              placeholder="14.2" className="input h-8 text-xs w-20" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.unit ?? ''} onChange={e => setRow(row._id, 'unit', e.target.value)}
                              placeholder="g/dL" className="input h-8 text-xs w-16" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.referenceRange ?? ''} onChange={e => setRow(row._id, 'referenceRange', e.target.value)}
                              placeholder="12–17" className="input h-8 text-xs w-24" />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="relative">
                              <select value={currentFlag} onChange={e => setRow(row._id, 'flag', e.target.value)}
                                className={`input h-8 text-xs pl-6 font-medium ${fm.color}`}>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                              <fm.icon size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${fm.color}`} />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <button type="button" onClick={() => removeRow(row._id)}
                              className="btn-ghost w-6 h-6 p-0 justify-center text-red-400 hover:bg-red-500/10">
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="label">Result Summary / Interpretation</label>
              <textarea value={summary} onChange={e => setSummary(e.target.value)}
                rows={3} placeholder="Overall interpretation, key findings…"
                className="input w-full resize-none" />
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 flex justify-end gap-3 shrink-0"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Results &amp; Complete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Results Table (read-only display, shared by detail panel) ─────────────────
function ResultsTable({ results }: { results: ResultRow[] }) {
  return (
    <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-xs min-w-[420px]">
        <thead>
          <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            {['Parameter', 'Value', 'Reference', 'Flag'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-[var(--text-muted)] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const currentFlag = resolveFlag(r.flag);
            const fm = FLAG_META[currentFlag];
            const FlagIcon = fm.icon;
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">
                  {r.parameter || <span className="text-[var(--text-muted)] italic">—</span>}
                </td>
                <td className="px-3 py-2.5 font-mono text-[var(--text-primary)]">
                  {r.value ? `${r.value}${r.unit ? ` ${r.unit}` : ''}` : <span className="text-[var(--text-muted)]">—</span>}
                </td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono">
                  {r.referenceRange || '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${fm.color} ${fm.bg}`}>
                    <FlagIcon size={10} />{fm.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function BloodTestDetailPanel({
  bloodTest, onClose, onEdit, onEnterResults, onDelete, onStatusChange,
}: {
  bloodTest: BloodTest;
  onClose: () => void;
  onEdit: () => void;
  onEnterResults: () => void;
  onDelete: () => void;
  onStatusChange: (status: BloodTestStatus) => void;
}) {
  const meta = STATUS_META[bloodTest.status];
  const StatusIcon = meta.icon;
  const priorityMeta = PRIORITY_META[bloodTest.priority];
  const criticalCount = bloodTest.results?.filter(r => resolveFlag(r.flag) === 'critical').length ?? 0;
  const abnormalCount = bloodTest.results?.filter(r => resolveFlag(r.flag) !== 'normal').length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Droplet size={20} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{bloodTest.testName}</h3>
            <p className="text-xs text-[var(--text-muted)]">{bloodTest.labName || 'No lab specified'}</p>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost w-7 h-7 p-0 justify-center shrink-0">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Status + Priority badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color} ${meta.bg}`}>
            <StatusIcon size={11} />{meta.label}
          </span>
          <span className={`text-xs font-medium ${priorityMeta.color}`}>{priorityMeta.label}</span>
          {bloodTest.fasting && (
            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Fasting</span>
          )}
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <AlertOctagon size={10} /> {criticalCount} critical
            </span>
          )}
          {bloodTest.externalRef && (
            <span className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
              #{bloodTest.externalRef}
            </span>
          )}
        </div>

        {/* Patient & Doctor */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
              <User size={9} /> Patient
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {bloodTest.patient.firstName} {bloodTest.patient.lastName}
            </p>
            {bloodTest.patient.phone && (
              <p className="text-xs text-[var(--text-muted)]">{bloodTest.patient.phone}</p>
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
              <User size={9} /> Ordered By
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Dr. {bloodTest.orderedBy.firstName} {bloodTest.orderedBy.lastName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{format(new Date(bloodTest.createdAt), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Dates */}
        {(bloodTest.sampleCollectedAt || bloodTest.resultsReceivedAt) && (
          <div className="grid grid-cols-2 gap-3">
            {bloodTest.sampleCollectedAt && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Sample Collected</p>
                <p className="text-xs text-[var(--text-primary)]">{format(new Date(bloodTest.sampleCollectedAt), 'MMM d, yyyy')}</p>
              </div>
            )}
            {bloodTest.resultsReceivedAt && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Results Received</p>
                <p className="text-xs text-[var(--text-primary)]">{format(new Date(bloodTest.resultsReceivedAt), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>
        )}

        {/* Cost */}
        {bloodTest.cost != null && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Cost</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {Number(bloodTest.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Clinical notes */}
        {bloodTest.clinicalNotes && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Clinical Notes</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{bloodTest.clinicalNotes}</p>
          </div>
        )}

        {/* Results */}
        {bloodTest.results?.length ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Results</p>
              {abnormalCount > 0 && (
                <span className="text-[10px] text-amber-400 font-medium">{abnormalCount} abnormal</span>
              )}
            </div>
            <ResultsTable results={bloodTest.results} />
          </div>
        ) : null}

        {/* Summary */}
        {bloodTest.resultSummary && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Result Summary</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{bloodTest.resultSummary}</p>
          </div>
        )}

        {/* Attachments */}
        {bloodTest.attachments?.length ? (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Attachments</p>
            <div className="space-y-1">
              {bloodTest.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] transition-colors">
                  <FileText size={13} className="text-[var(--text-muted)]" />
                  <span className="flex-1 truncate">{a.name}</span>
                  <ExternalLink size={11} className="text-[var(--text-muted)]" />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Status flow actions */}
        {bloodTest.status !== 'completed' && bloodTest.status !== 'cancelled' && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Quick Status Update</p>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'sample_collected', 'in_progress'] as BloodTestStatus[])
                .filter(s => s !== bloodTest.status)
                .map(s => {
                  const m = STATUS_META[s];
                  const SI = m.icon;
                  return (
                    <button key={s} onClick={() => onStatusChange(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${m.color} ${m.bg}`}
                      style={{ borderColor: 'currentColor', opacity: 0.8 }}>
                      <SI size={11} />{m.label}
                    </button>
                  );
                })}
              <button onClick={() => onStatusChange('cancelled')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10">
                <XCircle size={11} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={onDelete}
          className="btn-ghost text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
          <Trash2 size={13} /> Delete
        </button>
        <div className="flex gap-2">
          {bloodTest.status !== 'completed' && bloodTest.status !== 'cancelled' && (
            <button onClick={onEnterResults} className="btn-secondary text-xs gap-1.5">
              <Beaker size={13} /> Enter Results
            </button>
          )}
          <button onClick={onEdit} className="btn-primary text-xs gap-1.5">
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fallback: Patient Lab Works (shown when there are no blood tests at all) ──
function PatientLabWorksFallback() {
  const { data, isLoading } = useQuery({
    queryKey: ['lab-work', 'blood-test-fallback'],
    queryFn: () => labApi.list({ page: 1, limit: 10 }).then(r => r.data as { data: any[]; total: number }),
  });
  const works = data?.data ?? [];

  return (
    <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <FlaskConical size={12} /> Patient Lab Works
      </p>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : works.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">No lab works found either.</p>
      ) : (
        <div className="space-y-2">
          {works.map(lab => (
            <div key={lab.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <FlaskConical size={13} className="text-brand-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{lab.testName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {lab.patient?.firstName} {lab.patient?.lastName}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] capitalize shrink-0">{lab.status?.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BloodTestPage() {
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();

  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [orderModal,   setOrderModal]   = useState<BloodTest | null | 'new'>(null);
  const [resultsModal, setResultsModal] = useState<BloodTest | null>(null);
  const [detailTest,   setDetailTest]   = useState<BloodTest | null>(null);

  const isBranchInactive = activeBranch && !activeBranch.isActive;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['blood-test', page, search, statusFilter, priorityFilter],
    queryFn: () => bloodTestApi.list({
      page, limit: 25,
      search:   search   || undefined,
      status:   statusFilter   || undefined,
      priority: priorityFilter || undefined,
    }).then(r => r.data as { data: BloodTest[]; total: number }),
    placeholderData: prev => prev,
    enabled: !isBranchInactive,
  });

  const { data: statsData } = useQuery({
    queryKey: ['blood-test-stats'],
    queryFn: () => bloodTestApi.stats().then(r => r.data as any),
    enabled: !isBranchInactive,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bloodTestApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-test'] });
      setDetailTest(null);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BloodTestStatus }) =>
      bloodTestApi.update(id, { status }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['blood-test'] });
      setDetailTest(d => d?.id === id ? { ...d, status: _.data.status } : d);
    },
  });

  const tests = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPage(1);
  };
  const hasFilters = !!(search || statusFilter || priorityFilter);

  // Show the "Patient Lab Works" fallback only when there are truly no blood
  // tests in the clinic yet (no filters applied, nothing in the unfiltered list).
  const showLabWorksFallback = !isLoading && !hasFilters && tests.length === 0;

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Blood Test"
        subtitle="Manage blood test orders & results"
        action={isBranchInactive ? undefined : {
          label: 'New Blood Test',
          icon: Plus,
          onClick: () => setOrderModal('new'),
        }}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {/* Branch Inactive Banner */}
        {isBranchInactive && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Droplet size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Branch is Inactive</p>
              <p className="text-xs opacity-80">Blood test management is disabled while this branch is inactive.</p>
            </div>
          </div>
        )}

        {!isBranchInactive && (<>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {[
            { label: 'Total Orders',  value: statsData?.total      ?? 0, color: 'text-[var(--text-primary)]', icon: ClipboardList, iconColor: 'text-red-400',     iconBg: 'bg-red-500/10' },
            { label: 'Pending',       value: statsData?.pending     ?? 0, color: 'text-amber-400',            icon: Clock,          iconColor: 'text-amber-400',   iconBg: 'bg-amber-500/10' },
            { label: 'In Progress',   value: statsData?.inProgress  ?? 0, color: 'text-purple-400',           icon: Beaker,         iconColor: 'text-purple-400',  iconBg: 'bg-purple-500/10' },
            { label: 'Completed',     value: statsData?.completed   ?? 0, color: 'text-emerald-400',          icon: CheckCircle2,   iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
          ].map(c => (
            <div key={c.label} className="rounded-2xl p-3 sm:p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
                <c.icon size={16} className={c.iconColor} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-2xl font-bold leading-tight ${c.color}`}>{c.value}</p>
                <p className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-3 mb-4 flex flex-wrap gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search test, patient…" className="input pl-8 w-full h-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input h-9 text-sm">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
            className="input h-9 text-sm">
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost h-9 px-3 gap-1.5 text-sm text-[var(--text-muted)]">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showLabWorksFallback ? (
          <div className="space-y-4">
            <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed var(--border-hover)', background: 'var(--bg-surface)' }}>
              <Droplet size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">No blood tests found yet.</p>
              <button onClick={() => setOrderModal('new')} className="btn-ghost mt-3 text-sm gap-2">
                <Plus size={14} /> Create first blood test
              </button>
            </div>

            {/* Fallback list, per request: show patient lab works when no blood test exists */}
            <PatientLabWorksFallback />
          </div>
        ) : (
        <div className="flex gap-4">

          {/* Table */}
          <div className={`flex-1 min-w-0 rounded-2xl overflow-hidden transition-all ${detailTest ? 'hidden lg:block' : ''}`}
            style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            {isLoading ? (
              <div className="text-center py-20">
                <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-20">
                <Droplet size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                <p className="text-sm text-[var(--text-muted)]">No blood tests match your filters.</p>
                <button onClick={clearFilters} className="btn-ghost mt-3 text-sm gap-2">
                  <X size={14} /> Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto table-scroll-wrap">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Test', 'Patient', 'Lab', 'Priority', 'Status', 'Date', 'Cost', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(bt => {
                      const sm = STATUS_META[bt.status];
                      const SI = sm.icon;
                      const pm = PRIORITY_META[bt.priority];
                      const hasCritical = bt.results?.some(r => resolveFlag(r.flag) === 'critical');

                      return (
                        <tr key={bt.id}
                          onClick={() => setDetailTest(bt)}
                          className="hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                          style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasCritical && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                              <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                                {bt.testName}
                              </span>
                            </div>
                            {bt.testDescription && (
                              <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
                                {bt.testDescription}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-[var(--text-primary)]">
                              {bt.patient.firstName} {bt.patient.lastName}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {bt.labName || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${pm.color}`}>{pm.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${sm.color} ${sm.bg}`}>
                              <SI size={10} />{sm.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {format(new Date(bt.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {bt.cost != null ? Number(bt.cost).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setOrderModal(bt);
                              }}
                              className="btn-ghost w-7 h-7 p-0 justify-center">
                              <Pencil size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {detailTest && (
            <div className="fixed inset-0 z-[92] lg:static lg:z-auto lg:w-[380px] shrink-0 rounded-none lg:rounded-2xl flex flex-col"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', maxHeight: '100dvh', top: 0 }}>
              <div className="hidden lg:block" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                <BloodTestDetailPanel
                  bloodTest={detailTest}
                  onClose={() => setDetailTest(null)}
                  onEdit={() => { setOrderModal(detailTest); setDetailTest(null); }}
                  onEnterResults={() => { setResultsModal(detailTest); setDetailTest(null); }}
                  onDelete={() => {
                    if (confirm('Delete this blood test order?')) deleteMut.mutate(detailTest.id);
                  }}
                  onStatusChange={status => statusMut.mutate({ id: detailTest.id, status })}
                />
              </div>
              <div className="lg:hidden flex flex-col h-full" style={{ background: 'var(--bg-base)', paddingTop: 'var(--header-offset)' }}>
                <BloodTestDetailPanel
                  bloodTest={detailTest}
                  onClose={() => setDetailTest(null)}
                  onEdit={() => { setOrderModal(detailTest); setDetailTest(null); }}
                  onEnterResults={() => { setResultsModal(detailTest); setDetailTest(null); }}
                  onDelete={() => {
                    if (confirm('Delete this blood test order?')) deleteMut.mutate(detailTest.id);
                  }}
                  onStatusChange={status => statusMut.mutate({ id: detailTest.id, status })}
                />
              </div>
            </div>
          )}
        </div>
        )}

        {/* Pagination */}
        {!showLabWorksFallback && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-[var(--text-muted)]">
              Page {page} of {totalPages} · {total.toLocaleString()} orders
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost h-8 px-3 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-ghost h-8 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {isFetching && !isLoading && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Loader2 size={13} className="animate-spin" /> Loading…
          </div>
        )}
        </>)} {/* end !isBranchInactive */}
      </div> {/* end overflow-auto padding div */}

      {/* Modals */}
      {orderModal !== null && (
        <OrderModal
          initial={orderModal === 'new' ? null : orderModal}
          onClose={() => setOrderModal(null)}
          onSaved={() => {
            setOrderModal(null);
            qc.invalidateQueries({ queryKey: ['blood-test-stats'] });
          }}
        />
      )}

      {resultsModal && (
        <ResultsModal
          bloodTest={resultsModal}
          onClose={() => setResultsModal(null)}
          onSaved={() => {
            setResultsModal(null);
            qc.invalidateQueries({ queryKey: ['blood-test-stats'] });
          }}
        />
      )}
    </div>
  );
}