'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labApi, usersApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { format } from 'date-fns';
import {
  FlaskConical, Plus, Search, X, Loader2,
  AlertTriangle, CheckCircle2, Clock, Send, XCircle, Pencil, Trash2,
  FileText, Beaker, User, ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import PatientCombobox from '@/components/ui/PatientCombobox';

// ── Types ─────────────────────────────────────────────────────────────────────
type LabStatus   = 'pending' | 'sent' | 'in_progress' | 'completed' | 'cancelled';
type LabPriority = 'routine' | 'urgent' | 'stat';

interface ResultRow {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'low' | 'high' | 'critical';
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

const FLAG_META: Record<string, { color: string; bg: string }> = {
  normal:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  low:      { color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  high:     { color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  critical: { color: 'text-red-400',     bg: 'bg-red-500/10' },
};

const EMPTY_RESULT: ResultRow = { parameter: '', value: '', unit: '', referenceRange: '', flag: 'normal' };

// ── Order Form ────────────────────────────────────────────────────────────────
function OrderModal({
  initial, onClose, onSaved,
}: {
  initial?: LabWork | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
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
        cost: form.cost ? parseFloat(form.cost) : undefined,
      });
    } finally { setSaving(false); }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: any) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FlaskConical size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {initial ? 'Edit Lab Order' : 'New Lab Order'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {initial ? `Editing ${initial.testName}` : 'Create a new laboratory work order'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* Patient */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                Patient *
              </label>
              <PatientCombobox
                value={form.patientId}
                onChange={(id, _patient) => setForm(f => ({ ...f, patientId: id }))}
              />
            </div>

            {/* Test + Lab */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Test Name *
                </label>
                <input {...field('testName')} required placeholder="CBC, Lipid Panel…" className="input w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Laboratory
                </label>
                <input {...field('labName')} placeholder="PathCare, CityLab…" className="input w-full" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                Test Description
              </label>
              <textarea {...field('testDescription')} rows={2}
                placeholder="Brief description of what this test covers…"
                className="input w-full resize-none" />
            </div>

            {/* Priority + Ordered by */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Priority
                </label>
                <select {...field('priority')} className="input w-full">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Ordered By
                </label>
                <select {...field('orderedById')} className="input w-full">
                  {staffData?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clinical notes */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                Clinical Notes / Reason for Order
              </label>
              <textarea {...field('clinicalNotes')} rows={3}
                placeholder="Clinical indication, relevant history…"
                className="input w-full resize-none" />
            </div>

            {/* Sample date + Ref + Cost */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Sample Date
                </label>
                <input type="date" {...field('sampleCollectedAt')} className="input w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Lab Ref / Accession
                </label>
                <input {...field('externalRef')} placeholder="LAB-2024-001" className="input w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Cost
                </label>
                <input type="number" min="0" step="0.01" {...field('cost')}
                  placeholder="0.00" className="input w-full" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end gap-3"
            style={{ borderTop: '1px solid var(--border)' }}>
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
  const [rows, setRows] = useState<ResultRow[]>(
    lab.results?.length ? lab.results : [{ ...EMPTY_RESULT }]
  );
  const [summary, setSummary] = useState(lab.resultSummary ?? '');
  const [receivedAt, setReceivedAt] = useState(lab.resultsReceivedAt ?? '');
  const [saving, setSaving] = useState(false);

  const setRow = (i: number, key: keyof ResultRow, val: string) =>
    setRows(rs => rs.map((r, j) => j === i ? { ...r, [key]: val } : r));

  const addRow   = () => setRows(rs => [...rs, { ...EMPTY_RESULT }]);
  const removeRow = (i: number) => setRows(rs => rs.filter((_, j) => j !== i));

  const mut = useMutation({
    mutationFn: (d: any) => labApi.update(lab.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lab-work'] }); onSaved(); },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await mut.mutateAsync({
        results: rows.filter(r => r.parameter.trim()),
        resultSummary: summary,
        resultsReceivedAt: receivedAt || undefined,
        status: 'completed',
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Enter Results</h2>
            <p className="text-xs text-[var(--text-muted)]">{lab.testName} · {lab.patient.firstName} {lab.patient.lastName}</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                  Results Received Date
                </label>
                <input type="date" value={receivedAt}
                  onChange={e => setReceivedAt(e.target.value)} className="input w-full" />
              </div>
            </div>

            {/* Results table */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2 block">
                Result Parameters
              </label>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Parameter', 'Value', 'Unit', 'Ref Range', 'Flag', ''].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[var(--text-muted)] font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-2 py-1.5">
                          <input value={row.parameter} onChange={e => setRow(i, 'parameter', e.target.value)}
                            placeholder="Hemoglobin" className="input h-7 text-xs w-full min-w-[100px]" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.value} onChange={e => setRow(i, 'value', e.target.value)}
                            placeholder="14.2" className="input h-7 text-xs w-20" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.unit ?? ''} onChange={e => setRow(i, 'unit', e.target.value)}
                            placeholder="g/dL" className="input h-7 text-xs w-16" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.referenceRange ?? ''} onChange={e => setRow(i, 'referenceRange', e.target.value)}
                            placeholder="12–17" className="input h-7 text-xs w-24" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={row.flag ?? 'normal'} onChange={e => setRow(i, 'flag', e.target.value as any)}
                            className="input h-7 text-xs">
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeRow(i)}
                            className="btn-ghost w-6 h-6 p-0 justify-center text-red-400 hover:bg-red-500/10">
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addRow}
                className="mt-2 btn-ghost text-xs gap-1.5 text-[var(--text-muted)]">
                <Plus size={12} /> Add Parameter
              </button>
            </div>

            {/* Summary */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">
                Result Summary / Interpretation
              </label>
              <textarea value={summary} onChange={e => setSummary(e.target.value)}
                rows={3} placeholder="Overall interpretation, key findings…"
                className="input w-full resize-none" />
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Results & Complete
            </button>
          </div>
        </form>
      </div>
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <FlaskConical size={20} className="text-blue-400" />
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
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Results</p>
            <div className="rounded-xl overflow-auto" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    {['Parameter', 'Value', 'Reference', 'Flag'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[var(--text-muted)] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lab.results.map((r, i) => {
                    const flagKey = r.flag ?? 'normal';
                    const fm = FLAG_META[flagKey] ?? FLAG_META.normal;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                          {r.parameter || <span className="text-[var(--text-muted)] italic">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
                          {r.value ? `${r.value}${r.unit ? ` ${r.unit}` : ''}` : <span className="text-[var(--text-muted)]">—</span>}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-muted)] font-mono">
                          {r.referenceRange || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${fm.color} ${fm.bg}`}>
                            {r.flag || 'normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
        <button onClick={onDelete}
          className="btn-ghost text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
          <Trash2 size={13} /> Delete
        </button>
        <div className="flex gap-2">
          {lab.status !== 'completed' && lab.status !== 'cancelled' && (
            <button onClick={onEnterResults} className="btn-ghost text-xs gap-1.5">
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
    queryKey: ['lab-work', page, search, statusFilter, priorityFilter],
    queryFn: () => labApi.list({
      page, limit: 25,
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
        subtitle="Manage lab"
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
            { label: 'Total Orders',  value: statsData?.total      ?? 0, color: 'text-[var(--text-primary)]' },
            { label: 'Pending',       value: statsData?.pending     ?? 0, color: 'text-amber-400' },
            { label: 'In Progress',   value: statsData?.inProgress  ?? 0, color: 'text-purple-400' },
            { label: 'Completed',     value: statsData?.completed   ?? 0, color: 'text-emerald-400' },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3 sm:p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">{c.label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search test, patient…" className="input pl-8 w-52 h-9 text-sm" />
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
          <div className={`flex-1 min-w-0 rounded-xl overflow-hidden transition-all ${detailLab ? 'hidden lg:block' : ''}`}
            style={{ border: '1px solid var(--border)' }}>
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
              <div className="overflow-x-auto">
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
                      const hasCritical = lab.results?.some(r => r.flag === 'critical');

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
            <div className="w-full lg:w-[380px] shrink-0 rounded-xl flex flex-col"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
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
