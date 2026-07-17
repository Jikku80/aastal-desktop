'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, FileText, Loader2, X, ChevronDown, Pill, Stethoscope, Search, ClipboardList, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clinicalRecordsApi, patientsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import type { ClinicalRecord } from '@/types';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';
import PrescriptionPrintButton from '@/components/prescriptions/PrescriptionPrintButton';

const rxSchema = z.object({
  medicineName: z.string().min(1, 'Required'),
  dosage:       z.string().optional(),
  frequency:    z.string().optional(),
  duration:     z.string().optional(),
  instructions: z.string().optional(),
});

const schema = z.object({
  patientId:      z.string().min(1, 'Select a patient'),
  doctorId:       z.string().min(1, 'Select a doctor'),
  appointmentId:  z.string().optional(),
  diagnosisNotes: z.string().optional(),
  treatmentPlan:  z.string().optional(),
  prescriptions:  z.array(rxSchema).default([]),
});
type FormData = z.infer<typeof schema>;

function RecordDialog({ record, onClose }: { record?: ClinicalRecord | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: record
      ? {
          patientId:      record.patientId,
          doctorId:       record.doctorId,
          appointmentId:  record.appointmentId,
          diagnosisNotes: record.diagnosisNotes,
          treatmentPlan:  record.treatmentPlan,
          prescriptions:  record.prescriptions || [],
        }
      : { prescriptions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'prescriptions' });

  const { data: patientsData } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientsApi.list({ limit: 200 }).then(r => r.data?.data ?? r.data ?? []),
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.listStaff({ limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
  });

  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.data ?? [];
  const doctors  = (Array.isArray(staffData) ? staffData : (staffData as any)?.data ?? []).filter((u: any) => ['dentist', 'doctor', 'owner'].includes(u.role));

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      record
        ? clinicalRecordsApi.update(record.id, data)
        : clinicalRecordsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success(record ? 'Record updated' : 'Record created');
      onClose();
    },
    onError: () => toast.error('Failed to save record'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
              <ClipboardList size={18} className="text-brand-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                {record ? 'Edit Clinical Record' : 'New Clinical Record'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Diagnosis, treatment plan &amp; prescriptions</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center shrink-0"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 sm:px-6 py-5 space-y-5 overflow-y-auto">
            {/* Patient + Doctor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Patient *</label>
                <select {...register('patientId')} className="input w-full">
                  <option value="">Select patient</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
                {errors.patientId && <p className="text-red-400 text-xs mt-1">{errors.patientId.message}</p>}
              </div>
              <div>
                <label className="label">Doctor *</label>
                <select {...register('doctorId')} className="input w-full">
                  <option value="">Select doctor</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                  ))}
                </select>
                {errors.doctorId && <p className="text-red-400 text-xs mt-1">{errors.doctorId.message}</p>}
              </div>
            </div>

            {/* Diagnosis */}
            <div>
              <label className="label flex items-center gap-1.5"><Stethoscope size={12} /> Diagnosis Notes</label>
              <textarea {...register('diagnosisNotes')} className="input w-full resize-none" rows={3}
                placeholder="Chief complaint, examination findings, diagnosis…" />
            </div>

            {/* Treatment */}
            <div>
              <label className="label">Treatment Plan</label>
              <textarea {...register('treatmentPlan')} className="input w-full resize-none" rows={3}
                placeholder="Proposed treatment, procedures, follow-up…" />
            </div>

            {/* Prescriptions */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="label flex items-center gap-1.5 mb-0"><Pill size={12} /> Prescriptions</label>
                <button type="button"
                  onClick={() => append({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' })}
                  className="btn-ghost text-xs px-2.5 py-1.5 gap-1 text-brand-400 hover:bg-brand-500/10">
                  <Plus size={12} /> Add medicine
                </button>
              </div>
              {fields.length === 0 && (
                <div className="text-center py-6 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-hover)' }}>
                  <Pill size={20} className="mx-auto text-[var(--text-muted)] mb-1.5 opacity-50" />
                  <p className="text-xs text-[var(--text-muted)]">No prescriptions added yet.</p>
                </div>
              )}
              <div className="space-y-2.5">
                {fields.map((field, i) => (
                  <div key={field.id} className="p-3.5 rounded-xl relative transition-colors"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                        Medicine {i + 1}
                      </span>
                      <button type="button" onClick={() => remove(i)}
                        className="btn-ghost w-6 h-6 p-0 justify-center text-red-400 hover:bg-red-500/10">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="sm:col-span-2">
                        <input {...register(`prescriptions.${i}.medicineName`)}
                          className="input w-full text-sm" placeholder="Medicine name *" />
                      </div>
                      <input {...register(`prescriptions.${i}.dosage`)}
                        className="input w-full text-sm" placeholder="Dosage (e.g. 500mg)" />
                      <input {...register(`prescriptions.${i}.frequency`)}
                        className="input w-full text-sm" placeholder="Frequency (e.g. Twice daily)" />
                      <input {...register(`prescriptions.${i}.duration`)}
                        className="input w-full text-sm" placeholder="Duration (e.g. 5 days)" />
                      <input {...register(`prescriptions.${i}.instructions`)}
                        className="input w-full text-sm" placeholder="Instructions (e.g. After meals)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 px-5 sm:px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : (record ? 'Update Record' : 'Create Record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordCard({ record, onEdit, onDelete, canDelete, deleting }: { record: ClinicalRecord; onEdit?: () => void; onDelete?: () => void; canDelete?: boolean; deleting?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const patientName = record.patient
    ? `${record.patient.firstName} ${record.patient.lastName}`
    : 'Unknown Patient';
  const doctorName = record.doctor
    ? `${record.doctor.firstName} ${record.doctor.lastName}`
    : 'Unknown Doctor';

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
        onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
          {patientName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{patientName}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {record.patient?.opdNo ? `OPD ${record.patient.opdNo} · ` : ''}Dr. {doctorName} · {format(new Date(record.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {record.prescriptions?.length > 0 && (
            <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400">
              {record.prescriptions.length} Rx
            </span>
          )}
          {record.prescriptions?.length > 0 && (
            <PrescriptionPrintButton
              recordId={record.id}
              patientName={record.patient ? `${record.patient.firstName} ${record.patient.lastName}` : undefined}
            />
          )}
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="btn-ghost text-xs px-2 py-1.5 hidden sm:inline-flex">Edit</button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              title="Delete record (Super Admin)"
              className="btn-ghost w-7 h-7 p-0 justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-50">
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          )}
          <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 pt-1 space-y-4" style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border)' }}>
          {(onEdit || (canDelete && onDelete)) && (
            <div className="sm:hidden pt-3 flex gap-2">
              {onEdit && (
                <button onClick={onEdit} className="btn-secondary text-xs flex-1 justify-center">Edit record</button>
              )}
              {canDelete && onDelete && (
                <button onClick={onDelete} disabled={deleting}
                  className="btn-secondary text-xs flex-1 justify-center text-red-400 disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete record'}
                </button>
              )}
            </div>
          )}
          {record.diagnosisNotes && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Stethoscope size={11} /> Diagnosis
              </p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{record.diagnosisNotes}</p>
            </div>
          )}
          {record.treatmentPlan && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Treatment Plan</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{record.treatmentPlan}</p>
            </div>
          )}
          {record.prescriptions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pill size={11} /> Prescriptions
              </p>
              <div className="space-y-2">
                {record.prescriptions.map((rx, i) => (
                  <div key={rx.id || i} className="flex flex-wrap gap-x-4 gap-y-1 text-sm px-3.5 py-2.5 rounded-xl"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <span className="font-semibold text-[var(--text-primary)]">{rx.medicineName}</span>
                    {rx.dosage     && <span className="text-[var(--text-secondary)]">{rx.dosage}</span>}
                    {rx.frequency  && <span className="text-[var(--text-secondary)]">{rx.frequency}</span>}
                    {rx.duration   && <span className="text-[var(--text-secondary)]">× {rx.duration}</span>}
                    {rx.instructions && <span className="text-[var(--text-muted)] italic">{rx.instructions}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClinicalRecordsPage() {
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const { can } = usePermissions();
  const canDelete = can('records.delete');
  const [showDialog, setShowDialog] = useState(false);
  const [editing,   setEditing]     = useState<ClinicalRecord | null>(null);
  const [search,    setSearch]      = useState('');
  const [dateFrom,  setDateFrom]    = useState('');
  const [dateTo,    setDateTo]      = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ClinicalRecord | null>(null);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clinicalRecordsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success('Record deleted');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete record'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['clinical-records', search, dateFrom, dateTo],
    queryFn: () => clinicalRecordsApi.list({ limit: 50, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then(r => r.data?.data ?? r.data ?? []),
  });

  const records: ClinicalRecord[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const filtered = records;

  const stats = [
    { label: 'Total Records',   value: records.length, icon: ClipboardList },
    { label: 'Prescriptions',   value: records.reduce((a, r) => a + (r.prescriptions?.length || 0), 0), icon: Pill },
    { label: 'Unique Patients', value: new Set(records.map(r => r.patientId)).size, icon: Users },
  ];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Clinical Records"
        subtitle="Diagnosis, treatment & prescription history"
        action={!branchLocked ? { label: 'New record', onClick: () => { setEditing(null); setShowDialog(true); } } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {stats.map(card => (
            <div key={card.label} className="rounded-2xl p-3.5 sm:p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                <card.icon size={16} className="text-brand-400" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] leading-tight">{card.value}</p>
                <p className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="rounded-2xl p-3 sm:p-3.5 mb-5 flex flex-wrap items-center gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-8"
              placeholder="Search patient, OPD No, doctor, diagnosis…"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-[var(--text-muted)]" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input text-sm"
              style={{ width: 'auto' }}
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input text-sm"
              style={{ width: 'auto' }}
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="btn-ghost text-xs px-2 py-1.5">Clear</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-hover)' }}>
            <FileText size={36} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-muted)] mb-1">No clinical records found.</p>
            <p className="text-xs text-[var(--text-muted)] opacity-70">Try adjusting your search or date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={!branchLocked ? () => { setEditing(record); setShowDialog(true); } : undefined}
                canDelete={canDelete}
                onDelete={() => setDeleteTarget(record)}
                deleting={deleteMutation.isPending && deleteMutation.variables === record.id}
              />
            ))}
          </div>
        )}
      </div>

      {showDialog && (
        <RecordDialog record={editing} onClose={() => { setShowDialog(false); setEditing(null); }} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">Delete clinical record?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              This will permanently delete the diagnosis, treatment plan and prescriptions for{' '}
              <span className="text-[var(--text-primary)] font-medium">
                {deleteTarget.patient ? `${deleteTarget.patient.firstName} ${deleteTarget.patient.lastName}` : 'this patient'}
              </span>. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="btn-ghost flex-1 justify-center text-xs disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
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