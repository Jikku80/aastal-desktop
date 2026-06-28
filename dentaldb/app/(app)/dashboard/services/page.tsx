'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, Package, Loader2, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { servicesApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import type { ClinicService } from '@/types';

const schema = z.object({
  name:                 z.string().min(1, 'Name is required'),
  description:          z.string().optional(),
  price:                z.coerce.number().min(0, 'Price must be ≥ 0'),
  duration:             z.coerce.number().min(1).default(30),
  commissionPercentage: z.coerce.number().min(0).max(100).optional(),
});
type FormData = z.infer<typeof schema>;

function fmtPrice(v: any) {
  const n = Number(v);
  return isNaN(n) ? 'NPR 0' : `NPR ${n.toLocaleString()}`;
}

function ServiceDialog({
  service,
  onClose,
}: {
  service?: ClinicService | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: service
      ? {
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          commissionPercentage: service.commissionPercentage,
        }
      : { duration: 30, price: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      service
        ? servicesApi.update(service.id, data)
        : servicesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success(service ? 'Service updated' : 'Service created');
      onClose();
    },
    onError: () => toast.error('Failed to save service'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {service ? 'Edit Service' : 'New Service'}
          </h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Service Name *</label>
            <input {...register('name')} className="input w-full" placeholder="e.g. General Consultation" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input w-full resize-none" rows={2}
              placeholder="Optional description" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (NPR) *</label>
              <input {...register('price')} type="number" min="0" step="0.01" className="input w-full" placeholder="0" />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input {...register('duration')} type="number" min="1" className="input w-full" placeholder="30" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : (service ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ClinicService | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.list({ limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); toast.success('Service deleted'); },
    onError: () => toast.error('Failed to delete service'),
  });

  const services: ClinicService[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const openCreate  = () => { setEditing(null); setShowDialog(true); };
  const openEdit    = (s: ClinicService) => { setEditing(s); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setEditing(null); };

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Services"
        action={{ label: 'Add service', onClick: openCreate }}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: 'Total Services', value: services.length },
            { label: 'Active',         value: services.filter(s => s.isActive).length },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-3 sm:p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">{card.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Mobile card list */}
        <div className="block sm:hidden space-y-2">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <Package size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
              <p className="text-sm text-[var(--text-muted)]">No services yet. Add your first service.</p>
            </div>
          ) : services.map(svc => (
            <div key={svc.id} className="rounded-xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{svc.description}</p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${
                  svc.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {svc.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Price</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{fmtPrice(svc.price)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Duration</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={13} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-primary)]">{svc.duration}m</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => openEdit(svc)} className="btn-ghost flex-1 gap-2 text-sm">
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${svc.name}"?`)) deleteMut.mutate(svc.id); }}
                  className="btn-ghost flex-1 gap-2 text-sm text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Service', 'Price', 'Duration', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
                </td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <Package size={36} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No services yet. Add your first service.</p>
                </td></tr>
              ) : services.map(svc => (
                <tr key={svc.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{svc.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">{fmtPrice(svc.price)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Clock size={15} />
                      {svc.duration}m
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      svc.isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {svc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => openEdit(svc)}
                        className="btn-ghost w-8 h-8 p-0 justify-center">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${svc.name}"?`)) deleteMut.mutate(svc.id);
                        }}
                        className="btn-ghost w-8 h-8 p-0 justify-center text-red-400 hover:text-red-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDialog && (
        <ServiceDialog service={editing} onClose={closeDialog} />
      )}
    </div>
  );
}