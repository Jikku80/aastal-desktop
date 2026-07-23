'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Receipt, TrendingDown, Clock, AlertTriangle,
  Edit2, Trash2, CheckCircle, XCircle, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import toast from 'react-hot-toast';
import { expenseApi } from '@/lib/api';
import { usePermissions } from '@/store/permissions.store';
import { useAuthStore } from '@/store/auth.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';
import Header from '@/components/layout/Header';
import PermissionGate from '@/components/rbac/PermissionGate';
import ExpenseModal from '@/components/expenses/ExpenseModal';
import ExpenseDetailPanel from '@/components/expenses/ExpenseDetailPanel';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import { NoBranchesExistBanner } from '@/components/layout/NoBranchesExistBanner';

const CATEGORY_COLORS: Record<string, string> = {
  salaries: '#6366f1', rent: '#f59e0b', utilities: '#3b82f6',
  medical_supplies: '#10b981', equipment: '#8b5cf6', marketing: '#ec4899',
  maintenance: '#f97316', software: '#06b6d4', lab_supplies: '#84cc16',
  inventory: '#0ea5e9', other: '#6b7280',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  approved: { bg: 'rgba(16,185,129,0.10)',  text: '#10b981', border: 'rgba(16,185,129,0.25)' },
  rejected: { bg: 'rgba(239,68,68,0.10)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
};

function fmtNPR(v: any) { return `NPR ${Number(v || 0).toLocaleString()}`; }
function capFirst(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '); }

const surface = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
} as React.CSSProperties;

const elevated = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
} as React.CSSProperties;

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span style={{
      background: s.bg, color: s.text,
      border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      {capFirst(status)}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#6b7280';
  return (
    <span style={{
      background: `${color}18`, color,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500,
    }}>
      {capFirst(category)}
    </span>
  );
}

function SourceBadge({ exp }: { exp: any }) {
  if (exp.payrollRunId) return <span style={{ fontSize: 10, color: '#8b5cf6', background: 'rgba(139,92,246,0.10)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>Payroll</span>;
  if (exp.labWorkId)    return <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.10)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>Lab</span>;
  if (exp.purchaseOrderId) return <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.10)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>PO</span>;
  return null;
}

// ── Mobile card view for each expense ────────────────────────────────────────
function ExpenseCard({ exp, canApprove, canManage, onApprove, onEdit, onDelete, onView, calendarType }: any) {
  return (
    <div
      onClick={() => onView(exp)}
      style={{ ...surface, padding: '14px 16px', cursor: 'pointer', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exp.description}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {exp.expenseDate ? formatDate(new Date(exp.expenseDate), calendarType) : '—'}
          </p>
        </div>
        <div style={{ marginLeft: 12, textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{fmtNPR(exp.amount)}</p>
          <StatusBadge status={exp.approvalStatus} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <CategoryBadge category={exp.category} />
          {exp.vendor?.name && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{exp.vendor.name}</span>
          )}
          <SourceBadge exp={exp} />
        </div>
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          {canApprove && exp.approvalStatus === 'pending' && (
            <>
              <button onClick={() => onApprove(exp.id, 'approved')}
                style={{ padding: 6, borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <CheckCircle size={15} />
              </button>
              <button onClick={() => onApprove(exp.id, 'rejected')}
                style={{ padding: 6, borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <CheckCircle size={15} />
              </button>
            </>
          )}
          {canManage && exp.approvalStatus !== 'approved' && (
            <>
              <button onClick={() => onEdit(exp)}
                style={{ padding: 6, borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }}>
                <Edit2 size={14} />
              </button>
              <button onClick={() => { if (confirm('Delete this expense?')) onDelete(exp.id); }}
                style={{ padding: 6, borderRadius: 6, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vendor form modal ─────────────────────────────────────────────────────────
function VendorModal({ editing, form, setForm, onClose, onSave, isSaving }: any) {
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{editing ? 'Edit Vendor' : 'Add Vendor'}</h2>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name', label: 'Vendor Name *', placeholder: 'e.g. PathCare Labs' },
            { key: 'phone', label: 'Phone', placeholder: '98XXXXXXXX' },
            { key: 'email', label: 'Email', placeholder: 'vendor@example.com' },
            { key: 'address', label: 'Address', placeholder: 'Street, City' },
          ].map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input
                value={(form as any)[f.key]}
                onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Vendor Type</label>
            <select
              value={form.vendorType}
              onChange={e => setForm((prev: any) => ({ ...prev, vendorType: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {['supplier', 'service_provider', 'utility', 'other'].map(t => (
                <option key={t} value={t}>{capFirst(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm((prev: any) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes…"
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => { if (!form.name.trim()) return toast.error('Vendor name required'); onSave(form); }}
              disabled={isSaving}
              style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#027cc6', color: '#fff', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.65 : 1 }}>
              {editing ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Vendors Tab ───────────────────────────────────────────────────────────────
function VendorsTab({ canManage }: { canManage: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [vendorForm, setVendorForm] = useState({ name: '', phone: '', email: '', address: '', vendorType: 'other', notes: '' });

  const { data: vendorsData = [], refetch } = useQuery({
    queryKey: ['vendors-manage'],
    queryFn: () => expenseApi.listVendors().then(r => Array.isArray(r.data) ? r.data : []),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingVendor
      ? expenseApi.updateVendor(editingVendor.id, data)
      : expenseApi.createVendor(data),
    onSuccess: () => {
      toast.success(editingVendor ? 'Vendor updated' : 'Vendor added');
      setShowModal(false);
      setEditingVendor(null);
      setVendorForm({ name: '', phone: '', email: '', address: '', vendorType: 'other', notes: '' });
      refetch();
    },
    onError: () => toast.error('Failed to save vendor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.deleteVendor(id),
    onSuccess: () => { toast.success('Vendor removed'); refetch(); },
    onError: () => toast.error('Failed to delete vendor'),
  });

  const openAdd = () => {
    setEditingVendor(null);
    setVendorForm({ name: '', phone: '', email: '', address: '', vendorType: 'other', notes: '' });
    setShowModal(true);
  };

  const openEdit = (v: any) => {
    setEditingVendor(v);
    setVendorForm({ name: v.name, phone: v.phone ?? '', email: v.email ?? '', address: v.address ?? '', vendorType: v.vendorType, notes: v.notes ?? '' });
    setShowModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px' }} className="sm:px-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage supplier and service provider contacts linked to expense entries.
        </p>
        {canManage && (
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#027cc6', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add Vendor
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {(vendorsData as any[]).length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No vendors yet.</p>
            {canManage && (
              <button onClick={openAdd}
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#027cc6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> Add your first vendor
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Type', 'Phone', 'Email', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(vendorsData as any[]).map((v: any) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>{v.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{capFirst(v.vendorType)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{v.phone ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{v.email ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(v)}
                          style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => { if (confirm('Remove this vendor?')) deleteMutation.mutate(v.id); }}
                          style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <VendorModal
            editing={editingVendor}
            form={vendorForm}
            setForm={setVendorForm}
            onClose={() => setShowModal(false)}
            onSave={(data: any) => saveMutation.mutate(data)}
            isSaving={saveMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ canManage, canApprove, calendarType }: any) {
  const [showModal, setShowModal]   = useState(false);
  const [selected, setSelected]     = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [category, setCategory]     = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [page, setPage]             = useState(1);
  const qc = useQueryClient();
  const { activeBranch, branches } = useAuthStore();
  const branchId = activeBranch?.id;

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', category, approvalStatus, page, branchId],
    queryFn:  () => expenseApi.list({ category: category || undefined, approvalStatus: approvalStatus || undefined, page, limit: 20, branchId }).then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', branchId],
    queryFn:  () => expenseApi.getSummary({ branchId }).then(r => r.data),
  });

  const { data: trend } = useQuery({
    queryKey: ['expenses-trend', calendarType, branchId],
    queryFn:  () => expenseApi.getMonthlyTrend({ calendarType, branchId }).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => expenseApi.approve(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense deleted'); },
    onError: () => toast.error('Cannot delete approved expense'),
  });

  const expenses  = (expensesData as any)?.data ?? [];
  const total     = (expensesData as any)?.total ?? 0;
  const chartData = Array.isArray(summary) ? summary : [];
  const trendData = Array.isArray(trend)   ? trend   : [];

  const thisMonthTotal = trendData[trendData.length - 1]?.total ?? 0;
  const lastMonthTotal = trendData[trendData.length - 2]?.total ?? 0;
  const pctChg = lastMonthTotal > 0 ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1) : '0';
  const topCat = chartData.reduce((a: any, b: any) => (Number(b.total) > Number(a?.total ?? 0) ? b : a), null);
  const pendingCount = expenses.filter((e: any) => e.approvalStatus === 'pending').length;

  const summaryCards = [
    { label: 'This Month',       value: fmtNPR(thisMonthTotal), icon: TrendingDown, color: '#ef4444',  sub: `${pctChg}% vs last month` },
    { label: 'Pending Approval', value: pendingCount,           icon: Clock,        color: '#f59e0b',  sub: 'awaiting review' },
    { label: 'Top Category',     value: topCat ? capFirst(topCat.category) : '—', icon: Receipt, color: '#027cc6', sub: topCat ? fmtNPR(topCat.total) : '' },
    { label: 'Last Month',       value: fmtNPR(lastMonthTotal), icon: AlertTriangle, color: '#8892a4', sub: 'comparison' },
  ];

  const tooltipStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' };
  const handleApprove = (id: string, status: string) => approveMutation.mutate({ id, status });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }} className="sm:p-6">

      {!activeBranch && branches.length > 1 && <NoBranchBanner action="view branch-specific expenses" />}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="lg:grid-cols-4">
        {summaryCards.map(card => (
          <motion.div key={card.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...surface, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: card.color }}>{card.value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{card.sub}</p>
              </div>
              <card.icon size={18} style={{ color: card.color, opacity: 0.6 }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="lg:grid-cols-2">
        <div style={{ ...surface, padding: '20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Expenses by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => capFirst(v).slice(0, 8)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={(v) => [fmtNPR(v), 'Total']} contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...surface, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Trend</p>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(2,124,198,0.12)', color: '#027cc6', border: '1px solid rgba(2,124,198,0.25)' }}>
              {calendarType}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={(v) => [fmtNPR(v), 'Expenses']} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table / List */}
      <div style={surface}>
        {/* Filters + Add */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
              style={{ ...elevated, padding: '7px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', border: '1px solid var(--border)' }}>
              <option value="">All Categories</option>
              {['salaries','rent','utilities','medical_supplies','equipment','marketing','maintenance','software','lab_supplies','inventory','other'].map(c => (
                <option key={c} value={c}>{capFirst(c)}</option>
              ))}
            </select>
            <select value={approvalStatus} onChange={e => { setApprovalStatus(e.target.value); setPage(1); }}
              style={{ ...elevated, padding: '7px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', border: '1px solid var(--border)' }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {canManage && (
            <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
              <Plus size={14} /> Add Expense
            </button>
          )}
        </div>

        {/* Mobile cards */}
        <div className="responsive-card-list" style={{ padding: '12px 12px 0' }}>
          {isLoading ? (
            <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
          ) : expenses.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>No expenses found</p>
          ) : expenses.map((exp: any) => (
            <ExpenseCard
              key={exp.id} exp={exp} calendarType={calendarType}
              canApprove={canApprove} canManage={canManage}
              onApprove={handleApprove}
              onEdit={(e: any) => { setEditing(e); setShowModal(true); }}
              onDelete={(id: string) => deleteMutation.mutate(id)}
              onView={(e: any) => { setSelected(e); setShowDetail(true); }}
            />
          ))}
        </div>

        {/* Desktop table */}
        <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Description', 'Category', 'Vendor', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>No expenses found</td></tr>
              ) : expenses.map((exp: any) => (
                <tr key={exp.id}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { setSelected(exp); setShowDetail(true); }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {exp.expenseDate ? formatDate(new Date(exp.expenseDate), calendarType) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exp.description}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <CategoryBadge category={exp.category} />
                      <SourceBadge exp={exp} />
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{exp.vendor?.name ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtNPR(exp.amount)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={exp.approvalStatus} /></td>
                  <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {canApprove && exp.approvalStatus === 'pending' && (
                        <>
                          <button onClick={() => approveMutation.mutate({ id: exp.id, status: 'approved' })} title="Approve"
                            style={{ padding: 6, borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <CheckCircle size={15} />
                          </button>
                          <button onClick={() => approveMutation.mutate({ id: exp.id, status: 'rejected' })} title="Reject"
                            style={{ padding: 6, borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      {canManage && exp.approvalStatus !== 'approved' && (
                        <>
                          <button onClick={() => { setEditing(exp); setShowModal(true); }}
                            style={{ padding: 6, borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(exp.id); }}
                            style={{ padding: 6, borderRadius: 6, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex' }}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ ...elevated, padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, border: '1px solid var(--border)' }}>
                Prev
              </button>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                style={{ ...elevated, padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: page * 20 >= total ? 'not-allowed' : 'pointer', opacity: page * 20 >= total ? 0.4 : 1, border: '1px solid var(--border)' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <ExpenseModal
            editing={editing}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSuccess={() => { setShowModal(false); setEditing(null); qc.invalidateQueries({ queryKey: ['expenses'] }); }}
          />
        )}
        {showDetail && selected && (
          <ExpenseDetailPanel
            expense={selected}
            onClose={() => { setShowDetail(false); setSelected(null); }}
            canApprove={canApprove}
            onApprove={(status: string) => { approveMutation.mutate({ id: selected.id, status }); setShowDetail(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'vendors'>('expenses');
  const calendarType = useCalendarType();
  const { can }      = usePermissions();
  const canManage    = can('expense.manage');
  const canApprove   = can('expense.approve');
  const { branches, isHydrated } = useAuthStore();

  const hasNoBranches = isHydrated && branches.length === 0;

  return (
    <PermissionGate permission="expense.view">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="Expenses" subtitle="Manage Expenses" />

        {hasNoBranches ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <NoBranchesExistBanner feature="Expenses" />
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div style={{ padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, flexShrink: 0 }}>
              {([
                { key: 'expenses', label: 'Expenses' },
                { key: 'vendors',  label: 'Vendors'  },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 20px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: 'transparent',
                    borderBottom: activeTab === tab.key ? '2px solid #027cc6' : '2px solid transparent',
                    color: activeTab === tab.key ? '#027cc6' : 'var(--text-secondary)',
                    marginBottom: -1, transition: 'all 0.15s',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content — each tab is fully self-contained */}
            {activeTab === 'expenses' && (
              <ExpensesTab canManage={canManage} canApprove={canApprove} calendarType={calendarType} />
            )}
            {activeTab === 'vendors' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <VendorsTab canManage={canManage} />
              </div>
            )}
          </>
        )}
      </div>
    </PermissionGate>
  );
}