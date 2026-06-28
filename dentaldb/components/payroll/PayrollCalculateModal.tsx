'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Loader2, Calculator, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { bsToAD, adToBS, BS_MONTHS } from '@/lib/calendar';

interface Props { onClose: () => void; onSuccess: () => void; }

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 14,
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, color: 'var(--text-muted)' }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={e => (e.target.style.borderColor = '#027cc6')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

function FocusSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, cursor: 'pointer' }}
      onFocus={e => (e.target.style.borderColor = '#027cc6')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

function BSDatePicker({ label, required, adValue, onChange }: {
  label: string; required?: boolean;
  adValue: string;
  onChange: (iso: string) => void;
}) {
  const today = new Date();
  const bs    = adToBS(adValue ? new Date(adValue) : today);

  const handleYear  = (y: number) => onChange(bsToAD(y, bs.month, Math.min(bs.day, 28)).toISOString().split('T')[0]);
  const handleMonth = (m: number) => onChange(bsToAD(bs.year, m, 1).toISOString().split('T')[0]);

  const years = Array.from({ length: 10 }, (_, i) => bs.year - 4 + i);

  return (
    <Field label={label} required={required}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <FocusSelect value={bs.month} onChange={e => handleMonth(Number(e.target.value))}>
          {BS_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </FocusSelect>
        <FocusSelect value={bs.year} onChange={e => handleYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y} BS</option>)}
        </FocusSelect>
      </div>
    </Field>
  );
}

export default function PayrollCalculateModal({ onClose, onSuccess }: Props) {
  const calendarType = useCalendarType();
  const { branches, activeBranch } = useAuthStore();

  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [form, setForm] = useState({
    periodStart: firstDay,
    periodEnd:   lastDay,
    branchId:    activeBranch?.id ?? '',
    notes:       '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => payrollApi.calculate(data),
    onSuccess: () => { toast.success('Payroll run calculated successfully'); onSuccess(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Calculation failed'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.periodStart || !form.periodEnd) return toast.error('Select period dates');
    mutation.mutate({ ...form, branchId: form.branchId || undefined });
  }

  const activeBranches = branches.filter(b => b.isActive && !b.isLocked);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(2,124,198,0.12)', border: '1px solid rgba(2,124,198,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={16} style={{ color: '#027cc6' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Calculate Payroll</h2>
          </div>
          <button onClick={onClose}
            style={{ padding: 6, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
            This will calculate a <strong style={{ color: 'var(--text-primary)' }}>DRAFT</strong> payroll run based on attendance and commissions for the selected branch and period.
          </p>

          {/* Branch selector */}
          <Field label="Branch" required hint={activeBranches.length > 1 ? '' : undefined}>
            <div style={{ position: 'relative' }}>
              <GitBranch size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <FocusSelect
                value={form.branchId}
                onChange={e => set('branchId', e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32, cursor: 'pointer' }}
              >
                <option value="">All Branches</option>
                {activeBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </FocusSelect>
            </div>
            {form.branchId && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Payroll will be calculated for staff in <strong style={{ color: 'var(--text-secondary)' }}>
                  {activeBranches.find(b => b.id === form.branchId)?.name ?? form.branchId}
                </strong> only.
              </p>
            )}
            {!form.branchId && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                No branch selected — will include all staff across all branches.
              </p>
            )}
          </Field>

          {/* Period pickers */}
          {calendarType === 'BS' ? (
            <>
              <BSDatePicker label="Period Start" required adValue={form.periodStart} onChange={v => set('periodStart', v)} />
              <BSDatePicker label="Period End"   required adValue={form.periodEnd}   onChange={v => set('periodEnd', v)} />
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Period Start" required>
                <FocusInput type="date" value={form.periodStart} onChange={e => set('periodStart', e.target.value)} />
              </Field>
              <Field label="Period End" required>
                <FocusInput type="date" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes for this payroll run…"
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#027cc6')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>

          {/* Summary */}
          {form.periodStart && form.periodEnd && (
            <div style={{ background: 'rgba(2,124,198,0.08)', border: '1px solid rgba(2,124,198,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#027cc6' }}>
              Period: <strong>{form.periodStart}</strong> → <strong>{form.periodEnd}</strong>
              {form.branchId && (
                <> &nbsp;·&nbsp; Branch: <strong>{activeBranches.find(b => b.id === form.branchId)?.name}</strong></>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#027cc6', color: '#fff', border: 'none',
                cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                opacity: mutation.isPending ? 0.65 : 1,
              }}>
              {mutation.isPending
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Calculator size={14} />}
              Calculate
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}