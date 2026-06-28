'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, FileText, Loader2, X, ChevronDown, Pill, Stethoscope, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clinicalRecordsApi, patientsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
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
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {record ? 'Edit Clinical Record' : 'New Clinical Record'}
          </h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          {/* Patient + Doctor */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-center justify-between mb-2">
              <label className="label flex items-center gap-1.5 mb-0"><Pill size={12} /> Prescriptions</label>
              <button type="button"
                onClick={() => append({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' })}
                className="btn-ghost text-xs px-2 py-1 flex items-center gap-1">
                <Plus size={11} /> Add medicine
              </button>
            </div>
            {fields.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-2">No prescriptions added.</p>
            )}
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="p-3 rounded-xl relative"
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => remove(i)}
                    className="absolute top-2 right-2 btn-ghost w-6 h-6 p-0 justify-center text-red-400">
                    <X size={12} />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
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

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : (record ? 'Update' : 'Create Record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordCard({ record, onEdit }: { record: ClinicalRecord; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const patientName = record.patient
    ? `${record.patient.firstName} ${record.patient.lastName}`
    : 'Unknown Patient';
  const doctorName = record.doctor
    ? `${record.doctor.firstName} ${record.doctor.lastName}`
    : 'Unknown Doctor';

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
        style={{ background: 'var(--bg-card)' }}
        onClick={() => setExpanded(v => !v)}>
        <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {patientName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] text-sm">{patientName}</p>
          <p className="text-xs text-[var(--text-muted)]">{record.patient?.opdNo ? `OPD: ${record.patient.opdNo} · ` : ''}Dr. {doctorName} · {format(new Date(record.createdAt), 'MMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          {record.prescriptions?.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-400">
              {record.prescriptions.length} Rx
            </span>
          )}
          {record.prescriptions?.length > 0 && (
            <PrescriptionPrintButton
              recordId={record.id}
              patientName={record.patient ? `${record.patient.firstName} ${record.patient.lastName}` : undefined}
            />
          )}
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="btn-ghost text-xs px-2 py-1">Edit</button>
          <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ background: 'var(--bg-base)' }}>
          {record.diagnosisNotes && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Diagnosis</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.diagnosisNotes}</p>
            </div>
          )}
          {record.treatmentPlan && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Treatment Plan</p>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.treatmentPlan}</p>
            </div>
          )}
          {record.prescriptions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Prescriptions</p>
              <div className="space-y-2">
                {record.prescriptions.map((rx, i) => (
                  <div key={rx.id || i} className="flex flex-wrap gap-x-4 gap-y-1 text-sm px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <span className="font-medium text-[var(--text-primary)]">{rx.medicineName}</span>
                    {rx.dosage     && <span className="text-[var(--text-muted)]">{rx.dosage}</span>}
                    {rx.frequency  && <span className="text-[var(--text-muted)]">{rx.frequency}</span>}
                    {rx.duration   && <span className="text-[var(--text-muted)]">× {rx.duration}</span>}
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
  const [showDialog, setShowDialog] = useState(false);
  const [editing,   setEditing]     = useState<ClinicalRecord | null>(null);
  const [search,    setSearch]      = useState('');
  const [dateFrom,  setDateFrom]    = useState('');
  const [dateTo,    setDateTo]      = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clinical-records', search, dateFrom, dateTo],
    queryFn: () => clinicalRecordsApi.list({ limit: 50, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then(r => r.data?.data ?? r.data ?? []),
  });

  const records: ClinicalRecord[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const filtered = records;

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Clinical Records"
        action={!branchLocked ? { label: 'New record', onClick: () => { setEditing(null); setShowDialog(true); } } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Records',   value: records.length },
            { label: 'Prescriptions',   value: records.reduce((a, r) => a + (r.prescriptions?.length || 0), 0) },
            { label: 'Unique Patients', value: new Set(records.map(r => r.patientId)).size },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative max-w-xs flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-8"
              placeholder="Search patient, OPD No, doctor, diagnosis…"
            />
          </div>
          <div className="flex items-center gap-2">
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
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="btn-ghost text-xs px-2 py-1">Clear</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={36} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-muted)]">No clinical records found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={!branchLocked ? () => { setEditing(record); setShowDialog(true); } : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {showDialog && (
        <RecordDialog record={editing} onClose={() => { setShowDialog(false); setEditing(null); }} />
      )}
    </div>
  );
}