'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { expenseApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BSDateField } from '@/components/ui/BSDateField';

const CATEGORIES = [
  'salaries','rent','utilities','medical_supplies','equipment',
  'marketing','maintenance','software','lab_supplies','inventory','other',
];
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

interface Props {
  editing?: any;
  onClose: () => void;
  onSuccess: () => void;
}

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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...(props.style as any) }}
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

function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: 'none' }}
      onFocus={e => (e.target.style.borderColor = '#027cc6')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

export default function ExpenseModal({ editing, onClose, onSuccess }: Props) {
  const isEdit = !!editing;
  const { activeBranch, branches } = useAuthStore();

  // Active branches available for selection
  const activeBranches = branches.filter(b => b.isActive && !b.isLocked);
  const isMultiBranch  = activeBranches.length > 1;

  const [form, setForm] = useState({
    description: '', category: 'other', amount: '',
    branchId: activeBranch?.id ?? activeBranches[0]?.id ?? '',
    vendorId: '', staffId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    receiptUrl: '', isRecurring: false, recurringIntervalDays: '',
    referenceNumber: '', notes: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        description:           editing.description ?? '',
        category:              editing.category ?? 'other',
        amount:                String(editing.amount ?? ''),
        branchId:              editing.branchId ?? activeBranch?.id ?? activeBranches[0]?.id ?? '',
        vendorId:              editing.vendorId ?? '',
        staffId:               editing.staffId ?? '',
        expenseDate:           editing.expenseDate ?? new Date().toISOString().split('T')[0],
        receiptUrl:            editing.receiptUrl ?? '',
        isRecurring:           editing.isRecurring ?? false,
        recurringIntervalDays: String(editing.recurringIntervalDays ?? ''),
        referenceNumber:       editing.referenceNumber ?? '',
        notes:                 editing.notes ?? '',
      });
    }
  }, [editing]);

  // Vendors for the vendor dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => expenseApi.listVendors().then(r => Array.isArray(r.data) ? r.data : []),
  });

  // Staff list — always fetched so the dropdown is ready when category switches to salaries
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list-for-expense'],
    queryFn: () =>
      usersApi.listStaff().then(r => {
        const raw = r.data;
        // API may return { data: [...] } or directly [...]
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      }),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? expenseApi.update(editing.id, data) : expenseApi.create(data),
    onSuccess: () => { toast.success(isEdit ? 'Expense updated' : 'Expense created'); onSuccess(); },
    onError:   () => toast.error('Failed to save expense'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount || !form.expenseDate) {
      return toast.error('Please fill required fields');
    }
    mutation.mutate({
      ...form,
      amount: Number(form.amount),
      branchId: form.branchId || undefined,
      recurringIntervalDays: form.recurringIntervalDays ? Number(form.recurringIntervalDays) : undefined,
      vendorId: form.vendorId || undefined,
      staffId:  form.staffId  || undefined,
    });
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const isSalary = form.category === 'salaries';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            style={{ padding: 6, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="Description" required>
            <FocusInput
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Office rent for Baisakh"
            />
          </Field>

          {/* Branch — auto-set for single-branch users, selectable for multi-branch */}
          {isMultiBranch ? (
            <Field label="Branch" required>
              <FocusSelect value={form.branchId} onChange={e => set('branchId', e.target.value)}>
                <option value="">— Select Branch —</option>
                {activeBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </FocusSelect>
            </Field>
          ) : (
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Branch:</span>
              {activeBranches[0]?.name ?? 'No branch assigned'}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category" required>
              <FocusSelect value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{capFirst(c)}</option>)}
              </FocusSelect>
            </Field>
            <Field label="Amount (NPR)" required>
              <FocusInput
                type="number" min="0" step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Expense Date" required>
              <BSDateField
                value={form.expenseDate}
                onChange={v => set('expenseDate', v)}
              />
            </Field>
            <Field label="Vendor">
              <FocusSelect value={form.vendorId} onChange={e => set('vendorId', e.target.value)}>
                <option value="">— None —</option>
                {(vendors as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </FocusSelect>
            </Field>
          </div>

          {/* Salary → Staff/Dentist link (shown when category is salaries) */}
          {isSalary && (
            <Field label="Staff / Dentist">
              <FocusSelect value={form.staffId} onChange={e => set('staffId', e.target.value)}>
                <option value="">— Select staff member —</option>
                {(staffList as any[]).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}{u.role ? ` (${u.role})` : ''}
                  </option>
                ))}
              </FocusSelect>
              {(staffList as any[]).length === 0 && (
                <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                  No staff found — make sure staff members are added in the Staff page.
                </p>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Link this salary expense to a specific dentist or staff member.
              </p>
            </Field>
          )}

          <Field label="Receipt URL">
            <FocusInput
              value={form.receiptUrl}
              onChange={e => set('receiptUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>

          <Field label="Reference Number">
            <FocusInput
              value={form.referenceNumber}
              onChange={e => set('referenceNumber', e.target.value)}
              placeholder="Invoice / PO number"
            />
          </Field>

          {/* Recurring toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => set('isRecurring', !form.isRecurring)}
              style={{
                position: 'relative',
                width: 36, height: 20,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: form.isRecurring ? '#027cc6' : 'var(--bg-overlay)',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}>
              <span style={{
                position: 'absolute',
                top: 2, left: form.isRecurring ? 18 : 2,
                width: 16, height: 16,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'left 0.2s',
              }} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Recurring expense</span>
            {form.isRecurring && (
              <FocusInput
                type="number" min="1"
                value={form.recurringIntervalDays}
                onChange={e => set('recurringIntervalDays', e.target.value)}
                placeholder="Repeat every N days"
                style={{ flex: 1, minWidth: 140 }}
              />
            )}
          </div>

          <Field label="Notes">
            <FocusTextarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Additional notes…"
            />
          </Field>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.borderColor = 'var(--border-hover)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.borderColor = 'var(--border)')}>
              Cancel
            </button>
            <button
              type="submit" disabled={mutation.isPending}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#027cc6', color: '#fff', border: 'none', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                opacity: mutation.isPending ? 0.65 : 1, transition: 'opacity 0.15s',
              }}>
              {mutation.isPending && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}