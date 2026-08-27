'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Loader2, X, ClipboardCheck, CircleCheck, CircleX, Clock, Trash2, Stethoscope,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { treatmentPlansApi, servicesApi, usersApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import PatientCombobox from '@/components/ui/PatientCombobox';
import { formatNPR } from '@/lib/utils';
import type { TreatmentPlanItem, TreatmentPlanStatus } from '@/types';

const schema = z.object({
  patientId:    z.string().min(1, 'Select a patient'),
  serviceId:    z.string().optional(),
  serviceName:  z.string().min(1, 'Required'),
  doctorId:     z.string().optional(),
  priceQuoted:  z.union([z.string(), z.number()]).optional(),
  note:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_META: Record<TreatmentPlanStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  proposed: { label: 'Proposed', icon: Clock,        color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  accepted: { label: 'Accepted', icon: CircleCheck,  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  declined: { label: 'Declined', icon: CircleX,      color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function StatusBadge({ status }: { status: TreatmentPlanStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.proposed;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: meta.color, background: meta.bg }}>
      <meta.icon size={11} /> {meta.label}
    </span>
  );
}

// ── New treatment plan dialog ───────────────────────────────────────────────
function TreatmentPlanDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch, user } = useAuthStore();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceName: '' },
  });

  const patientId   = watch('patientId');
  const serviceId   = watch('serviceId');
  const doctorId    = watch('doctorId');

  const { data: servicesData } = useQuery({
    queryKey: ['services-active-tp'],
    queryFn:  () => servicesApi.list({ limit: 200, activeOnly: 'true' }).then(r => r.data),
  });
  const services = servicesData?.data || [];

  // Same branch-scoped-doctors pattern the clinical record dialog uses.
  const { data: branchDoctors } = useQuery({
    queryKey: ['branch-doctors-tp', activeBranch?.id],
    queryFn:  () => branchesApi.getDoctors(activeBranch!.id).then(r => r.data),
    enabled:  !!activeBranch?.id,
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff-list-tp'],
    queryFn: () => usersApi.listStaff({ limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: !activeBranch?.id,
  });
  const doctors = useMemo(() => (
    activeBranch?.id
      ? (Array.isArray(branchDoctors) ? branchDoctors : (branchDoctors as any)?.data ?? [])
      : (Array.isArray(staffData) ? staffData : (staffData as any)?.data ?? []).filter(
          (u: any) => ['dentist', 'doctor', 'owner'].includes(u.role),
        )
  ), [activeBranch?.id, branchDoctors, staffData]);

  const onPickService = (id: string) => {
    setValue('serviceId', id, { shouldValidate: true });
    const svc = services.find((s: any) => s.id === id);
    if (svc) {
      setValue('serviceName', svc.name, { shouldValidate: true });
      if (svc.price != null) setValue('priceQuoted', svc.price);
    }
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => treatmentPlansApi.create({
      ...data,
      priceQuoted: data.priceQuoted !== undefined && data.priceQuoted !== '' ? Number(data.priceQuoted) : undefined,
      branchId: activeBranch?.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatment-plans'] });
      toast.success('Treatment plan proposed');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create treatment plan'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-sm">
              <ClipboardCheck size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">Propose Treatment Plan</h2>
              <p className="text-xs text-[var(--text-muted)]">Recommend a treatment for the patient to accept or decline</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center shrink-0"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
            <div>
              <label className="label">Patient *</label>
              <PatientCombobox
                value={patientId}
                onChange={id => setValue('patientId', id, { shouldValidate: true })}
                branchId={activeBranch?.id}
                error={errors.patientId?.message}
              />
            </div>

            <div>
              <label className="label">Treatment / Service</label>
              <select
                value={serviceId || ''}
                onChange={e => onPickService(e.target.value)}
                className="input w-full">
                <option value="">Custom (type below)</option>
                {services.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}{s.price != null ? ` — ${formatNPR(s.price)}` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Treatment name *</label>
              <input {...register('serviceName')} className="input w-full" placeholder="e.g. Root Canal Treatment" />
              {errors.serviceName && <p className="text-[11px] text-red-500 mt-1">{errors.serviceName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Doctor</label>
                <select {...register('doctorId')} className="input w-full">
                  <option value="">Unassigned</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Price quoted (NPR)</label>
                <input {...register('priceQuoted')} type="number" step="0.01" min="0" className="input w-full" placeholder="0.00" />
              </div>
            </div>

            <div>
              <label className="label">Note</label>
              <textarea {...register('note')} rows={2} className="input w-full resize-none" placeholder="Optional notes for the patient or chart" />
            </div>
          </div>

          <div className="flex items-center gap-2 px-5 sm:px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center text-xs">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
              {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Propose plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────
export default function TreatmentPlansPanel() {
  const { activeBranch } = useAuthStore();
  const { can } = usePermissions();
  const canCreate = can('records.create');
  const canUpdate = can('records.update');
  const canDelete = can('records.delete');
  const qc = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TreatmentPlanStatus | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<TreatmentPlanItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['treatment-plans', activeBranch?.id, statusFilter],
    queryFn: () => treatmentPlansApi.list({
      limit: 100,
      branchId: activeBranch?.id,
      status: statusFilter || undefined,
    }).then(r => r.data),
  });
  const plans: TreatmentPlanItem[] = data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TreatmentPlanStatus }) =>
      treatmentPlansApi.updateStatus(id, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['treatment-plans'] });
      toast.success(status === 'accepted' ? 'Marked as accepted' : status === 'declined' ? 'Marked as declined' : 'Status updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentPlansApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatment-plans'] });
      toast.success('Treatment plan deleted');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete treatment plan'),
  });

  const filterTabs: { value: TreatmentPlanStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'proposed', label: 'Proposed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'declined', label: 'Declined' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map(tab => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: statusFilter === tab.value ? 'var(--brand)' : 'var(--bg-elevated)',
                color: statusFilter === tab.value ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === tab.value ? 'var(--brand)' : 'var(--border)'}`,
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        {canCreate && (
          <button onClick={() => setShowDialog(true)} className="btn-primary text-xs px-3 py-2">
            <Plus size={13} /> Propose plan
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[var(--text-muted)]" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-hover)' }}>
          <ClipboardCheck size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
          <p className="text-sm text-[var(--text-muted)] mb-1">No treatment plans yet.</p>
          <p className="text-xs text-[var(--text-muted)] opacity-70">
            Propose a treatment to a patient and track whether they accept or decline it.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {plans.map(plan => (
            <div key={plan.id} className="rounded-2xl p-3.5 sm:p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/10 flex items-center justify-center shrink-0">
                <Stethoscope size={16} className="text-brand-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{plan.serviceName}</p>
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {plan.patient ? `${plan.patient.firstName} ${plan.patient.lastName}` : 'Unknown patient'}
                  {plan.doctor ? ` · Dr. ${plan.doctor.firstName} ${plan.doctor.lastName}` : ''}
                  {' · '}{format(new Date(plan.proposedAt), 'MMM d, yyyy')}
                  {plan.priceQuoted != null ? ` · ${formatNPR(plan.priceQuoted)}` : ''}
                </p>
                {plan.note && <p className="text-[11px] text-[var(--text-muted)] opacity-80 mt-0.5 truncate">{plan.note}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canUpdate && plan.status === 'proposed' && (
                  <>
                    <button
                      onClick={() => statusMutation.mutate({ id: plan.id, status: 'accepted' })}
                      disabled={statusMutation.isPending}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
                      title="Mark accepted">
                      <CircleCheck size={16} />
                    </button>
                    <button
                      onClick={() => statusMutation.mutate({ id: plan.id, status: 'declined' })}
                      disabled={statusMutation.isPending}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                      title="Mark declined">
                      <CircleX size={16} />
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(plan)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                    title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && <TreatmentPlanDialog onClose={() => setShowDialog(false)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">Delete treatment plan?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              This will permanently delete the &quot;{deleteTarget.serviceName}&quot; proposal
              {deleteTarget.patient ? ` for ${deleteTarget.patient.firstName} ${deleteTarget.patient.lastName}` : ''}. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}
                className="btn-ghost flex-1 justify-center text-xs disabled:opacity-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="flex-1 justify-center flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
