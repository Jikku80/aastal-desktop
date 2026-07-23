'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labApi, usersApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { format } from 'date-fns';
import {
  FlaskConical, Plus, Search, X, Loader2,
  AlertTriangle, CheckCircle2, Clock, Send, XCircle, Pencil, Trash2,
  FileText, Beaker, User, ExternalLink, TrendingUp, TrendingDown, AlertOctagon, ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import PermissionGate from '@/components/rbac/PermissionGate';
import PatientCombobox from '@/components/ui/PatientCombobox';

// ── Types ─────────────────────────────────────────────────────────────────────
type LabStatus   = 'pending' | 'sent' | 'in_progress' | 'completed' | 'cancelled';
type LabPriority = 'routine' | 'urgent' | 'stat';
type ResultFlag = 'normal' | 'low' | 'high' | 'critical';

interface ResultRow {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: ResultFlag;
}

interface LabWork {
  id: string;
  clinicId: string;
  patientId: string;
  patient: { id: string; firstName: string; lastName: string; phone?: string };
  orderedById: string;
  orderedBy: { id: string; firstName: string; lastName: string };
  appointmentId?: string;
  labName?: string;
  testName: string;
  testDescription?: string;
  status: LabStatus;
  priority: LabPriority;
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
const STATUS_META: Record<LabStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:     { label: 'Pending',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock       },
  sent:        { label: 'Sent',        color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: Send        },
  in_progress: { label: 'In Progress', color: 'text-purple-400',  bg: 'bg-purple-500/10',  icon: Beaker      },
  completed:   { label: 'Completed',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  cancelled:   { label: 'Cancelled',   color: 'text-red-400',     bg: 'bg-red-500/10',     icon: XCircle     },
};

const PRIORITY_META: Record<LabPriority, { label: string; color: string }> = {
  routine: { label: 'Routine', color: 'text-[var(--text-muted)]' },
  urgent:  { label: 'Urgent',  color: 'text-amber-400' },
  stat:    { label: 'STAT',    color: 'text-red-400' },
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
  initial?: LabWork | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user, activeBranch } = useAuthStore();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    patientId:          initial?.patientId         ?? '',
    orderedById:        initial?.orderedById        ?? user?.id ?? '',
    labName:            initial?.labName            ?? '',
    testName:           initial?.testName           ?? '',
    testDescription:    initial?.testDescription    ?? '',
    priority:           (initial?.priority          ?? 'routine') as LabPriority,
    clinicalNotes:      initial?.clinicalNotes      ?? '',
    sampleCollectedAt:  initial?.sampleCollectedAt  ?? '',
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
      initial ? labApi.update(initial.id, d) : labApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lab-work'] }); onSaved(); },
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mut.mutateAsync({
        ...form,
        ...(initial ? {} : { branchId: activeBranch?.id }),
        cost: form.cost ? parseFloat(form.cost) : undefined,
      });
    } finally { setSaving(false); }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
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
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
              <FlaskConical size={18} className="text-brand-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                {initial ? 'Edit Lab Order' : 'New Lab Order'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {initial ? `Editing ${initial.testName}` : 'Create a new laboratory work order'}
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

            {/* Test + Lab */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Test Name *</label>
                <input {...field('testName')} required placeholder="CBC, Lipid Panel…" className="input w-full" />
              </div>
              <div>
                <label className="label">Laboratory</label>
                <input {...field('labName')} placeholder="PathCare, CityLab…" className="input w-full" />
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
                <input {...field('externalRef')} placeholder="LAB-2024-001" className="input w-full" />
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
  lab, onClose, onSaved,
}: {
  lab: LabWork;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<(ResultRow & { _id: string })[]>(
    lab.results?.length
      ? lab.results.map(r => ({ ...r, flag: resolveFlag(r.flag), _id: nextRowId() }))
      : [emptyResultRow()]
  );
  const [summary, setSummary] = useState(lab.resultSummary ?? '');
  const [receivedAt, setReceivedAt] = useState(lab.resultsReceivedAt ?? '');
  const [saving, setSaving] = useState(false);

  const setRow = (id: string, key: keyof ResultRow, val: string) =>
    setRows(rs => rs.map(r => r._id === id ? { ...r, [key]: val } : r));

  const addRow    = () => setRows(rs => [...rs, emptyResultRow()]);
  const removeRow = (id: string) => setRows(rs => rs.filter(r => r._id !== id));

  const mut = useMutation({
    mutationFn: (d: any) => labApi.update(lab.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lab-work'] }); onSaved(); },
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
              <p className="text-xs text-[var(--text-muted)] truncate">{lab.testName} · {lab.patient.firstName} {lab.patient.lastName}</p>
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
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid currentColor` }}
                      >
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
function LabDetailPanel({
  lab, onClose, onEdit, onEnterResults, onDelete, onStatusChange,
}: {
  lab: LabWork;
  onClose: () => void;
  onEdit: () => void;
  onEnterResults: () => void;
  onDelete: () => void;
  onStatusChange: (status: LabStatus) => void;
}) {
  const meta = STATUS_META[lab.status];
  const StatusIcon = meta.icon;
  const priorityMeta = PRIORITY_META[lab.priority];
  const criticalCount = lab.results?.filter(r => resolveFlag(r.flag) === 'critical').length ?? 0;
  const abnormalCount = lab.results?.filter(r => resolveFlag(r.flag) !== 'normal').length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
            <FlaskConical size={20} className="text-brand-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{lab.testName}</h3>
            <p className="text-xs text-[var(--text-muted)]">{lab.labName || 'No lab specified'}</p>
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
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <AlertOctagon size={10} /> {criticalCount} critical
            </span>
          )}
          {lab.externalRef && (
            <span className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
              #{lab.externalRef}
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
              {lab.patient.firstName} {lab.patient.lastName}
            </p>
            {lab.patient.phone && (
              <p className="text-xs text-[var(--text-muted)]">{lab.patient.phone}</p>
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
              <User size={9} /> Ordered By
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Dr. {lab.orderedBy.firstName} {lab.orderedBy.lastName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{format(new Date(lab.createdAt), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Dates */}
        {(lab.sampleCollectedAt || lab.resultsReceivedAt) && (
          <div className="grid grid-cols-2 gap-3">
            {lab.sampleCollectedAt && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Sample Collected</p>
                <p className="text-xs text-[var(--text-primary)]">{format(new Date(lab.sampleCollectedAt), 'MMM d, yyyy')}</p>
              </div>
            )}
            {lab.resultsReceivedAt && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Results Received</p>
                <p className="text-xs text-[var(--text-primary)]">{format(new Date(lab.resultsReceivedAt), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>
        )}

        {/* Cost */}
        {lab.cost != null && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Cost</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {Number(lab.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Clinical notes */}
        {lab.clinicalNotes && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Clinical Notes</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{lab.clinicalNotes}</p>
          </div>
        )}

        {/* Results */}
        {lab.results?.length ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Results</p>
              {abnormalCount > 0 && (
                <span className="text-[10px] text-amber-400 font-medium">{abnormalCount} abnormal</span>
              )}
            </div>
            <ResultsTable results={lab.results} />
          </div>
        ) : null}

        {/* Summary */}
        {lab.resultSummary && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Result Summary</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{lab.resultSummary}</p>
          </div>
        )}

        {/* Attachments */}
        {lab.attachments?.length ? (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Attachments</p>
            <div className="space-y-1">
              {lab.attachments.map((a, i) => (
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
        {lab.status !== 'completed' && lab.status !== 'cancelled' && (
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Quick Status Update</p>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'sent', 'in_progress'] as LabStatus[])
                .filter(s => s !== lab.status)
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
        <PermissionGate permission="lab.manage">
          <button onClick={onDelete}
            className="btn-ghost text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
            <Trash2 size={13} /> Delete
          </button>
        </PermissionGate>
        <div className="flex gap-2">
          {lab.status !== 'completed' && lab.status !== 'cancelled' && (
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LabWorkPage() {
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();

  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [orderModal,  setOrderModal]  = useState<LabWork | null | 'new'>(null);
  const [resultsModal, setResultsModal] = useState<LabWork | null>(null);
  const [detailLab,   setDetailLab]   = useState<LabWork | null>(null);

  const isBranchInactive = activeBranch && !activeBranch.isActive;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['lab-work', page, search, statusFilter, priorityFilter, activeBranch?.id],
    queryFn: () => labApi.list({
      page, limit: 25,
      branchId: activeBranch?.id,
      search:   search   || undefined,
      status:   statusFilter   || undefined,
      priority: priorityFilter || undefined,
    }).then(r => r.data as { data: LabWork[]; total: number }),
    placeholderData: prev => prev,
    enabled: !isBranchInactive,
  });

  const { data: statsData } = useQuery({
    queryKey: ['lab-work-stats'],
    queryFn: () => labApi.stats().then(r => r.data as any),
    enabled: !isBranchInactive,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => labApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-work'] });
      setDetailLab(null);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LabStatus }) =>
      labApi.update(id, { status }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['lab-work'] });
      // update detail panel inline
      setDetailLab(d => d?.id === id ? { ...d, status: _.data.status } : d);
    },
  });

  const labs  = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPage(1);
  };
  const hasFilters = !!(search || statusFilter || priorityFilter);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Lab Work"
        subtitle="Manage lab orders & results"
        action={isBranchInactive ? undefined : {
          label: 'New Order',
          icon: Plus,
          onClick: () => setOrderModal('new'),
        }}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {/* Branch Inactive Banner */}
        {isBranchInactive && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <FlaskConical size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Branch is Inactive</p>
              <p className="text-xs opacity-80">Lab work management is disabled while this branch is inactive.</p>
            </div>
          </div>
        )}

        {!isBranchInactive && (<>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {[
            { label: 'Total Orders',  value: statsData?.total      ?? 0, color: 'text-[var(--text-primary)]', icon: ClipboardList, iconColor: 'text-brand-400',   iconBg: 'bg-brand-500/10' },
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

        {/* Main layout */}
        <div className="flex gap-4">

          {/* Table */}
          <div className={`flex-1 min-w-0 rounded-2xl overflow-hidden transition-all ${detailLab ? 'hidden lg:block' : ''}`}
            style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            {isLoading ? (
              <div className="text-center py-20">
                <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
              </div>
            ) : labs.length === 0 ? (
              <div className="text-center py-20">
                <FlaskConical size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                <p className="text-sm text-[var(--text-muted)]">No lab orders found.</p>
                <button onClick={() => setOrderModal('new')} className="btn-ghost mt-3 text-sm gap-2">
                  <Plus size={14} /> Create first order
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
                    {labs.map(lab => {
                      const sm = STATUS_META[lab.status];
                      const SI = sm.icon;
                      const pm = PRIORITY_META[lab.priority];
                      const hasCritical = lab.results?.some(r => resolveFlag(r.flag) === 'critical');

                      return (
                        <tr key={lab.id}
                          onClick={() => setDetailLab(lab)}
                          className="hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                          style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasCritical && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                              <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                                {lab.testName}
                              </span>
                            </div>
                            {lab.testDescription && (
                              <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
                                {lab.testDescription}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-[var(--text-primary)]">
                              {lab.patient.firstName} {lab.patient.lastName}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {lab.labName || '—'}
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
                            {format(new Date(lab.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {lab.cost != null ? Number(lab.cost).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setOrderModal(lab);
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
          {detailLab && (
            <div className="fixed inset-0 z-[92] lg:static lg:z-auto lg:w-[380px] shrink-0 rounded-none lg:rounded-2xl flex flex-col"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', maxHeight: '100dvh', top: 0 }}>
              <div className="hidden lg:block" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                <LabDetailPanel
                  lab={detailLab}
                  onClose={() => setDetailLab(null)}
                  onEdit={() => { setOrderModal(detailLab); setDetailLab(null); }}
                  onEnterResults={() => { setResultsModal(detailLab); setDetailLab(null); }}
                  onDelete={() => {
                    if (confirm('Delete this lab order?')) deleteMut.mutate(detailLab.id);
                  }}
                  onStatusChange={status => statusMut.mutate({ id: detailLab.id, status })}
                />
              </div>
              <div className="lg:hidden flex flex-col h-full" style={{ background: 'var(--bg-base)', paddingTop: 'var(--header-offset)' }}>
                <LabDetailPanel
                  lab={detailLab}
                  onClose={() => setDetailLab(null)}
                  onEdit={() => { setOrderModal(detailLab); setDetailLab(null); }}
                  onEnterResults={() => { setResultsModal(detailLab); setDetailLab(null); }}
                  onDelete={() => {
                    if (confirm('Delete this lab order?')) deleteMut.mutate(detailLab.id);
                  }}
                  onStatusChange={status => statusMut.mutate({ id: detailLab.id, status })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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
            qc.invalidateQueries({ queryKey: ['lab-work-stats'] });
          }}
        />
      )}

      {resultsModal && (
        <ResultsModal
          lab={resultsModal}
          onClose={() => setResultsModal(null)}
          onSaved={() => {
            setResultsModal(null);
            qc.invalidateQueries({ queryKey: ['lab-work-stats'] });
          }}
        />
      )}
    </div>
  );
}