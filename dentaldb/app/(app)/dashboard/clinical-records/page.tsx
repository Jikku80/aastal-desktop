'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, FileText, Loader2, X, ChevronDown, Pill, Stethoscope, Search,
  ClipboardList, Users, Calendar, Sparkles, UserRound, CircleCheck, History,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { clinicalRecordsApi, usersApi, branchesApi, inventoryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import type { ClinicalRecord, Product } from '@/types';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';
import PrescriptionPrintButton from '@/components/prescriptions/PrescriptionPrintButton';
import PatientCombobox from '@/components/ui/PatientCombobox';
import CategoryOptionPicker from '@/components/medical/CategoryOptionPicker';
import { DIAGNOSIS_OPTIONS, TREATMENT_OPTIONS } from '@/lib/clinicalOptions';
import TreatmentPlansPanel from '@/components/clinical-records/TreatmentPlansPanel';

// This page is entirely client-data-driven (React Query, auth store, etc.) —
// there's nothing useful to statically prerender at build time, and doing so
// throws ("No QueryClient set, use QueryClientProvider to set one") because
// the QueryClientProvider only exists in the browser render tree, not during
// Next's build-time static generation pass. `force-dynamic` skips that pass
// for this route entirely; the page is rendered on request instead.
export const dynamic = 'force-dynamic';

// ── Quick-pick vocabulary — trims typing for the most common entries ──
// Diagnosis / treatment quick-picks are grouped by clinic type (Dental / Eye
// / Skin / Ortho / Other) — see lib/clinicalOptions.ts and
// components/medical/CategoryOptionPicker.tsx.
const COMMON_MEDICINES: { name: string; dosage: string }[] = [
  { name: 'Amoxicillin', dosage: '500mg' },
  { name: 'Metronidazole', dosage: '400mg' },
  { name: 'Ibuprofen', dosage: '400mg' },
  { name: 'Paracetamol', dosage: '500mg' },
  { name: 'Chlorhexidine Mouthwash', dosage: '0.2%' },
];
const FREQUENCY_PRESETS = ['Once daily', 'Twice daily', 'Three times daily', 'As needed'];
const DURATION_PRESETS = ['3 days', '5 days', '7 days', '10 days'];

// Records-per-page for the list below. The backend's findAll() already
// supports page/limit and returns { data, total, page, limit } — this page
// just wasn't asking for a page before, so it always got everything.
const PAGE_SIZE = 20;

// productId links a prescription line to a pharmacy Product (Phase 3
// backend column) so it flows into the pharmacy Dispense Queue instead of
// needing a manual after-the-fact link (Phase 11). Both fields stay
// optional — a prescription can still be pure free-text for medicines
// outside the pharmacy inventory. '' is normalized to undefined so an
// unselected <select> doesn't get sent as an empty-string productId (which
// would fail the FK on the backend).
const emptyToUndefined = (v: unknown) => (v === '' || v === undefined ? undefined : v);
const rxSchema = z.object({
  // Present only when editing an existing line — lets the backend match it
  // back to its row on save instead of treating it as a brand-new line
  // (see ClinicalRecordsService.syncPrescriptions).
  id:                 z.string().optional(),
  medicineName:       z.string().min(1, 'Required'),
  dosage:             z.string().optional(),
  frequency:          z.string().optional(),
  duration:           z.string().optional(),
  instructions:       z.string().optional(),
  productId:          z.preprocess(emptyToUndefined, z.string().optional()),
  quantityPrescribed: z.preprocess(
    v => (v === '' || v === null || v === undefined || Number.isNaN(v as any) ? undefined : Number(v)),
    z.number().positive('Qty must be > 0').optional(),
  ),
}).refine(d => !d.productId || (d.quantityPrescribed ?? 0) > 0, {
  message: 'Quantity is required when linking a pharmacy item',
  path: ['quantityPrescribed'],
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

// ── Small shared bits ─────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, step, title, hint, done }:
  { icon: React.ElementType; step: number; title: string; hint?: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
        ${done ? 'bg-emerald-500/15 text-emerald-500' : 'bg-brand-500/15 text-brand-400'}`}>
        {done ? <CircleCheck size={14} /> : step}
      </div>
      <Icon size={14} className="text-[var(--text-muted)] shrink-0" />
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {hint && <span className="text-[11px] text-[var(--text-muted)] ml-auto hidden sm:inline">{hint}</span>}
    </div>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0
        text-[var(--text-secondary)] hover:text-brand-400 hover:border-brand-500/50 border border-[var(--border)]"
      style={{ background: 'var(--bg-elevated)' }}>
      {children}
    </button>
  );
}

function initials(first?: string, last?: string) {
  return `${(first || '?')[0] ?? ''}${(last || '')[0] ?? ''}`.toUpperCase();
}

// ── Record dialog ───────────────────────────────────────────────────────────
function RecordDialog({ record, onClose }: { record?: ClinicalRecord | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch, user } = useAuthStore();

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    // IMPORTANT: fields that are nullable in the database (appointmentId,
    // diagnosisNotes, treatmentPlan, doctorId) come back from the API as
    // `null`, not `undefined`. zod's `.optional()` only accepts `undefined` —
    // handing it `null` fails validation silently (react-hook-form just
    // never calls onSubmit, with no visible error), which is why editing an
    // existing record could appear to do nothing when you hit "Update
    // Record". Coercing null → undefined here is the fix.
    defaultValues: record
      ? {
          patientId:      record.patientId ?? undefined,
          doctorId:       record.doctorId ?? undefined,
          appointmentId:  record.appointmentId ?? undefined,
          diagnosisNotes: record.diagnosisNotes ?? undefined,
          treatmentPlan:  record.treatmentPlan ?? undefined,
          prescriptions:  (record.prescriptions || []).map(rx => ({
            id:                 rx.id,
            medicineName:       rx.medicineName ?? '',
            dosage:             rx.dosage ?? undefined,
            frequency:          rx.frequency ?? undefined,
            duration:           rx.duration ?? undefined,
            instructions:       rx.instructions ?? undefined,
            productId:          rx.productId ?? undefined,
            quantityPrescribed: rx.quantityPrescribed ?? undefined,
          })),
        }
      : { prescriptions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'prescriptions' });

  const patientId      = watch('patientId');
  const doctorId        = watch('doctorId');
  const diagnosisNotes  = watch('diagnosisNotes');
  const treatmentPlan   = watch('treatmentPlan');

  // Doctors — scoped to the active branch when one is set, same rule the
  // appointment/recall flows use, so this no longer shows staff from every
  // branch in a multi-branch clinic.
  const { data: branchDoctors } = useQuery({
    queryKey: ['branch-doctors-clinical-record', activeBranch?.id],
    queryFn:  () => branchesApi.getDoctors(activeBranch!.id).then(r => r.data),
    enabled:  !!activeBranch?.id,
  });
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
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

  // Pharmacy inventory items a prescription line can link to (Phase 11) —
  // same inventoryApi + itemType === 'pharmaceutical' filter the Pharmacy
  // page already uses, so this is the same picker pattern, not a new one.
  // Same-branch scoping matches every other item picker in the app
  // (InvoiceModal's product lines, the pharmacy Dispense Queue).
  const { data: inventoryData } = useQuery({
    queryKey: ['pharma-products-for-rx', activeBranch?.id],
    queryFn:  () => inventoryApi.list({ limit: 500, activeOnly: 'true', branchId: activeBranch?.id || undefined }).then(r => r.data),
  });
  const pharmaProducts: Product[] = useMemo(
    () => ((inventoryData?.data ?? inventoryData ?? []) as Product[]).filter(p => p.itemType === 'pharmaceutical'),
    [inventoryData],
  );

  // Auto-select the logged-in clinician as the doctor on a brand new record —
  // the common case is a dentist logging their own patient, so this removes
  // a click for them while leaving it fully editable.
  useEffect(() => {
    if (record || doctorId || !user || doctors.length === 0) return;
    if (['dentist', 'doctor'].includes(user.role) && doctors.some((d: any) => d.id === user.id)) {
      setValue('doctorId', user.id, { shouldValidate: true });
    }
  }, [doctors, record, doctorId, user, setValue]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      record
        ? clinicalRecordsApi.update(record.id, data)
        : clinicalRecordsApi.create({ ...data, branchId: activeBranch?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success(record ? 'Record updated' : 'Record created');
      onClose();
    },
    onError: () => toast.error('Failed to save record'),
  });

  const appendText = (field: 'diagnosisNotes' | 'treatmentPlan', text: string) => {
    const current = (field === 'diagnosisNotes' ? diagnosisNotes : treatmentPlan) || '';
    const next = current.trim() ? `${current.trim()}; ${text}` : text;
    setValue(field, next, { shouldValidate: true });
  };

  const addQuickMedicine = (name: string, dosage: string) => {
    append({ medicineName: name, dosage, frequency: '', duration: '', instructions: '' });
  };

  // Linking a line to pharmacy inventory: fills medicineName from the
  // product if the doctor hasn't typed one yet, and clears any stale
  // quantity when unlinking. This is the one place a prescription line
  // gains a productId — from here it's picked up automatically by the
  // pharmacy Dispense Queue (dashboard/pharmacy/page.tsx), no separate
  // linking step needed.
  const linkPharmacyProduct = (i: number, productId: string) => {
    setValue(`prescriptions.${i}.productId`, productId, { shouldValidate: true });
    if (!productId) {
      setValue(`prescriptions.${i}.quantityPrescribed`, undefined as any, { shouldValidate: true });
      return;
    }
    const product = pharmaProducts.find(p => p.id === productId);
    const currentName = watch(`prescriptions.${i}.medicineName`);
    if (product && !currentName?.trim()) {
      setValue(`prescriptions.${i}.medicineName`, product.name, { shouldValidate: true });
    }
  };

  const step1Done = !!patientId && !!doctorId;
  const step2Done = !!(diagnosisNotes?.trim() || treatmentPlan?.trim());

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-sm">
              <ClipboardList size={18} className="text-white" />
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
          <div className="px-5 sm:px-6 py-5 space-y-6 overflow-y-auto">

            {/* Step 1 — Patient + Doctor */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <SectionHeading icon={UserRound} step={1} title="Patient & doctor" done={step1Done} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="label">Doctor *</label>
                  {doctors.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
                      {doctors.map((d: any) => {
                        const active = doctorId === d.id;
                        return (
                          <button key={d.id} type="button"
                            onClick={() => setValue('doctorId', d.id, { shouldValidate: true })}
                            className="flex flex-col items-center gap-1 shrink-0 rounded-xl px-2.5 py-2 transition-all"
                            style={{
                              background: active ? 'var(--brand)' : 'var(--bg-surface)',
                              border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                            }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)', color: active ? '#fff' : 'var(--text-secondary)' }}>
                              {initials(d.firstName, d.lastName)}
                            </div>
                            <span className="text-[10px] font-medium whitespace-nowrap max-w-[64px] truncate"
                              style={{ color: active ? '#fff' : 'var(--text-secondary)' }}>
                              Dr. {d.firstName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-2.5">No doctors found for this branch.</p>
                  )}
                  {errors.doctorId && <p className="text-red-400 text-xs mt-1.5">{errors.doctorId.message}</p>}
                </div>
              </div>
            </div>

            {/* Visit History — dated visits appended automatically from the
                Billing modal whenever this patient is billed for services.
                Read-only here: a single treatment-plan box can't represent
                several dated visits, so this list is the source of truth
                for "what was billed, when, by which doctor" and the
                Diagnosis/Treatment box below stays for free-form notes. */}
            {!!record?.visits?.length && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-brand-500/15 text-brand-400">
                    <History size={13} />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Visit history</h3>
                  <span className="text-[11px] text-[var(--text-muted)] ml-auto">From billing · read-only</span>
                </div>
                <div className="space-y-2">
                  {[...record.visits]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(visit => {
                      const visitDoctor = doctors.find((d: any) => d.id === visit.doctorId);
                      return (
                        <div key={visit.id} className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                              <Calendar size={11} className="text-[var(--text-muted)]" />
                              {format(new Date(visit.date), 'MMM d, yyyy · h:mm a')}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {visitDoctor ? `Dr. ${visitDoctor.firstName} ${visitDoctor.lastName}` : 'No doctor assigned'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {visit.services.map((s, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-500/10 text-brand-400">
                                {s}
                              </span>
                            ))}
                          </div>
                          {visit.notes && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1.5">{visit.notes}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Step 2 — Diagnosis & treatment */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <SectionHeading icon={Stethoscope} step={2} title="Diagnosis & treatment" hint="Pick a clinic type, then an option" done={step2Done} />

              <div className="mb-3">
                <label className="label flex items-center gap-1.5"><Stethoscope size={12} /> Diagnosis notes</label>
                <CategoryOptionPicker
                  optionsByType={DIAGNOSIS_OPTIONS}
                  onPick={text => appendText('diagnosisNotes', text)}
                />
                <textarea {...register('diagnosisNotes')} className="input w-full resize-none" rows={3}
                  placeholder="Chief complaint, examination findings, diagnosis…" />
              </div>

              <div>
                <label className="label">Treatment plan</label>
                <CategoryOptionPicker
                  optionsByType={TREATMENT_OPTIONS}
                  onPick={text => appendText('treatmentPlan', text)}
                />
                <textarea {...register('treatmentPlan')} className="input w-full resize-none" rows={3}
                  placeholder="Proposed treatment, procedures, follow-up…" />
              </div>
            </div>

            {/* Step 3 — Prescriptions */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <SectionHeading icon={Pill} step={3} title="Prescriptions" hint="Optional" done={fields.length > 0} />

              <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-3">
                {COMMON_MEDICINES.map(m => (
                  <Chip key={m.name} onClick={() => addQuickMedicine(m.name, m.dosage)}>+ {m.name}</Chip>
                ))}
              </div>

              {fields.length === 0 && (
                <div className="text-center py-6 rounded-xl mb-2.5" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-hover)' }}>
                  <Pill size={20} className="mx-auto text-[var(--text-muted)] mb-1.5 opacity-50" />
                  <p className="text-xs text-[var(--text-muted)]">No prescriptions added yet.</p>
                </div>
              )}
              <div className="space-y-2.5">
                {fields.map((field, i) => {
                  const linkedProductId = watch(`prescriptions.${i}.productId`);
                  const linkedProduct   = pharmaProducts.find(p => p.id === linkedProductId);
                  const existingRx      = record?.prescriptions?.[i];
                  // Once a line has been touched by dispensing, changing or
                  // removing its inventory link would desync the Dispense
                  // Queue / stock — lock it instead of allowing a silent
                  // relink. Editing dosage/frequency/instructions is still fine.
                  const dispensingLocked = !!existingRx && existingRx.dispensingStatus && existingRx.dispensingStatus !== 'not_dispensed';
                  return (
                  <div key={field.id} className="p-3.5 rounded-xl relative transition-colors"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                        Medicine {i + 1}
                      </span>
                      <button type="button" onClick={() => remove(i)} disabled={dispensingLocked}
                        title={dispensingLocked ? 'Already dispensed — cannot remove' : undefined}
                        className="btn-ghost w-6 h-6 p-0 justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="sm:col-span-2">
                        <input {...register(`prescriptions.${i}.medicineName`)}
                          className="input w-full text-sm" placeholder="Medicine name *" />
                        {errors.prescriptions?.[i]?.medicineName && (
                          <p className="text-[11px] text-red-400 mt-1">{errors.prescriptions[i]?.medicineName?.message}</p>
                        )}
                      </div>

                      {/* Pharmacy link (Phase 11) — optional; when set, this line
                          flows into the pharmacy Dispense Queue instead of
                          needing a manual after-the-fact API link. */}
                      <div className="sm:col-span-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-hover)' }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Pill size={11} className="text-[var(--text-muted)]" />
                          <span className="text-[10px] font-medium text-[var(--text-muted)]">Link to pharmacy inventory (optional)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                          <select
                            value={linkedProductId || ''}
                            disabled={dispensingLocked}
                            onChange={e => linkPharmacyProduct(i, e.target.value)}
                            className="input w-full text-sm disabled:opacity-60">
                            <option value="">— Not in pharmacy / free text —</option>
                            {pharmaProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}{p.strength ? ` (${p.strength})` : ''} — {p.stockQuantity} {p.unit || 'units'} in stock
                              </option>
                            ))}
                          </select>
                          {linkedProductId && (
                            <input
                              type="number" min={0.01} step="any"
                              {...register(`prescriptions.${i}.quantityPrescribed`)}
                              disabled={dispensingLocked}
                              className="input w-full sm:w-28 text-sm disabled:opacity-60"
                              placeholder={`Qty${linkedProduct?.unit ? ` (${linkedProduct.unit})` : ''} *`}
                            />
                          )}
                        </div>
                        {errors.prescriptions?.[i]?.quantityPrescribed && (
                          <p className="text-[11px] text-red-400 mt-1">{errors.prescriptions[i]?.quantityPrescribed?.message}</p>
                        )}
                        {dispensingLocked && (
                          <p className="text-[11px] text-amber-400 mt-1">Already {existingRx?.dispensingStatus?.replace('_', ' ')} — link locked.</p>
                        )}
                      </div>

                      <input {...register(`prescriptions.${i}.dosage`)}
                        className="input w-full text-sm" placeholder="Dosage (e.g. 500mg)" />
                      <div>
                        <input {...register(`prescriptions.${i}.frequency`)}
                          className="input w-full text-sm" placeholder="Frequency (e.g. Twice daily)" />
                        <div className="flex gap-1 overflow-x-auto mt-1.5">
                          {FREQUENCY_PRESETS.map(f => (
                            <Chip key={f} onClick={() => setValue(`prescriptions.${i}.frequency`, f)}>{f}</Chip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <input {...register(`prescriptions.${i}.duration`)}
                          className="input w-full text-sm" placeholder="Duration (e.g. 5 days)" />
                        <div className="flex gap-1 overflow-x-auto mt-1.5">
                          {DURATION_PRESETS.map(d => (
                            <Chip key={d} onClick={() => setValue(`prescriptions.${i}.duration`, d)}>{d}</Chip>
                          ))}
                        </div>
                      </div>
                      <input {...register(`prescriptions.${i}.instructions`)}
                        className="input w-full text-sm" placeholder="Instructions (e.g. After meals)" />
                    </div>
                  </div>
                  );
                })}
              </div>
              <button type="button"
                onClick={() => append({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' })}
                className="btn-ghost text-xs px-2.5 py-1.5 gap-1 text-brand-400 hover:bg-brand-500/10 mt-2.5">
                <Plus size={12} /> Add another medicine
              </button>
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
  // Billing-driven records can have no doctor at all — say so plainly
  // instead of showing a misleading "Dr. Unknown Doctor".
  const doctorLabel = record.doctor
    ? `Dr. ${record.doctor.firstName} ${record.doctor.lastName}`
    : 'No doctor assigned';
  const visitCount = record.visits?.length || 0;

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
        onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
          {initials(record.patient?.firstName, record.patient?.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{patientName}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {record.patient?.opdNo ? `OPD ${record.patient.opdNo} · ` : ''}{doctorLabel} · {format(new Date(record.createdAt), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {visitCount > 0 && (
            <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
              <History size={10} /> {visitCount} visit{visitCount === 1 ? '' : 's'}
            </span>
          )}
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
          {visitCount > 0 && (
            <div className={onEdit || (canDelete && onDelete) ? '' : 'pt-3'}>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History size={11} /> Visit History <span className="normal-case font-normal">(from billing)</span>
              </p>
              <div className="space-y-2">
                {[...(record.visits || [])]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(visit => (
                    <div key={visit.id} className="px-3.5 py-2.5 rounded-xl"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                        {format(new Date(visit.date), 'MMM d, yyyy · h:mm a')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.services.map((s, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-500/10 text-brand-400">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
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

// Groups records into readable time buckets so a long history is easier to scan.
function groupByRecency(records: ClinicalRecord[]) {
  const groups: { label: string; records: ClinicalRecord[] }[] = [
    { label: 'Today', records: [] },
    { label: 'Yesterday', records: [] },
    { label: 'This week', records: [] },
    { label: 'Earlier', records: [] },
  ];
  for (const r of records) {
    const d = new Date(r.createdAt);
    if (isToday(d)) groups[0].records.push(r);
    else if (isYesterday(d)) groups[1].records.push(r);
    else if (isThisWeek(d)) groups[2].records.push(r);
    else groups[3].records.push(r);
  }
  return groups.filter(g => g.records.length > 0);
}

// Compact page-number list with ellipses, e.g. 1 … 4 5 [6] 7 8 … 12
function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push('…');
    out.push(p);
  });
  return out;
}

function Pagination({ page, totalPages, total, pageSize, onChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 px-1">
      <p className="text-xs text-[var(--text-muted)]">
        Showing <span className="text-[var(--text-primary)] font-medium">{start}–{end}</span> of{' '}
        <span className="text-[var(--text-primary)] font-medium">{total}</span> records
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost text-xs px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        {pageNumbers(page, totalPages).map((p, i) => p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors
              ${p === page ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost text-xs px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ClinicalRecordsPage() {
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const { can } = usePermissions();
  const canDelete = can('records.delete');
  const { activeBranch } = useAuthStore();
  const [tab,       setTab]           = useState<'records' | 'treatment-plans'>('records');
  const [showDialog, setShowDialog] = useState(false);
  const [editing,   setEditing]     = useState<ClinicalRecord | null>(null);
  const [search,    setSearch]      = useState('');
  const [dateFrom,  setDateFrom]    = useState('');
  const [dateTo,    setDateTo]      = useState('');
  const [page,      setPage]        = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ClinicalRecord | null>(null);
  const qc = useQueryClient();

  // Any filter change invalidates which page makes sense to show — jump
  // back to page 1 rather than stranding the user on, say, page 4 of a
  // now much-smaller filtered result.
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, activeBranch?.id]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clinicalRecordsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success('Record deleted');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete record'),
  });

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['clinical-records', search, dateFrom, dateTo, activeBranch?.id, page],
    queryFn: () => clinicalRecordsApi.list({
      page,
      limit: PAGE_SIZE,
      branchId: activeBranch?.id,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then(r => r.data),
    // Keep showing the previous page's rows while the next page loads,
    // instead of flashing the loading spinner on every click.
    placeholderData: (prev) => prev,
  });

  const records: ClinicalRecord[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total: number = Array.isArray(data) ? records.length : (data as any)?.total ?? records.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = records;
  const grouped = groupByRecency(filtered);

  const stats = [
    { label: 'Total Records',   value: total, icon: ClipboardList },
    { label: 'Prescriptions (page)',   value: records.reduce((a, r) => a + (r.prescriptions?.length || 0), 0), icon: Pill },
    { label: 'Unique Patients (page)', value: new Set(records.map(r => r.patientId)).size, icon: Users },
  ];

  const openNew = () => { setEditing(null); setShowDialog(true); };

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Clinical Records"
        subtitle="Diagnosis, treatment & prescription history"
        action={!branchLocked && tab === 'records' ? { label: 'New record', onClick: openNew } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>

      {/* Records / Treatment Plans tabs — treatment plans are structured
          propose/accept/decline proposals, distinct from the free-text
          treatmentPlan field on each record above (see TreatmentPlansPanel). */}
      <div className="px-3 sm:px-4 lg:px-6 pt-3 shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <button onClick={() => setTab('records')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: tab === 'records' ? 'var(--bg-surface)' : 'transparent',
              color: tab === 'records' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === 'records' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>
            Records
          </button>
          <button onClick={() => setTab('treatment-plans')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: tab === 'treatment-plans' ? 'var(--bg-surface)' : 'transparent',
              color: tab === 'treatment-plans' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === 'treatment-plans' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>
            Treatment Plans
          </button>
        </div>
      </div>

      {tab === 'treatment-plans' ? (
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <TreatmentPlansPanel />
        </div>
      ) : (
      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {stats.map(card => (
            <div key={card.label} className="rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 transition-colors"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/10 flex items-center justify-center shrink-0">
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
        <div className="rounded-2xl p-3 sm:p-3.5 mb-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2"
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
            <Calendar size={13} className="text-[var(--text-muted)] hidden sm:block" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input text-sm flex-1 sm:flex-none"
              style={{ width: 'auto' }}
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input text-sm flex-1 sm:flex-none"
              style={{ width: 'auto' }}
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="btn-ghost text-xs px-2 py-1.5">Clear</button>
            )}
          </div>
        </div>

        {isLoading && !isPlaceholderData ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-hover)' }}>
            <FileText size={36} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-muted)] mb-1">
              {search || dateFrom || dateTo ? 'No clinical records found.' : 'No clinical records yet.'}
            </p>
            <p className="text-xs text-[var(--text-muted)] opacity-70 mb-4">
              {search || dateFrom || dateTo ? 'Try adjusting your search or date range.' : 'Log a diagnosis, treatment plan or prescription for a patient to get started.'}
            </p>
            {!branchLocked && !search && !dateFrom && !dateTo && (
              <button onClick={openNew} className="btn-primary text-xs px-4 py-2 mx-auto">
                <Sparkles size={13} /> Add first record
              </button>
            )}
          </div>
        ) : (
          <div className={`space-y-6 transition-opacity ${isFetching && isPlaceholderData ? 'opacity-50' : ''}`}>
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{group.label}</h3>
                  <span className="text-[10px] text-[var(--text-muted)] opacity-70">{group.records.length}</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
                <div className="space-y-3">
                  {group.records.map(record => (
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
              </div>
            ))}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
            />
          </div>
        )}
      </div>
      )}

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