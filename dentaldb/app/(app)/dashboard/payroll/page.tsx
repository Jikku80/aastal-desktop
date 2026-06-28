'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, DollarSign, TrendingUp, Award, ChevronDown, ChevronRight,
  Download, CheckSquare, CreditCard, Plus, Loader2, Settings, Pencil, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollApi } from '@/lib/api';
import { usePermissions } from '@/store/permissions.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';
import Header from '@/components/layout/Header';
import PermissionGate from '@/components/rbac/PermissionGate';
import PayrollCalculateModal from '@/components/payroll/PayrollCalculateModal';

// ─── Style tokens ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft:     { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  finalized: { bg: 'rgba(59,130,246,0.10)',  color: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  paid:      { bg: 'rgba(16,185,129,0.10)',  color: '#10b981', border: 'rgba(16,185,129,0.25)' },
};
const fmtNPR   = (v: any) => `NPR ${Number(v ?? 0).toLocaleString()}`;
const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
const surface: React.CSSProperties  = { background: 'var(--bg-surface)',   border: '1px solid var(--border)', borderRadius: '12px' };
const elevated: React.CSSProperties = { background: 'var(--bg-elevated)',  border: '1px solid var(--border)', borderRadius: '8px' };
const inputSt: React.CSSProperties  = {
  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center' }}>
      {capFirst(status)}
    </span>
  );
}

// ─── Entry edit drawer ────────────────────────────────────────────────────────
function EntryEditDrawer({
  runId, entry, onClose, onSaved,
}: { runId: string; entry: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    taxDeduction:   Number(entry.taxDeduction   ?? 0),
    otherDeductions:Number(entry.otherDeductions ?? 0),
    bonus:          Number(entry.bonus          ?? 0),
    allowances:     Number(entry.allowances     ?? 0),
    notes:          entry.notes ?? '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => payrollApi.updateEntry(runId, entry.id, {
      taxDeduction:    form.taxDeduction,
      otherDeductions: form.otherDeductions,
      bonus:           form.bonus,
      allowances:      form.allowances,
      notes:           form.notes,
    }),
    onSuccess: () => {
      toast.success('Entry updated');
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] });
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  const grossPreview = Number(entry.baseSalary)
    + Number(entry.commissionEarned)
    + Number(entry.overtimeRate ?? 0)
    + form.bonus
    + form.allowances;
  const netPreview = Math.max(0, grossPreview - form.taxDeduction - form.otherDeductions);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        style={{ ...surface, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Edit Deductions — {entry.user?.firstName} {entry.user?.lastName}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Base {fmtNPR(entry.baseSalary)} · Commission {fmtNPR(entry.commissionEarned)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'taxDeduction',    label: 'Tax Deduction (NPR)' },
            { key: 'otherDeductions', label: 'Other Deductions — absent/late auto-calc (NPR)' },
            { key: 'bonus',           label: 'Bonus / Leave Attended (NPR)' },
            { key: 'allowances',      label: 'Allowances (NPR)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                {label}
              </label>
              <input type="number" min={0} step={0.01}
                value={(form as any)[key]}
                onChange={e => set(key, parseFloat(e.target.value) || 0)}
                style={inputSt} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Notes
            </label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} style={{ ...inputSt, resize: 'vertical' }} />
          </div>

          {/* Preview */}
          <div style={{ ...elevated, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross (preview)</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtNPR(grossPreview)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Pay (preview)</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{fmtNPR(netPreview)}</p>
            </div>
          </div>

          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#027cc6', color: '#fff', border: 'none', cursor: 'pointer' }}>
            {mut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Deduction rules panel ────────────────────────────────────────────────────
function DeductionRulesPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-deduction-rules'],
    queryFn: () => payrollApi.getDeductionRules().then(r => r.data),
  });

  const [form, setForm] = useState<Record<string, number>>({});
  const set = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }));
  const val = (k: string, def: number) => form[k] ?? (data ? Number((data as any)[k]) : def);

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => payrollApi.saveDeductionRules(form),
    onSuccess: () => { toast.success('Deduction rules saved'); qc.invalidateQueries({ queryKey: ['payroll-deduction-rules'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const fields = [
    { section: 'Deductions', items: [
      { key: 'lateDeductionPerHour',   label: 'Late deduction per hour of lateness',   hint: 'multiplier of hourly rate, e.g. 1.0 = full hourly rate', def: 1.0 },
      { key: 'halfDayDeductionRate',   label: 'Half-day absence deduction',              hint: 'fraction of daily rate, e.g. 0.5', def: 0.5 },
      { key: 'absentDeductionRate',    label: 'Absent day deduction',                    hint: 'fraction of daily rate, e.g. 1.0 = full day', def: 1.0 },
    ]},
    { section: 'Additions', items: [
      { key: 'overtimeRateMultiplier', label: 'Overtime rate multiplier',                hint: 'multiplier of hourly rate, e.g. 1.5 = 1.5× hourly', def: 1.5 },
      { key: 'leaveAttendedBonusRate', label: 'Bonus for working on leave/off day',     hint: 'fraction of daily rate per day, e.g. 1.0 = full extra day', def: 1.0 },
    ]},
    { section: 'Working-Day Basis', items: [
      { key: 'standardHoursPerDay',    label: 'Standard hours per day',                  hint: 'used to calculate overtime', def: 8 },
      { key: 'workingDaysPerMonth',    label: 'Working days per month (for proration)',   hint: 'e.g. 26; used to derive daily rate', def: 26 },
    ]},
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        style={{ ...surface, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
          background: 'var(--bg-surface)', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2,124,198,0.12)',
              border: '1px solid rgba(2,124,198,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={14} style={{ color: '#027cc6' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Payroll Deduction Rules</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Applied automatically on every payroll calculation</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {fields.map(section => (
              <div key={section.section}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', marginBottom: 10 }}>{section.section}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {section.items.map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                        display: 'block', marginBottom: 3 }}>
                        {f.label}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({f.hint})</span>
                      </label>
                      <input type="number" min={0} step={0.01}
                        value={val(f.key, f.def)}
                        onChange={e => set(f.key, parseFloat(e.target.value) || 0)}
                        style={inputSt} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: '#027cc6', color: '#fff', border: 'none', cursor: 'pointer' }}>
              {mut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Save Rules
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Run card (mobile) ────────────────────────────────────────────────────────
function RunCard({
  run, isExpanded, onToggle, entries, canFinalize, canManage,
  onFinalize, onPaid, onDownloadPayslip, onEditEntry, calendarType,
}: any) {
  return (
    <div style={{ ...surface, marginBottom: 10 }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={onToggle}>
        <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <StatusBadge status={run.status} />
            {/* FIX #5: show branchName instead of UUID */}
            {run.branchName && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>
                {run.branchName}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {run.periodStart
                ? `${formatDate(new Date(run.periodStart), calendarType)} → ${formatDate(new Date(run.periodEnd), calendarType)}`
                : `${run.periodStart} → ${run.periodEnd}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gross</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtNPR(run.totalGross)}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{fmtNPR(run.totalNet)}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {canFinalize && run.status === 'draft' && (
            <button onClick={() => onFinalize(run.id)}
              style={{ ...elevated, padding: '5px 10px', fontSize: 11, color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckSquare size={12} /> Finalize
            </button>
          )}
          {canManage && run.status === 'finalized' && (
            <button onClick={() => onPaid(run.id)}
              style={{ ...elevated, padding: '5px 10px', fontSize: 11, color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CreditCard size={12} /> Mark Paid
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>No entries for this run</p>
            ) : entries.map((entry: any) => (
              <div key={entry.id} style={{ ...elevated, padding: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                      {entry.user?.firstName} {entry.user?.lastName}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.user?.role ?? '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {run.status === 'draft' && canManage && (
                      <button onClick={() => onEditEntry(entry)}
                        style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Pencil size={11} /> Edit
                      </button>
                    )}
                    <button onClick={() => onDownloadPayslip(run.id, entry.id)}
                      style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(2,124,198,0.1)', color: '#027cc6', border: '1px solid rgba(2,124,198,0.2)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Download size={12} /> Payslip
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { label: 'Hours',    val: `${Number(entry.hoursWorked).toFixed(1)}h` },
                    { label: 'Days',     val: `${entry.attendanceDays}d` },
                    { label: 'Absent',   val: `${entry.absentDays}d` },
                    { label: 'Base',     val: fmtNPR(entry.baseSalary) },
                    { label: 'Gross',    val: fmtNPR(entry.grossPay),  bold: true },
                    { label: 'Net Pay',  val: fmtNPR(entry.netPay),    color: '#10b981', bold: true },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                      <p style={{ fontSize: 12, fontWeight: item.bold ? 700 : 400, color: (item as any).color ?? 'var(--text-primary)' }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [showCalcModal,  setShowCalcModal]  = useState(false);
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [expandedRun,    setExpandedRun]    = useState<string | null>(null);
  const [editingEntry,   setEditingEntry]   = useState<{ runId: string; entry: any } | null>(null);

  const calendarType = useCalendarType();
  const { can }      = usePermissions();
  const qc           = useQueryClient();

  const canManage   = can('payroll.manage');
  const canFinalize = can('payroll.finalize');

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn:  () => payrollApi.list().then(r => r.data),
  });

  const { data: expandedData } = useQuery({
    queryKey: ['payroll-run', expandedRun],
    queryFn:  () => expandedRun ? payrollApi.getRun(expandedRun).then(r => r.data) : null,
    enabled:  !!expandedRun,
  });

  const finalizeMutation = useMutation({
    mutationFn: (runId: string) => payrollApi.finalize(runId),
    onSuccess:  () => { toast.success('Payroll finalized'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to finalize'),
  });

  const paidMutation = useMutation({
    mutationFn: (runId: string) => payrollApi.markPaid(runId),
    onSuccess:  () => { toast.success('Marked as paid'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to mark paid'),
  });

  const [downloadingPayslip, setDownloadingPayslip] = useState<string | null>(null);

  const downloadPayslip = async (runId: string, entryId: string) => {
    const key = `${runId}-${entryId}`;
    setDownloadingPayslip(key);
    try {
      const resp = await payrollApi.payslip(runId, entryId);
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const a    = document.createElement('a'); a.href = url;
      a.download = `payslip-${entryId}.html`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Payslip downloaded');
    } catch { toast.error('Failed to download payslip'); }
    finally { setDownloadingPayslip(null); }
  };

  const runs      = (runsData as any)?.data ?? [];
  const entries   = (expandedData as any)?.entries ?? [];
  const latestRun = runs[0];
  const totalGross = runs.reduce((s: number, r: any) => r.status === 'draft' ? s + Number(r.totalGross) : s, 0);
  const totalNet   = runs.reduce((s: number, r: any) => r.status === 'draft' ? s + Number(r.totalNet)   : s, 0);

  const summaryCards = [
    { label: 'Draft Gross',   value: fmtNPR(totalGross),                          icon: DollarSign, color: '#027cc6' },
    { label: 'Draft Net',     value: fmtNPR(totalNet),                            icon: TrendingUp, color: '#10b981' },
    { label: 'Total Runs',    value: runs.length,                                  icon: Award,      color: '#f59e0b' },
    { label: 'Latest Status', value: latestRun ? capFirst(latestRun.status) : '—', icon: Users,      color: '#3b82f6' },
  ];

  return (
    <PermissionGate permission="payroll.view">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="Payroll" subtitle="Manage Payroll" />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}
          className="sm:p-6">

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
            className="lg:grid-cols-4">
            {summaryCards.map(card => (
              <motion.div key={card.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{ ...surface, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: card.color }}>{card.value}</p>
                  </div>
                  <card.icon size={18} style={{ color: card.color, opacity: 0.6 }} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Payroll runs table */}
          <div style={surface}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Payroll Runs</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {canManage && (
                  <button onClick={() => setShowRulesPanel(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <Settings size={13} /> Deduction Rules
                  </button>
                )}
                {canManage && (
                  <button onClick={() => setShowCalcModal(true)} className="btn-primary">
                    <Plus size={14} /> Calculate Payroll
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : runs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No payroll runs yet. Click "Calculate Payroll" to start.
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="responsive-card-list" style={{ padding: '12px' }}>
                  {runs.map((run: any) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      isExpanded={expandedRun === run.id}
                      onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                      entries={expandedRun === run.id ? entries : []}
                      canFinalize={canFinalize}
                      canManage={canManage}
                      onFinalize={(id: string) => finalizeMutation.mutate(id)}
                      onPaid={(id: string) => paidMutation.mutate(id)}
                      onDownloadPayslip={downloadPayslip}
                      onEditEntry={(entry: any) => setEditingEntry({ runId: run.id, entry })}
                      calendarType={calendarType}
                    />
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 0 }}>
                    {runs.map((run: any) => (
                      <div key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Run row */}
                        <div
                          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                            cursor: 'pointer', transition: 'background 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}>
                          <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                            {expandedRun === run.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                          {/* Period */}
                          <span style={{ flex: '0 0 220px', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {run.periodStart
                              ? `${formatDate(new Date(run.periodStart), calendarType)} → ${formatDate(new Date(run.periodEnd), calendarType)}`
                              : `${run.periodStart} → ${run.periodEnd}`}
                          </span>
                          {/* FIX #5: Branch name, not UUID */}
                          <span style={{ flex: '0 0 140px', fontSize: 12, color: 'var(--text-primary)' }}>
                            {run.branchName ?? 'All Branches'}
                          </span>
                          <span style={{ flex: '0 0 90px' }}><StatusBadge status={run.status} /></span>
                          <span style={{ flex: '0 0 140px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtNPR(run.totalGross)}</span>
                          <span style={{ flex: '0 0 140px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{fmtNPR(run.totalNet)}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                            {canFinalize && run.status === 'draft' && (
                              <button onClick={() => finalizeMutation.mutate(run.id)}
                                disabled={finalizeMutation.isPending}
                                style={{ ...elevated, padding: '5px 10px', fontSize: 11, color: '#3b82f6',
                                  border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckSquare size={12} /> Finalize
                              </button>
                            )}
                            {canManage && run.status === 'finalized' && (
                              <button onClick={() => paidMutation.mutate(run.id)}
                                disabled={paidMutation.isPending}
                                style={{ ...elevated, padding: '5px 10px', fontSize: 11, color: '#10b981',
                                  border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CreditCard size={12} /> Mark Paid
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded entries */}
                        {expandedRun === run.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  {['Staff','Role','Hours','Days','Absent','Base Salary','Commission','Gross','Deductions','Net',''].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 10,
                                      fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {entries.length === 0 ? (
                                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 12 }}>No entries</td></tr>
                                ) : entries.map((entry: any) => (
                                  <tr key={entry.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.user?.firstName} {entry.user?.lastName}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{entry.user?.role ?? '—'}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{Number(entry.hoursWorked).toFixed(1)}h</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{entry.attendanceDays}d</td>
                                    <td style={{ padding: '9px 14px', color: entry.absentDays > 0 ? '#ef4444' : 'var(--text-primary)' }}>{entry.absentDays}d</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{fmtNPR(entry.baseSalary)}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{fmtNPR(entry.commissionEarned)}</td>
                                    <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtNPR(entry.grossPay)}</td>
                                    <td style={{ padding: '9px 14px', color: '#ef4444' }}>
                                      -{fmtNPR(Number(entry.taxDeduction) + Number(entry.otherDeductions))}
                                    </td>
                                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#10b981' }}>{fmtNPR(entry.netPay)}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        {run.status === 'draft' && canManage && (
                                          <button onClick={() => setEditingEntry({ runId: run.id, entry })}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                                              color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            <Pencil size={12} /> Edit
                                          </button>
                                        )}
                                        <button
                                          onClick={() => downloadPayslip(run.id, entry.id)}
                                          disabled={downloadingPayslip === `${run.id}-${entry.id}`}
                                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                                            color: '#027cc6', background: 'none', border: 'none',
                                            cursor: downloadingPayslip === `${run.id}-${entry.id}` ? 'not-allowed' : 'pointer',
                                            opacity: downloadingPayslip === `${run.id}-${entry.id}` ? 0.6 : 1 }}>
                                          {downloadingPayslip === `${run.id}-${entry.id}`
                                            ? <span style={{ width: 13, height: 13, border: '2px solid #027cc6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                            : <Download size={13} />}
                                          {downloadingPayslip === `${run.id}-${entry.id}` ? 'Downloading…' : 'Payslip'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCalcModal && (
          <PayrollCalculateModal
            onClose={() => setShowCalcModal(false)}
            onSuccess={() => { setShowCalcModal(false); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); }}
          />
        )}
        {showRulesPanel && <DeductionRulesPanel onClose={() => setShowRulesPanel(false)} />}
        {editingEntry && (
          <EntryEditDrawer
            runId={editingEntry.runId}
            entry={editingEntry.entry}
            onClose={() => setEditingEntry(null)}
            onSaved={() => qc.invalidateQueries({ queryKey: ['payroll-runs'] })}
          />
        )}
      </AnimatePresence>
    </PermissionGate>
  );
}
