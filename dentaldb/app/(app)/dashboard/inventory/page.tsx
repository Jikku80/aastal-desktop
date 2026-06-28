'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Pencil, Trash2, Archive, Loader2, X, AlertTriangle,
  ShoppingCart, Package, CheckCircle2, Clock, XCircle, ChevronDown,
  Truck, RotateCcw, Phone, Globe, User, MapPin, FileText,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryApi, websiteOrdersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Header from '@/components/layout/Header';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import type { Product, PurchaseOrder } from '@/types';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';
import { format } from 'date-fns';

// ── Schemas ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name:          z.string().min(1, 'Name is required'),
  description:   z.string().optional(),
  price:         z.coerce.number().min(0),
  stockQuantity: z.coerce.number().min(0).default(0),
  unit:          z.string().optional(),
  purchaseUnit:     z.string().optional(),
  unitsPerPurchase: z.coerce.number().min(1).default(1),
  sku:           z.string().optional(),
  reorderPoint:  z.coerce.number().min(0).default(10),
  supplierName:  z.string().optional(),
  supplierPhone: z.string().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

const poSchema = z.object({
  supplierName:  z.string().optional(),
  supplierPhone: z.string().optional(),
  notes:         z.string().optional(),
  items: z.array(z.object({
    productId:   z.string().min(1, 'Select a product'),
    productName: z.string(),
    quantity:    z.coerce.number().min(1),
    unitCost:    z.coerce.number().min(0),
    purchaseUnit:     z.string().optional(),
    unitsPerPurchase: z.coerce.number().min(1).optional(),
  })).min(1, 'Add at least one item'),
});
type POForm = z.infer<typeof poSchema>;

// ── Status helpers ────────────────────────────────────────────────────────────

const PO_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  draft:     { label: 'Draft',     color: 'text-[var(--text-muted)] bg-[var(--bg-elevated)]',    icon: Clock },
  ordered:   { label: 'Ordered',   color: 'text-blue-400 bg-blue-500/10',                         icon: Truck },
  received:  { label: 'Received',  color: 'text-emerald-400 bg-emerald-500/10',                   icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-500/10',                           icon: XCircle },
};

// ── Product Dialog ────────────────────────────────────────────────────────────

function ProductDialog({ product, branchId, onClose }: { product?: Product | null; branchId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.imageUrl
      ? (product.imageUrl.startsWith('/')
          ? `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? ''}${product.imageUrl}`
          : product.imageUrl)
      : null
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name, description: product.description, price: product.price,
      stockQuantity: product.stockQuantity, unit: product.unit, sku: product.sku,
      purchaseUnit: product.purchaseUnit, unitsPerPurchase: product.unitsPerPurchase ?? 1,
      reorderPoint: product.reorderPoint ?? 10,
      supplierName: product.supplierName, supplierPhone: product.supplierPhone,
    } : { price: 0, stockQuantity: 0, reorderPoint: 10 },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const mutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      // Create/update the product first
      const saved = product
        ? await inventoryApi.update(product.id, data)
        : await inventoryApi.create({ ...data, branchId: branchId || undefined });
      const savedProduct = saved?.data ?? saved;
      // Upload image if a new file was selected
      if (imageFile && savedProduct?.id) {
        setUploadingImage(true);
        try {
          await inventoryApi.uploadImage(savedProduct.id, imageFile);
        } finally {
          setUploadingImage(false);
        }
      }
      return savedProduct;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      toast.success(product ? 'Product updated' : 'Product created');
      onClose();
    },
    onError: () => toast.error('Failed to save product'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          {/* Product Image Upload */}
          <div>
            <label className="label">Product Image <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
            <div className="flex items-center gap-3">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <Package size={28} className="text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1">
                <label
                  htmlFor="product-image-upload"
                  className="btn-ghost cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-2"
                  style={{ border: '1px solid var(--border)', borderRadius: 8 }}
                >
                  <Plus size={15} />
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </label>
                <input
                  id="product-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="ml-2 text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">JPG, PNG or WebP · max 5 MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Product Name *</label>
            <input {...register('name')} className="input w-full" placeholder="e.g. Paracetamol 500mg" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input w-full resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (NPR) *</label>
              <input {...register('price')} type="number" min="0" step="0.01" className="input w-full" />
            </div>
            <div>
              <label className="label">Stock Qty</label>
              <input {...register('stockQuantity')} type="number" min="0" className="input w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit</label>
              <input {...register('unit')} className="input w-full" placeholder="tablet, ml, piece" />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Stock is tracked in this unit</p>
            </div>
            <div>
              <label className="label">SKU</label>
              <input {...register('sku')} className="input w-full" placeholder="Optional" />
            </div>
          </div>
          {/* Purchase unit conversion — e.g. purchased in boxes, tracked in tablets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase Unit</label>
              <input {...register('purchaseUnit')} className="input w-full" placeholder="box, bottle, carton" />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Leave blank if purchased in the same unit as above</p>
            </div>
            <div>
              <label className="label">Units per Purchase</label>
              <input {...register('unitsPerPurchase')} type="number" min="1" className="input w-full" placeholder="e.g. 100" />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">1 {watch('purchaseUnit') || 'purchase unit'} = how many {watch('unit') || 'units'}?</p>
            </div>
          </div>
          {/* Reorder point */}
          <div>
            <label className="label">Reorder Point</label>
            <p className="text-xs text-[var(--text-muted)] mb-1">Alert fires when stock drops to or below this number</p>
            <input {...register('reorderPoint')} type="number" min="0" className="input w-full" />
          </div>
          {/* Supplier */}
          <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Supplier (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supplier Name</label>
                <input {...register('supplierName')} className="input w-full" placeholder="ABC Pharma" />
              </div>
              <div>
                <label className="label">Supplier Phone</label>
                <input {...register('supplierPhone')} className="input w-full" placeholder="+977-..." />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending || uploadingImage} className="btn-primary flex-1">
              {(mutation.isPending || uploadingImage) ? <Loader2 size={18} className="animate-spin mx-auto" /> : (product ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create PO Dialog ──────────────────────────────────────────────────────────

function CreatePODialog({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<POForm>({
    resolver: zodResolver(poSchema),
    defaultValues: { items: [{ productId: '', productName: '', quantity: 1, unitCost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const totalCost = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);

  const mutation = useMutation({
    mutationFn: (data: POForm) => inventoryApi.createPO({ ...data, branchId: activeBranch?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created');
      onClose();
    },
    onError: () => toast.error('Failed to create purchase order'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Purchase Order</h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier Name</label>
              <input {...register('supplierName')} className="input w-full" placeholder="ABC Pharma" />
            </div>
            <div>
              <label className="label">Supplier Phone</label>
              <input {...register('supplierPhone')} className="input w-full" placeholder="+977-..." />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Order Items *</label>
              <button type="button" onClick={() => append({ productId: '', productName: '', quantity: 1, unitCost: 0 })}
                className="btn-ghost text-xs gap-1 h-7 px-2">
                <Plus size={13} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-start">
                  <div>
                    <select
                      {...register(`items.${idx}.productId`)}
                      className="input w-full"
                      onChange={e => {
                        const p = products.find(p => p.id === e.target.value);
                        setValue(`items.${idx}.productId`, e.target.value);
                        setValue(`items.${idx}.productName`, p?.name ?? '');
                        setValue(`items.${idx}.unitCost`, p?.price ?? 0);
                        setValue(`items.${idx}.purchaseUnit`, p?.purchaseUnit || p?.unit || '');
                        setValue(`items.${idx}.unitsPerPurchase`, p?.unitsPerPurchase || 1);
                      }}
                    >
                      <option value="">Select product…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {errors.items?.[idx]?.productId && (
                      <p className="text-red-400 text-xs mt-0.5">{errors.items[idx].productId?.message}</p>
                    )}
                    {(() => {
                      const p = products.find(pr => pr.id === items[idx]?.productId);
                      if (!p) return null;
                      const unitsPerPurchase = p.unitsPerPurchase || 1;
                      const purchaseUnit = p.purchaseUnit || p.unit || 'unit';
                      const qty = Number(items[idx]?.quantity) || 0;
                      return unitsPerPurchase > 1 ? (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          1 {purchaseUnit} = {unitsPerPurchase} {p.unit || 'unit'} · adds {qty * unitsPerPurchase} {p.unit || 'unit'} to stock
                        </p>
                      ) : (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Purchased in {purchaseUnit}</p>
                      );
                    })()}
                  </div>
                  <input {...register(`items.${idx}.quantity`)} type="number" min="1"
                    className="input w-full" placeholder="Qty" />
                  <input {...register(`items.${idx}.unitCost`)} type="number" min="0" step="0.01"
                    className="input w-full" placeholder="Unit cost" />
                  <button type="button" onClick={() => remove(idx)}
                    className="btn-ghost w-8 h-9 p-0 justify-center text-red-400 mt-0.5">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            {errors.items?.root && <p className="text-red-400 text-xs mt-1">{errors.items.root.message}</p>}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Total: NPR {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input w-full resize-none" rows={2} placeholder="Optional notes…" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PO Card ───────────────────────────────────────────────────────────────────

function POCard({ po, onStatusChange }: { po: PurchaseOrder; onStatusChange: (status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { label, color, icon: StatusIcon } = PO_STATUS[po.status];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
              <StatusIcon size={12} /> {label}
            </span>
            {po.supplierName && (
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">{po.supplierName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
            <span>{po.items.length} item{po.items.length > 1 ? 's' : ''}</span>
            <span>NPR {Number(po.totalCost).toLocaleString()}</span>
            <span>{format(new Date(po.createdAt), 'MMM d, yyyy')}</span>
            {po.supplierPhone && (
              <a href={`tel:${po.supplierPhone}`} className="flex items-center gap-1 text-brand-400 hover:underline">
                <Phone size={11} /> {po.supplierPhone}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {po.status === 'draft' && (
            <button onClick={() => onStatusChange('ordered')}
              className="btn-primary h-8 px-3 text-xs gap-1.5">
              <Truck size={13} /> Mark Ordered
            </button>
          )}
          {po.status === 'ordered' && (
            <button onClick={() => onStatusChange('received')}
              className="btn-primary h-8 px-3 text-xs gap-1.5" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle2 size={13} /> Mark Received
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)}
            className="btn-ghost w-8 h-8 p-0 justify-center">
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-3 mb-2">Items</p>
          {po.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}>
              <span className="text-[var(--text-primary)]">{item.productName}</span>
              <div className="flex items-center gap-4 text-[var(--text-muted)] text-xs">
                <span>×{item.quantity}</span>
                <span>@ NPR {Number(item.unitCost).toLocaleString()}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  NPR {(item.quantity * item.unitCost).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {po.notes && (
            <p className="text-xs text-[var(--text-muted)] pt-1 italic">{po.notes}</p>
          )}
          {po.receivedAt && (
            <p className="text-xs text-emerald-400 pt-1">
              Received on {format(new Date(po.receivedAt), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Website Orders Tab ────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: 'Pending',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock        },
  confirmed: { label: 'Confirmed', color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: CheckCircle2 },
  delivered: { label: 'Delivered', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Package      },
  cancelled: { label: 'Cancelled', color: 'text-red-400',     bg: 'bg-red-500/10',     icon: XCircle      },
};

function WebsiteOrdersTab() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['website-orders', page, statusFilter],
    queryFn: () => websiteOrdersApi.list({ page, limit: 20, status: statusFilter || undefined }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      websiteOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const orders     = data?.data   ?? [];
  const total      = data?.total  ?? 0;
  const totalPages = data?.pages  ?? 1;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Orders', value: total,    color: '' },
          { label: 'Pending',      value: orders.filter((o: any) => o.status === 'pending').length,   color: 'text-amber-400'   },
          { label: 'Confirmed',    value: orders.filter((o: any) => o.status === 'confirmed').length, color: 'text-blue-400'    },
          { label: 'Delivered',    value: orders.filter((o: any) => o.status === 'delivered').length, color: 'text-emerald-400' },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-3 sm:p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{c.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${c.color || 'text-[var(--text-primary)]'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input h-9 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Globe size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
          <p className="text-[var(--text-muted)] text-sm">No website orders yet.</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Orders placed through your clinic website will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => {
            const meta    = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
            const Icon    = meta.icon;
            const isOpen  = expanded === order.id;

            return (
              <div key={order.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {/* Order header */}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color} ${meta.bg}`}>
                        <Icon size={11} /> {meta.label}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{order.customerName}</span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">#{order.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Phone size={11} /> {order.customerPhone}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {order.customerAddress}</span>
                      <span>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-[var(--text-primary)]">NPR {Number(order.totalAmount).toLocaleString()}</span>
                      <span>COD · {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => statusMut.mutate({ id: order.id, status: 'confirmed' })}
                        disabled={statusMut.isPending}
                        className="btn-primary h-8 px-3 text-xs gap-1.5"
                      >
                        <CheckCircle2 size={13} /> Confirm
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => statusMut.mutate({ id: order.id, status: 'delivered' })}
                        disabled={statusMut.isPending}
                        className="h-8 px-3 text-xs gap-1.5 rounded-lg font-medium inline-flex items-center transition-all"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                      >
                        <Package size={13} /> Mark Delivered
                      </button>
                    )}
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button
                        onClick={() => {
                          if (confirm('Cancel this order?')) statusMut.mutate({ id: order.id, status: 'cancelled' });
                        }}
                        disabled={statusMut.isPending}
                        className="h-8 px-2 text-xs rounded-lg font-medium inline-flex items-center gap-1 text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <XCircle size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                      className="btn-ghost w-8 h-8 p-0 justify-center"
                    >
                      <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded items */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-3 mb-2">Order Items</p>
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <span className="text-[var(--text-primary)]">{item.productName}</span>
                        <div className="flex items-center gap-4 text-[var(--text-muted)] text-xs">
                          <span>×{item.quantity}</span>
                          <span>@ NPR {Number(item.price).toLocaleString()}</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            NPR {Number(item.subtotal).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {order.orderNotes && (
                      <div className="flex items-start gap-2 pt-1">
                        <FileText size={13} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                        <p className="text-xs text-[var(--text-muted)] italic">{order.orderNotes}</p>
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        Total: NPR {Number(order.totalAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className="text-[var(--text-muted)]">Page {page} of {totalPages} · {total} orders</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-ghost h-8 px-3 gap-1.5 disabled:opacity-40">
              <ChevronLeft size={15} /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-ghost h-8 px-3 gap-1.5 disabled:opacity-40">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab]               = useState<'products' | 'purchase-orders' | 'website-orders'>('products');
  const [showDialog, setShowDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [editing, setEditing]       = useState<Product | null>(null);
  const [search, setSearch]         = useState('');
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();
  const isReadOnly = useBranchReadOnly();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, activeBranch?.id],
    queryFn: () => inventoryApi.list({ limit: 200, search: search || undefined, branchId: activeBranch?.id || undefined }).then(r => r.data?.data ?? r.data ?? []),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => inventoryApi.lowStock().then(r => r.data as Product[]),
  });

  const { data: pos, isLoading: posLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => inventoryApi.listPOs().then(r => r.data as PurchaseOrder[]),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete product'),
  });

  const updatePOMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => inventoryApi.updatePO(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      toast.success('Purchase order updated');
    },
    onError: () => toast.error('Failed to update purchase order'),
  });

  const products: Product[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const lowStock: Product[] = lowStockData || [];
  const reorderProducts = products.filter(p => p.stockQuantity <= (p.reorderPoint ?? 10));

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Inventory"
        action={tab === 'products' ? {
          label: 'Add product',
          onClick: () => {
            if (!activeBranch) { toast.error('Select a branch before adding a product.'); return; }
            setEditing(null); setShowDialog(true);
          },
        } : tab === 'purchase-orders' ? {
          label: 'Create PO',
          onClick: () => setShowPODialog(true),
        } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>
      {!activeBranch && <div className="px-3 sm:px-4 pt-3 shrink-0"><NoBranchBanner action="add products" /></div>}

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {/* Low-stock alert banner */}
        {reorderProducts.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-400 mb-0.5">
                {reorderProducts.length} product{reorderProducts.length > 1 ? 's' : ''} at or below reorder point
              </p>
              <p className="text-red-300/80 text-xs leading-relaxed">
                {reorderProducts.slice(0, 6).map(p => `${p.name} (${p.stockQuantity}/${p.reorderPoint})`).join(' · ')}
                {reorderProducts.length > 6 ? ` +${reorderProducts.length - 6} more` : ''}
              </p>
            </div>
            <button onClick={() => setShowPODialog(true)}
              className="shrink-0 btn-ghost text-xs text-red-400 border-red-400/30 h-8 px-3 gap-1.5">
              <ShoppingCart size={13} /> Create PO
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit overflow-x-auto"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {(['products', 'purchase-orders', 'website-orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-4 h-8 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {t === 'products' ? 'Products' : t === 'purchase-orders' ? 'Purchases' : (
                <span className="flex items-center gap-1.5"><Globe size={13} /> Website Orders</span>
              )}
            </button>
          ))}
        </div>

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <>
            {activeBranch && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
                Showing inventory for <strong className="text-[var(--text-primary)]">{activeBranch.name}</strong>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {[
                { label: 'Total Products', value: products.length },
                { label: 'Low / At Reorder', value: reorderProducts.length, highlight: reorderProducts.length > 0 },
                { label: 'Out of Stock', value: products.filter(p => p.stockQuantity === 0).length },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-3 sm:p-4"
                  style={{ background: 'var(--bg-card)', border: `1px solid ${card.highlight ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{card.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${card.highlight ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-3 sm:mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="input w-full sm:max-w-xs" placeholder="Search products…" />
            </div>

            {/* Mobile cards */}
            <div className="block sm:hidden space-y-2">
              {isLoading ? (
                <div className="text-center py-12"><Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" /></div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Archive size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No products yet.</p>
                </div>
              ) : products.map(p => {
                const isLow = p.stockQuantity <= (p.reorderPoint ?? 10);
                return (
                  <div key={p.id} className="rounded-xl p-4"
                    style={{ background: 'var(--bg-card)', border: `1px solid ${isLow ? 'rgba(239,68,68,0.25)' : 'var(--border)'}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 shrink-0">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        {p.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{p.description}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Price</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">NPR {Number(p.price).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Stock</p>
                        <p className={`text-sm font-semibold mt-0.5 ${p.stockQuantity === 0 ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                          {p.stockQuantity} {p.unit || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Reorder @</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.reorderPoint ?? 10}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">SKU</p>
                        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{p.sku || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => { setEditing(p); setShowDialog(true); }} className="btn-ghost flex-1 gap-2 text-sm">
                        <Pencil size={16} /> Edit
                      </button>
                      <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id); }}
                        className="btn-ghost flex-1 gap-2 text-sm text-red-400 hover:text-red-300">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    {['Product', 'SKU', 'Price', 'Stock', 'Reorder At', 'Unit', 'Supplier', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={9} className="text-center py-12">
                      <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
                    </td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12">
                      <Archive size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                      <p className="text-sm text-[var(--text-muted)]">No products yet.</p>
                    </td></tr>
                  ) : products.map(p => {
                    const isLow = p.stockQuantity <= (p.reorderPoint ?? 10);
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: isLow ? 'rgba(239,68,68,0.03)' : undefined }}
                        className="hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            >
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? ''}${p.imageUrl}` : p.imageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package size={14} className="text-[var(--text-muted)] opacity-50" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{p.name}</p>
                              {p.description && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{p.description}</p>}
                            </div>
                            {isLow && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 shrink-0">LOW</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs font-mono">{p.sku || '—'}</td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">NPR {Number(p.price).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${p.stockQuantity === 0 ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                            {p.stockQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{p.reorderPoint ?? 10}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{p.unit || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                          {p.supplierName ? (
                            <div>
                              <p className="text-[var(--text-primary)]">{p.supplierName}</p>
                              {p.supplierPhone && <a href={`tel:${p.supplierPhone}`} className="text-brand-400 hover:underline">{p.supplierPhone}</a>}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => { setEditing(p); setShowDialog(true); }} className="btn-ghost w-8 h-8 p-0 justify-center"><Pencil size={16} /></button>
                            <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id); }}
                              className="btn-ghost w-8 h-8 p-0 justify-center text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── PURCHASE ORDERS TAB ── */}
        {tab === 'purchase-orders' && (
          <>
            {/* PO stats */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
              {[
                { label: 'Total POs',  value: pos?.length ?? 0 },
                { label: 'Draft',      value: pos?.filter(p => p.status === 'draft').length ?? 0 },
                { label: 'Ordered',    value: pos?.filter(p => p.status === 'ordered').length ?? 0 },
                { label: 'Received',   value: pos?.filter(p => p.status === 'received').length ?? 0 },
              ].map(c => (
                <div key={c.label} className="rounded-xl p-3 sm:p-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{c.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">{c.value}</p>
                </div>
              ))}
            </div>

            {posLoading ? (
              <div className="text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" /></div>
            ) : !pos?.length ? (
              <div className="text-center py-16">
                <ShoppingCart size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                <p className="text-[var(--text-muted)] text-sm">No purchase orders yet.</p>
                <button onClick={() => setShowPODialog(true)} className="btn-primary mt-4 gap-2">
                  <Plus size={16} /> Create Purchase Order
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pos.map(po => (
                  <POCard
                    key={po.id}
                    po={po}
                    onStatusChange={status => updatePOMut.mutate({ id: po.id, status })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── WEBSITE ORDERS TAB ── */}
        {tab === 'website-orders' && <WebsiteOrdersTab />}

      </div>

      {showDialog && (
        <ProductDialog product={editing} branchId={activeBranch?.id} onClose={() => { setShowDialog(false); setEditing(null); }} />
      )}
      {showPODialog && (
        <CreatePODialog products={products} onClose={() => setShowPODialog(false)} />
      )}
    </div>
  );
}
