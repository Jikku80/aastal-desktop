'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Pencil, Trash2, Loader2, X, AlertTriangle, PackageSearch,
  CheckCircle2, Clock, XCircle, PackageX, Pill, ClipboardList,
  ChevronRight, Search, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pharmacyApi, inventoryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionsStore } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';
import InvoiceModal from '@/components/billing/InvoiceModal';
import type { Product, MedicineBatch, BatchStatus, PendingPrescription } from '@/types';

// ── Status display ──────────────────────────────────────────────────────────

const STATUS_META: Record<BatchStatus, { label: string; color: string; bg: string; icon: any }> = {
  not_available: { label: 'Not Available', color: 'text-[var(--text-muted)]', bg: 'var(--bg-elevated)', icon: Clock },
  active:        { label: 'Active',        color: 'text-emerald-400',         bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
  expiring_soon: { label: 'Expiring Soon', color: 'text-amber-400',           bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle },
  expired:       { label: 'Expired',       color: 'text-red-400',             bg: 'rgba(239,68,68,0.1)',  icon: XCircle },
  depleted:      { label: 'Depleted',      color: 'text-[var(--text-muted)]', bg: 'var(--bg-elevated)',   icon: PackageX },
};

function StatusBadge({ status }: { status: BatchStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.not_available;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`} style={{ background: meta.bg }}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

// ── Batch Dialog (create/edit) ──────────────────────────────────────────────

const batchSchema = z.object({
  productId:          z.string().min(1, 'Select a medicine'),
  batchNumber:        z.string().min(1, 'Batch number is required'),
  manufacturingDate:  z.string().optional(),
  startDate:          z.string().min(1, 'Start date is required'),
  expiryDate:         z.string().min(1, 'Expiry date is required'),
  quantityReceived:   z.coerce.number().min(0.01, 'Required'),
  supplierName:       z.string().optional(),
  purchaseCost:       z.coerce.number().min(0).optional(),
  sellingPrice:       z.coerce.number().min(0).optional(),
});
type BatchForm = z.infer<typeof batchSchema>;

function BatchDialog({
  batch, branchId, pharmaProducts, onClose,
}: {
  batch?: MedicineBatch | null;
  branchId?: string;
  pharmaProducts: Product[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: batch ? {
      productId: batch.productId, batchNumber: batch.batchNumber,
      manufacturingDate: batch.manufacturingDate?.slice(0, 10),
      startDate: batch.startDate?.slice(0, 10), expiryDate: batch.expiryDate?.slice(0, 10),
      quantityReceived: batch.quantityReceived,
      supplierName: batch.supplierName, purchaseCost: batch.purchaseCost, sellingPrice: batch.sellingPrice,
    } : { startDate: format(new Date(), 'yyyy-MM-dd') },
  });

  const mutation = useMutation({
    mutationFn: (data: BatchForm) => batch
      ? pharmacyApi.update(batch.id, data)
      : pharmacyApi.create({ ...data, branchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy-batches'] });
      toast.success(batch ? 'Batch updated' : 'Batch created');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save batch'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{batch ? 'Edit Batch' : 'Add Batch'}</h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Medicine *</label>
            <select {...register('productId')} className="input w-full" disabled={!!batch}>
              <option value="">Select medicine…</option>
              {pharmaProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.strength ? ` (${p.strength})` : ''}</option>
              ))}
            </select>
            {errors.productId && <p className="text-red-400 text-xs mt-1">{errors.productId.message}</p>}
            {pharmaProducts.length === 0 && (
              <p className="text-[11px] text-amber-400 mt-1">No pharmaceutical products yet — mark a product's Item Type as &quot;Pharmaceutical&quot; on the Inventory page first.</p>
            )}
          </div>
          <div>
            <label className="label">Batch / Lot Number *</label>
            <input {...register('batchNumber')} className="input w-full" placeholder="e.g. PCM-2026-001" />
            {errors.batchNumber && <p className="text-red-400 text-xs mt-1">{errors.batchNumber.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Manufactured</label>
              <input {...register('manufacturingDate')} type="date" className="input w-full" />
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input {...register('startDate')} type="date" className="input w-full" />
              {errors.startDate && <p className="text-red-400 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Expiry Date *</label>
              <input {...register('expiryDate')} type="date" className="input w-full" />
              {errors.expiryDate && <p className="text-red-400 text-xs mt-1">Required</p>}
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] -mt-2">Batch stays &quot;Not Available&quot; until the start date, and stops being dispensable/eligible for FEFO after the expiry date.</p>
          <div>
            <label className="label">Quantity Received *</label>
            <input {...register('quantityReceived')} type="number" min="0.01" step="0.01" className="input w-full" disabled={!!batch} />
            {batch && <p className="text-[11px] text-[var(--text-muted)] mt-1">Quantity available adjusts automatically via dispensing/disposal — not editable directly.</p>}
            {errors.quantityReceived && <p className="text-red-400 text-xs mt-1">{errors.quantityReceived.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase Cost (per unit)</label>
              <input {...register('purchaseCost')} type="number" min="0" step="0.01" className="input w-full" />
            </div>
            <div>
              <label className="label">Selling Price (per unit)</label>
              <input {...register('sellingPrice')} type="number" min="0" step="0.01" className="input w-full" />
            </div>
          </div>
          <div>
            <label className="label">Supplier</label>
            <input {...register('supplierName')} className="input w-full" placeholder="ABC Pharma" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : (batch ? 'Update' : 'Add Batch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dispense Dialog (FEFO) ──────────────────────────────────────────────────

function DispenseDialog({
  branchId, pharmaProducts, prefill, onClose,
}: {
  branchId?: string;
  pharmaProducts: Product[];
  prefill?: { productId: string; quantity?: number; prescriptionId?: string; patientId?: string } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState(prefill?.productId || '');
  const [quantity, setQuantity] = useState<number>(prefill?.quantity || 1);

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['pharmacy-fefo-preview', productId, quantity, branchId],
    queryFn: () => pharmacyApi.planFefo(productId, quantity, branchId).then(r => r.data as { batchId: string; batchNumber: string; expiryDate: string; quantity: number }[]),
    enabled: !!productId && quantity > 0,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => pharmacyApi.dispense({
      productId, quantity, branchId,
      patientId: prefill?.patientId,
      // prescriptionId isn't accepted by the dispense DTO directly — billing
      // wires that linkage when this item is invoiced. From here it's a
      // direct pharmacy dispense (e.g. OTC / non-billed dispensing).
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy-batches'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-pending-dispensing'] });
      toast.success('Dispensed successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to dispense'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Dispense Medicine</h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Medicine *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} className="input w-full" disabled={!!prefill?.productId}>
              <option value="">Select medicine…</option>
              {pharmaProducts.map(p => <option key={p.id} value={p.id}>{p.name}{p.strength ? ` (${p.strength})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity *</label>
            <input type="number" min="0.01" step="0.01" value={quantity}
              onChange={e => setQuantity(Number(e.target.value))} className="input w-full" />
          </div>

          {/* FEFO preview */}
          {productId && quantity > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">FEFO Allocation Preview</p>
              {previewLoading ? (
                <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
              ) : !preview || preview.length === 0 ? (
                <p className="text-xs text-red-400">No eligible batches — insufficient usable stock.</p>
              ) : (
                <div className="space-y-1.5">
                  {preview.map(line => (
                    <div key={line.batchId} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-primary)]">Batch {line.batchNumber}</span>
                      <span className="text-[var(--text-muted)]">exp {format(new Date(line.expiryDate), 'MMM d, yyyy')} · {line.quantity} units</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !productId || quantity <= 0 || !preview?.length}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Dispense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dispose confirmation ────────────────────────────────────────────────────

function DisposeButton({ batch }: { batch: MedicineBatch }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => pharmacyApi.dispose(batch.id, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy-batches'] });
      toast.success('Batch disposed');
      setConfirming(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to dispose batch'),
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="text-xs px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25">
          {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirm write-off'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1">
      <PackageX size={12} /> Dispose
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PharmacyPage() {
  const [tab, setTab] = useState<'batches' | 'queue' | 'reports'>('batches');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState<MedicineBatch | null>(null);
  const [dispensePrefill, setDispensePrefill] = useState<{ productId: string; quantity?: number; prescriptionId?: string; patientId?: string } | null | undefined>(undefined);
  const [sellPrefill, setSellPrefill] = useState<{ productId: string; qty?: number } | null>(null);
  const [nearExpiryDays, setNearExpiryDays] = useState(30);

  const { activeBranch } = useAuthStore();
  const can = usePermissionsStore(s => s.can);
  const isReadOnly = useBranchReadOnly();

  const { data: products } = useQuery({
    queryKey: ['inventory-all-for-pharmacy', activeBranch?.id],
    queryFn: () => inventoryApi.list({ limit: 500, branchId: activeBranch?.id || undefined }).then(r => r.data?.data ?? r.data ?? []),
  });
  const pharmaProducts: Product[] = (Array.isArray(products) ? products : []).filter((p: Product) => p.itemType === 'pharmaceutical');

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['pharmacy-batches', activeBranch?.id],
    queryFn: () => pharmacyApi.list({ branchId: activeBranch?.id || undefined, limit: 300 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: tab === 'batches',
  });
  const batches: MedicineBatch[] = Array.isArray(batchesData) ? batchesData : [];

  const { data: pendingRx, isLoading: pendingLoading } = useQuery({
    queryKey: ['pharmacy-pending-dispensing', activeBranch?.id],
    queryFn: () => pharmacyApi.pendingDispensing(activeBranch?.id).then(r => r.data as PendingPrescription[]),
    enabled: tab === 'queue',
  });

  const { data: expiringReport } = useQuery({
    queryKey: ['pharmacy-report-expiry', activeBranch?.id],
    queryFn: () => pharmacyApi.reportExpiry(activeBranch?.id).then(r => r.data as MedicineBatch[]),
    enabled: tab === 'reports',
  });
  const { data: expiredReport } = useQuery({
    queryKey: ['pharmacy-report-expired', activeBranch?.id],
    queryFn: () => pharmacyApi.reportExpired(activeBranch?.id).then(r => r.data as MedicineBatch[]),
    enabled: tab === 'reports',
  });
  const { data: nearExpiryReport } = useQuery({
    queryKey: ['pharmacy-report-near-expiry', nearExpiryDays, activeBranch?.id],
    queryFn: () => pharmacyApi.reportNearExpiry(nearExpiryDays, activeBranch?.id).then(r => r.data as MedicineBatch[]),
    enabled: tab === 'reports',
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => pharmacyApi.delete(id),
    onSuccess: () => { batchesQc.invalidateQueries({ queryKey: ['pharmacy-batches'] }); toast.success('Batch deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete batch'),
  });
  const batchesQc = useQueryClient();

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search && !(b.product?.name?.toLowerCase().includes(search.toLowerCase()) || b.batchNumber.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [batches, statusFilter, search]);

  const summary = useMemo(() => ({
    active: batches.filter(b => b.status === 'active').length,
    expiringSoon: batches.filter(b => b.status === 'expiring_soon').length,
    expired: batches.filter(b => b.status === 'expired' && Number(b.quantityAvailable) > 0).length,
    notAvailable: batches.filter(b => b.status === 'not_available').length,
  }), [batches]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Pharmacy"
        subtitle="Batch tracking, FEFO dispensing & expiry management"
        action={tab === 'batches' && can('pharmacy.manage_batches' as any) ? {
          label: 'Add Batch',
          onClick: () => {
            if (!activeBranch) { toast.error('Select a branch before adding a batch.'); return; }
            setEditingBatch(null); setShowBatchDialog(true);
          },
        } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>
      {!activeBranch && <div className="px-3 sm:px-4 pt-3 shrink-0"><NoBranchBanner action="manage pharmacy batches" /></div>}

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit overflow-x-auto"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {(['batches', 'queue', 'reports'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-4 h-8 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                tab === t ? 'bg-brand-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {t === 'batches' && <><Pill size={13} /> Batches</>}
              {t === 'queue' && <><ClipboardList size={13} /> Dispense Queue</>}
              {t === 'reports' && <><PackageSearch size={13} /> Expiry Reports</>}
            </button>
          ))}
        </div>

        {/* ── BATCHES TAB ── */}
        {tab === 'batches' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {[
                { label: 'Active Batches', value: summary.active },
                { label: 'Expiring Soon', value: summary.expiringSoon, highlight: summary.expiringSoon > 0, color: 'text-amber-400' },
                { label: 'Expired (in stock)', value: summary.expired, highlight: summary.expired > 0, color: 'text-red-400' },
                { label: 'Not Yet Available', value: summary.notAvailable },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-3 sm:p-4"
                  style={{ background: 'var(--bg-card)', border: `1px solid ${card.highlight ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{card.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${card.color || 'text-[var(--text-primary)]'}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input value={search} onChange={e => setSearch(e.target.value)} className="input w-full pl-8" placeholder="Search medicine or batch #…" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="input w-auto">
                <option value="all">All statuses</option>
                <option value="not_available">Not Available</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="depleted">Depleted</option>
              </select>
              {can('pharmacy.dispense' as any) && (
                <button onClick={() => { if (!activeBranch) { toast.error('Select a branch first.'); return; } setDispensePrefill(null); }}
                  className="btn-ghost text-sm px-3 gap-1.5" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                  <Pill size={14} /> Dispense
                </button>
              )}
            </div>

            {batchesLoading ? (
              <div className="text-center py-12"><Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" /></div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12">
                <Pill size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                <p className="text-sm text-[var(--text-muted)]">No batches found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBatches.map(b => (
                  <div key={b.id} className="rounded-xl p-3 sm:p-4 flex flex-wrap items-center gap-3"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[var(--text-primary)] truncate">{b.product?.name || 'Unknown medicine'}</p>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Batch {b.batchNumber} · Exp {format(new Date(b.expiryDate), 'MMM d, yyyy')} · {b.quantityAvailable} / {b.quantityReceived} available
                        {b.supplierName ? ` · ${b.supplierName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Number(b.quantityAvailable) > 0 && (b.status === 'active' || b.status === 'expiring_soon') && can('invoice.create' as any) && (
                        <button
                          onClick={() => {
                            if (!activeBranch) { toast.error('Select a branch first.'); return; }
                            setSellPrefill({ productId: b.productId, qty: 1 });
                          }}
                          className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        >
                          <Receipt size={13} /> Sell
                        </button>
                      )}
                      {b.status === 'expired' && Number(b.quantityAvailable) > 0 && can('pharmacy.manage_expired_stock' as any) && (
                        <DisposeButton batch={b} />
                      )}
                      {can('pharmacy.manage_batches' as any) && (
                        <>
                          <button onClick={() => { setEditingBatch(b); setShowBatchDialog(true); }} className="btn-ghost w-8 h-8 p-0 justify-center"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm('Delete this batch?')) deleteMut.mutate(b.id); }} className="btn-ghost w-8 h-8 p-0 justify-center text-red-400"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DISPENSE QUEUE TAB ── */}
        {tab === 'queue' && (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-3">Prescriptions linked to pharmacy inventory that still have quantity outstanding.</p>
            {pendingLoading ? (
              <div className="text-center py-12"><Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" /></div>
            ) : !pendingRx || pendingRx.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                <p className="text-sm text-[var(--text-muted)]">Nothing pending — every linked prescription has been dispensed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRx.map(rx => {
                  const remaining = rx.quantityPrescribed != null ? Number(rx.quantityPrescribed) - Number(rx.dispensedQuantity || 0) : undefined;
                  return (
                    <div key={rx.id} className="rounded-xl p-3 sm:p-4 flex flex-wrap items-center gap-3"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-[var(--text-primary)] truncate">{rx.medicineName}</p>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            rx.dispensingStatus === 'partially_dispensed' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                          }`}>
                            {rx.dispensingStatus === 'partially_dispensed' ? 'Partially Dispensed' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {rx.clinicalRecord?.patient?.fullName || rx.clinicalRecord?.patient?.name || 'Unknown patient'}
                          {rx.dosage ? ` · ${rx.dosage}` : ''}{rx.frequency ? ` · ${rx.frequency}` : ''}
                          {remaining != null ? ` · ${remaining} remaining` : ''}
                        </p>
                      </div>
                      {can('pharmacy.dispense' as any) && rx.productId && (
                        <button
                          onClick={() => setDispensePrefill({ productId: rx.productId!, quantity: remaining, prescriptionId: rx.id, patientId: rx.clinicalRecord?.patient?.id })}
                          className="btn-primary text-xs px-3 py-1.5 shrink-0 inline-flex items-center gap-1"
                        >
                          <Pill size={13} /> Dispense <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── REPORTS TAB ── */}
        {tab === 'reports' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Near Expiry</h3>
                <select value={nearExpiryDays} onChange={e => setNearExpiryDays(Number(e.target.value))} className="input w-auto text-xs">
                  {[7, 30, 60, 90, 180].map(d => <option key={d} value={d}>Next {d} days</option>)}
                </select>
              </div>
              <ReportTable rows={nearExpiryReport} emptyLabel="Nothing expiring in this window." />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Expiring / Active Batches</h3>
              <ReportTable rows={expiringReport} emptyLabel="No active or expiring-soon batches." />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-2">Expired Stock</h3>
              <ReportTable rows={expiredReport} emptyLabel="No expired stock in inventory." highlightExpired />
            </div>
          </div>
        )}
      </div>

      {showBatchDialog && (
        <BatchDialog
          batch={editingBatch}
          branchId={activeBranch?.id}
          pharmaProducts={pharmaProducts}
          onClose={() => { setShowBatchDialog(false); setEditingBatch(null); }}
        />
      )}
      {dispensePrefill !== undefined && (
        <DispenseDialog
          branchId={activeBranch?.id}
          pharmaProducts={pharmaProducts}
          prefill={dispensePrefill}
          onClose={() => setDispensePrefill(undefined)}
        />
      )}
      {sellPrefill && (
        <InvoiceModal
          initialProductLine={sellPrefill}
          onClose={() => setSellPrefill(null)}
          onSuccess={() => {
            setSellPrefill(null);
            // Billing already dispenses the stock (BillingService routes
            // product items through PharmacyService.dispense on invoice
            // creation) — just refresh the batch list so quantities reflect it.
            batchesQc.invalidateQueries({ queryKey: ['pharmacy-batches'] });
          }}
        />
      )}
    </div>
  );
}

function ReportTable({ rows, emptyLabel, highlightExpired }: { rows?: MedicineBatch[]; emptyLabel: string; highlightExpired?: boolean }) {
  if (!rows) return <div className="py-6"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>;
  if (rows.length === 0) return <p className="text-xs text-[var(--text-muted)] py-3">{emptyLabel}</p>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)]">Medicine</th>
            <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)]">Batch</th>
            <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)]">Expiry</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-muted)]">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(b => (
            <tr key={b.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td className="px-3 py-2 text-[var(--text-primary)]">{b.product?.name || '—'}</td>
              <td className="px-3 py-2 text-[var(--text-muted)]">{b.batchNumber}</td>
              <td className={`px-3 py-2 ${highlightExpired ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{format(new Date(b.expiryDate), 'MMM d, yyyy')}</td>
              <td className="px-3 py-2 text-right text-[var(--text-primary)]">{b.quantityAvailable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
