'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, FileText, TrendingUp, AlertCircle, CheckCircle, X, Lock, Loader2, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { billingApi, reportsApi, patientsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import OutboxStatusBadge from '@/components/system/OutboxStatusBadge';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import PermissionGate from '@/components/rbac/PermissionGate';
import InvoiceModal from '@/components/billing/InvoiceModal';
import InvoiceDetailPanel from '@/components/billing/InvoiceDetailPanel';
import type { Invoice } from '@/types';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';
import GenericImportModal from '@/components/layout/GenericImportModal';

const STATUS_BADGE: Record<string, string> = {
  draft:          'bg-gray-500/10 text-gray-400',
  sent:           'bg-blue-500/10 text-blue-400',
  paid:           'bg-emerald-500/10 text-emerald-400',
  partially_paid: 'bg-amber-500/10 text-amber-400',
  not_yet_paid:   'bg-orange-500/10 text-orange-400',
  overdue:        'bg-red-500/10 text-red-400',
  cancelled:      'bg-gray-600/10 text-gray-500',
  refunded:       'bg-brand-500/10 text-brand-400',
};

/**
 * Resolve a patientId for an imported invoice row.
 * Looks up an existing patient by phone number first; if none is found,
 * creates a new minimal patient record (requires first + last name) and
 * uses that. Throws if neither an existing match nor enough info to
 * create a new patient is available — the row is then marked failed by
 * GenericImportModal.
 */
async function resolvePatientIdForImport(data: {
  patientFirstName?: string;
  patientLastName?: string;
  phone?: string;
}): Promise<string> {
  const { patientFirstName, patientLastName, phone } = data;

  if (phone) {
    const res = await patientsApi.list({ search: phone, limit: 1 });
    const found = res?.data?.data?.[0] ?? res?.data?.[0];
    if (found?.id) return found.id;
  }

  if (!patientFirstName || !patientLastName) {
    throw new Error(
      'No matching patient found for this row, and a first + last name is required to create a new one.',
    );
  }

  const created = await patientsApi.create({
    firstName: patientFirstName,
    lastName:  patientLastName,
    phone:     phone || undefined,
  });
  const newId = created?.data?.id ?? created?.data?.data?.id;
  if (!newId) throw new Error('Failed to create patient record for this row.');
  return newId;
}

function fmtNPR(val: any): string {
  const n = Number(val);
  if (isNaN(n)) return 'NPR 0';
  return `NPR ${n.toLocaleString()}`;
}

export default function BillingPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const deepLinkId = searchParams.get('id');
    if (!deepLinkId) return;
    billingApi.getInvoice(deepLinkId).then(r => {
      setSelectedInvoice(r.data);
      router.replace('/dashboard/billing');
    }).catch(() => { /* invoice may have been deleted */ });
  }, [searchParams]);
  const [page, setPage]                 = useState(1);
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();
  const { can } = usePermissions();
  const { isReadOnly: branchLocked } = useBranchReadOnly();

  const canManage     = can('billing.manage') && !branchLocked;
  const canSeeRevenue = can('billing.view') || can('billing.manage');
  const canCreateInv  = can('invoice.create') && !branchLocked;
  const canUpdateInv  = can('invoice.update') && !branchLocked;
  const canDeleteInv  = can('invoice.delete') && !branchLocked;

  const [showAging, setShowAging] = useState(false);
  const [agingFilter, setAgingFilter] = useState<string | null>(null);

  const { data: agingData } = useQuery({
    queryKey: ['aging-report', activeBranch?.id],
    queryFn: () => reportsApi.getAgingReport({ branchId: activeBranch?.id }).then(r => r.data),
    enabled: canSeeRevenue,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, search, statusFilter, dateFrom, dateTo, activeBranch?.id],
    queryFn: () =>
      billingApi.listInvoices({ page, limit: 20, search, status: statusFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, branchId: activeBranch?.id })
        .then(r => r.data),
  });

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['billing-summary', activeBranch?.id],
    queryFn: () => billingApi.getRevenueSummary({ branchId: activeBranch?.id }).then(r => r.data),
    enabled: canSeeRevenue,
    retry: 1,
  });

  const invoices: Invoice[] = data?.data || [];
  const total = data?.total || 0;

  // Build summary card values — show 0 if loaded but no data
  const getRevVal = (key: 'totalRevenue' | 'outstanding' | 'paidThisMonth') => {
    if (!canSeeRevenue) return null;            // no permission → lock icon
    if (summaryLoading) return 'loading';       // still fetching
    if (summaryError) return 'error';           // fetch failed
    if (!summary) return 'NPR 0';              // loaded but empty
    return fmtNPR(summary[key] ?? 0);          // actual value (including 0)
  };

  const summaryCards = [
    { label: 'Total Revenue',   key: 'totalRevenue'   as const, icon: TrendingUp,  color: 'text-emerald-400 bg-emerald-400/10' },
    { label: 'Outstanding',     key: 'outstanding'    as const, icon: AlertCircle, color: 'text-amber-400 bg-amber-400/10' },
    { label: 'Paid This Month', key: 'paidThisMonth'  as const, icon: CheckCircle, color: 'text-brand-400 bg-brand-400/10' },
    { label: 'Total Invoices',  key: null,                       icon: FileText,    color: 'text-brand-400 bg-brand-400/10' },
  ];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Billing"
        action={canCreateInv ? {
          label: 'New invoice',
          onClick: () => {
            if (!activeBranch) { toast.error('Select a branch before creating an invoice.'); return; }
            setShowModal(true);
          }
        } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>
      {!activeBranch && <div className="px-3 sm:px-4 pt-3 shrink-0"><NoBranchBanner action="create invoices" /></div>}
      <div className="px-4 pt-2 shrink-0">
        <OutboxStatusBadge actionTypes={['payment.verify_esewa', 'payment.verify_khalti', 'payment.capture_paypal']} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 lg:p-6">

          {/* ── Platform note ── */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl text-xs shrink-0"
            style={{ background: 'rgba(14,157,232,0.04)', border: '1px solid rgba(14,157,232,0.12)' }}>
            <FileText size={12} className="text-brand-400 shrink-0" />
            <span className="text-[var(--text-muted)]">
              Patient invoices &amp; clinic billing. For your ClinicKarobar platform subscription, go to{' '}
              <a href="/dashboard/settings?tab=Subscription" className="text-brand-400 hover:underline font-medium">Settings → Subscription</a>.
            </span>
          </div>

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
            {summaryCards.map(({ label, key, icon: Icon, color }, i) => {
              const val = key ? getRevVal(key) : String(total);
              const isLocked   = val === null;
              const isLoading_ = val === 'loading';
              const isError    = val === 'error';
              const display    = isLocked || isLoading_ || isError ? null : val;

              return (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 truncate">{label}</p>
                    {isLocked ? (
                      <div className="flex items-center gap-1.5">
                        <Lock size={11} className="text-[var(--text-muted)] shrink-0" />
                        <span className="text-xs text-[var(--text-muted)]">Restricted</span>
                      </div>
                    ) : isLoading_ ? (
                      <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
                    ) : isError ? (
                      <span className="text-xs text-red-400">Error</span>
                    ) : (
                      <p className="text-sm sm:text-base lg:text-lg font-bold text-[var(--text-primary)] truncate">{display}</p>
                    )}
                  </div>
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${isLocked ? 'bg-white/5' : color}`}>
                    {isLocked ? <Lock size={13} className="text-[var(--text-muted)]" /> : <Icon size={14} />}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── AR Aging Panel ── */}
          {canSeeRevenue && (agingData as any)?.total > 0 && (
            <div className="shrink-0 mb-2">
              <button
                onClick={() => setShowAging(!showAging)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
                <AlertCircle size={13} className="text-amber-400" />
                Receivables Aging
                <span className={`transform transition-transform ${showAging ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showAging && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-4 gap-3 mb-3">
                  {[
                    { key: null,     label: 'Current',     value: (agingData as any)?.current,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { key: '1-30',   label: '1–30 Days',   value: (agingData as any)?.days30,    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
                    { key: '31-60',  label: '31–60 Days',  value: (agingData as any)?.days60,    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
                    { key: '90plus', label: '60+ Days',    value: (agingData as any)?.days90plus, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
                  ].map(b => (
                    <button key={b.label}
                      onClick={() => setAgingFilter(agingFilter === b.key ? null : b.key)}
                      className={`text-left rounded-xl border p-3 transition-all hover:ring-1 hover:ring-brand/40 ${b.bg} ${agingFilter === b.key ? 'ring-2 ring-brand/60' : ''}`}>
                      <p className="text-[10px] text-muted-foreground">{b.label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${b.color}`}>NPR {Number(b.value ?? 0).toLocaleString()}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* ── Filter bar ── */}
          <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
            <div className="relative flex-1 min-w-0" style={{ maxWidth: '320px' }}>
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search invoice, patient, OPD No…"
                className="input w-full h-9 text-sm"
                style={{ paddingLeft: '2.1rem', paddingRight: search ? '2rem' : '0.75rem' }}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={12} />
                </button>
              )}
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="input h-9 text-sm shrink-0"
              style={{ width: 'auto' }}
            />
            <span className="text-xs text-[var(--text-muted)] shrink-0">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="input h-9 text-sm shrink-0"
              style={{ width: 'auto' }}
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="btn-ghost text-xs px-2 py-1 shrink-0">Clear</button>
            )}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="input h-9 text-sm shrink-0"
              style={{ width: 'auto', minWidth: '130px' }}
            >
              <option value="">All statuses</option>
              {['draft','sent','paid','partially_paid','not_yet_paid','overdue','cancelled'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">
              {total} invoice{total !== 1 ? 's' : ''}
            </p>
            {canCreateInv && (
              <button
                onClick={() => {
                  if (!activeBranch) { toast.error('Select a branch first.'); return; }
                  setShowImport(true);
                }}
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shrink-0 h-9">
                <Upload size={13} />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:flex flex-1 overflow-hidden rounded-xl flex-col"
            style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10"
                  style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Invoice #','Patient','Date','Amount','Status','Method',''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 lg:px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array(8).fill(0).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {Array(7).fill(0).map((_, j) => (
                          <td key={j} className="px-3 lg:px-4 py-3">
                            <div className="h-4 rounded animate-pulse bg-white/5" style={{ width: j === 0 ? '80px' : '100px' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                    : invoices.length === 0
                    ? (
                      <tr><td colSpan={7} className="text-center py-16">
                        <FileText size={28} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                        <p className="text-sm text-[var(--text-muted)]">No invoices found</p>
                      </td></tr>
                    )
                    : invoices.map((inv, i) => (
                      <motion.tr key={inv.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedInvoice(inv)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <p className="text-xs font-mono font-medium text-brand-400">{inv.invoiceNumber}</p>
                        </td>
                        <td className="px-3 lg:px-4 py-3">
                          <p className="text-sm text-[var(--text-primary)] whitespace-nowrap">
                            {inv.patient?.firstName} {inv.patient?.lastName}
                          </p>
                          {inv.patient?.opdNo && (
                            <p className="text-[10px] text-[var(--text-muted)]">OPD: {inv.patient.opdNo}</p>
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-[var(--text-secondary)]">
                            {format(new Date(inv.createdAt), 'MMM d, yyyy')}
                          </p>
                        </td>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {fmtNPR(inv.total)}
                          </p>
                          {Number(inv.dueAmount) > 0 && inv.status !== 'paid' && (
                            <p className="text-[10px] text-amber-400">Due: {fmtNPR(inv.dueAmount)}</p>
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[inv.status] || 'bg-gray-500/10 text-gray-400'}`}>
                            {inv.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-3 whitespace-nowrap">
                          <p className="text-xs text-[var(--text-muted)] capitalize">
                            {inv.paymentMethod?.replace('_', ' ') || '—'}
                          </p>
                        </td>
                        <td className="px-3 lg:px-4 py-3 text-[var(--text-muted)] text-sm">›</td>
                      </motion.tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile card list ── */}
          <div className="sm:hidden flex-1 overflow-y-auto space-y-2">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              ))
              : invoices.length === 0
              ? (
                <div className="text-center py-12">
                  <FileText size={28} className="mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                  <p className="text-sm text-[var(--text-muted)]">No invoices found</p>
                </div>
              )
              : invoices.map((inv, i) => (
                <motion.button key={inv.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full card p-4 text-left hover:border-brand-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-mono text-brand-400">{inv.invoiceNumber}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_BADGE[inv.status] || 'bg-gray-500/10 text-gray-400'}`}>
                      {inv.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                    {inv.patient?.firstName} {inv.patient?.lastName}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-muted)]">
                      {format(new Date(inv.createdAt), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{fmtNPR(inv.total)}</p>
                  </div>
                </motion.button>
              ))
            }
          </div>

          {/* ── Pagination ── */}
          {Math.ceil(total / 20) > 1 && (
            <div className="flex items-center justify-between mt-3 shrink-0 px-1">
              <p className="text-xs text-[var(--text-muted)]">
                {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} invoices
              </p>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="btn-secondary text-xs py-1.5 px-3 gap-1 disabled:opacity-40">
                  ← Prev
                </button>
                <span className="text-xs text-[var(--text-muted)] font-medium min-w-[60px] text-center">
                  {page} / {Math.ceil(total / 20)}
                </span>
                <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                  className="btn-secondary text-xs py-1.5 px-3 gap-1 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedInvoice && (
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onUpdate={() => {
                qc.invalidateQueries({ queryKey: ['invoices'] });
                qc.invalidateQueries({ queryKey: ['billing-summary', activeBranch?.id] });
                qc.invalidateQueries({ queryKey: ['commissions'] });
                qc.invalidateQueries({ queryKey: ['commissions-chart'] });
                qc.invalidateQueries({ queryKey: ['dentist-performance'] });
                qc.invalidateQueries({ queryKey: ['admin-dentist-performance'] });
                qc.invalidateQueries({ queryKey: ['appointments'] });
                setSelectedInvoice(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <InvoiceModal
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              qc.invalidateQueries({ queryKey: ['invoices'] });
              qc.invalidateQueries({ queryKey: ['billing-summary', activeBranch?.id] });
              toast.success('Invoice created!');
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showImport && (
          <GenericImportModal
            title="Import Invoices"
            sampleColumns={['Patient First Name','Patient Last Name','Phone','Amount','Status','Payment Method','Date','Notes']}
            columnSpecs={[
              { field: 'patientFirstName', aliases: ['patient first name','first name','firstname'] },
              { field: 'patientLastName',  aliases: ['patient last name','last name','lastname'] },
              { field: 'phone',            aliases: ['phone','mobile','contact'] },
              { field: 'totalAmount',      aliases: ['amount','total','total amount'], transform: v => Number(v) },
              { field: 'status',           aliases: ['status'] },
              { field: 'paymentMethod',    aliases: ['payment method','method','payment'] },
              { field: 'invoiceDate',      aliases: ['date','invoice date','created at'], transform: v => new Date(v).toISOString() },
              { field: 'notes',            aliases: ['notes','note','remarks'] },
            ]}
            requiredFields={['patientFirstName', 'patientLastName', 'totalAmount']}
            onImportRow={async (data) => {
              const { patientFirstName, patientLastName, phone, totalAmount, invoiceDate, ...rest } = data;
              const patientId = await resolvePatientIdForImport({ patientFirstName, patientLastName, phone });
              const amount = Number(totalAmount) || 0;
              await billingApi.createInvoice({
                ...rest,
                patientId,
                total: amount,
                items: [{
                  description: 'Imported invoice',
                  quantity:  1,
                  unitPrice: amount,
                  total:     amount,
                }],
                dueDate: invoiceDate,
                branchId: activeBranch?.id,
              });
            }}
            onClose={() => setShowImport(false)}
            onSuccess={() => {
              setShowImport(false);
              qc.invalidateQueries({ queryKey: ['invoices'] });
              qc.invalidateQueries({ queryKey: ['billing-summary', activeBranch?.id] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}