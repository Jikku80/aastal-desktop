'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Clock, Stethoscope, Building2, Loader2,
  User, CalendarClock, CreditCard, ChevronDown, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { appointmentsApi, branchesApi, usersApi, servicesApi, patientsApi } from '@/lib/api';
import { nepalLocalInputToUTCISOString, utcToNepalLocalInputValue } from '@/lib/timezone';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useAuthStore } from '@/store/auth.store';
import PatientCombobox from '@/components/ui/PatientCombobox';
import { RegistrationDateField, toDatetimeLocal } from '@/components/ui/RegistrationDateFIeld';
import type { User as UserType } from '@/types';

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'esewa',         label: 'eSewa' },
  { value: 'khalti',        label: 'Khalti' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'insurance',     label: 'Insurance' },
];

const schema = z.object({
  // Optional here — enforced in the submit handler, since a patient can instead
  // come from the inline "Add new patient" quick-form below.
  patientId:       z.string().optional(),
  branchId:        z.string().optional(),
  dentistId:       z.string().min(1, 'Select a dentist'),
  serviceId:       z.string().optional(),
  type:            z.string().min(1, 'Select appointment type'),
  scheduledAt:     z.string().min(1, 'Select date and time'),
  durationMinutes: z.coerce.number().min(15).max(180),
  chiefComplaint:  z.string().optional(),
  notes:           z.string().optional(),
  isPaid:          z.boolean().optional(),
  fee:             z.coerce.number().min(0).optional(),
  paymentMethod:   z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function FieldLabel({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 mb-1.5 w-full">
      {Icon && <Icon size={12} className="shrink-0 text-[var(--text-muted)]" />}
      <span className="text-xs font-medium text-[var(--text-secondary)] leading-none">
        {children}
      </span>
    </label>
  );
}

export default function AppointmentModal({
  onClose, onSuccess, initialDate,
}: { onClose: () => void; onSuccess: () => void; initialDate?: Date }) {
  const [aiSlots, setAiSlots]           = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showPayment, setShowPayment]   = useState(false);
  const { activeBranch, branches, clinic } = useAuthStore();

  // Inline "Add new patient" quick-form — lets staff create a patient right
  // from the appointment modal instead of leaving to the Patients page first.
  // If this form has a first + last name filled in when the appointment is
  // saved, the patient is auto-created and used; otherwise the appointment
  // is created against whatever was picked in the search combobox above.
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: '', lastName: '', phone: '', opdNo: '', gender: '',
    // Registration date — defaults to now, editable/backdatable just like
    // the "Registration Date" field on the full Patient form.
    registrationDate: toDatetimeLocal(new Date()),
  });
  const hasNewPatientData = !!(newPatient.firstName.trim() && newPatient.lastName.trim());
  const vatPercent = (clinic as any)?.settings?.vatPercent ?? 0;
  useBodyScrollLock(true);

  // `mutation.isPending` is React state — it doesn't flip to `true` until the
  // next render, so two clicks/taps within the same event-loop tick (a real
  // double-click, or a double-tap fired by some touchscreens) can both call
  // mutation.mutate() before the submit button actually disables. This ref
  // updates synchronously, closing that gap so only the first submit goes out.
  const submittingRef = useRef(false);

  const defaultScheduledAt = initialDate
    ? format(initialDate, "yyyy-MM-dd'T'HH:mm")
    : '';

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      durationMinutes: 30,
      branchId: activeBranch?.id || '',
      isPaid: false,
      scheduledAt: defaultScheduledAt,
    },
  });

  const selectedBranchId = watch('branchId');
  const watchDentist     = watch('dentistId');
  const watchType        = watch('type');
  const watchFee         = watch('fee');
  const watchPayMethod   = watch('paymentMethod');

  const { data: branchDoctorsData, error: branchDoctorsError } = useQuery({
    queryKey: ['branch-doctors', selectedBranchId],
    queryFn: () =>
      selectedBranchId
        ? branchesApi.getDoctors(selectedBranchId).then(r => r.data)
        : usersApi.listStaff({ roles: 'dentist,doctor' }).then(r => r.data?.data || []),
    enabled: true,
  });

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services-active'],
    queryFn:  () => servicesApi.list({ activeOnly: 'true', limit: 100 }).then(r => r.data),
  });

  const services: any[] = servicesData?.data || [];

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matched = services.find(s => s.name === e.target.value);
    if (matched?.duration) setValue('durationMinutes', matched.duration);
    if (matched?.price && !watchFee) setValue('fee', matched.price);
    // Store the serviceId UUID so the invoice can link commission correctly
    setValue('serviceId', matched?.id || '');
  };

  const doctors: UserType[] = Array.isArray(branchDoctorsData)
    ? branchDoctorsData
    : (branchDoctorsData?.data || []);

  useEffect(() => { setValue('dentistId', ''); }, [selectedBranchId, setValue]);
  // Patient search is scoped to the selected branch — clear any previously
  // picked patient when the branch changes so we never submit a patient
  // that doesn't belong to the newly selected branch.
  useEffect(() => { setValue('patientId', ''); }, [selectedBranchId, setValue]);

  const feeNum    = Number(watchFee) || 0;
  const taxAmount = +(feeNum * vatPercent / 100).toFixed(2);
  const totalDue  = +(feeNum + taxAmount).toFixed(2);
  const hasPayment = showPayment && feeNum > 0 && !!watchPayMethod;

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let patientId = data.patientId;

      // If the inline quick-form has data, create that patient first and use
      // its id — the appointment is only created once the patient exists.
      if (hasNewPatientData) {
        const patRes = await patientsApi.create({
          firstName: newPatient.firstName.trim(),
          lastName:  newPatient.lastName.trim(),
          phone:     newPatient.phone ? `+977${newPatient.phone}` : undefined,
          opdNo:     newPatient.opdNo.trim() || undefined,
          gender:    newPatient.gender || undefined,
          branchId:  data.branchId || activeBranch?.id || undefined,
          // Same "Registration Date" the full Patient form sends — lets front-desk
          // staff backdate a patient created on the fly from this appointment.
          createdAt: newPatient.registrationDate
            ? nepalLocalInputToUTCISOString(newPatient.registrationDate)
            : undefined,
        });
        patientId = patRes.data?.id;
      }

      if (!patientId) {
        throw new Error('Select a patient or fill in the "Add new patient" form');
      }

      const payload: any = { ...data, patientId, branchId: data.branchId || undefined };
      if (data.scheduledAt) {
        payload.scheduledAt = nepalLocalInputToUTCISOString(data.scheduledAt);
      }
      if (hasPayment) {
        payload.autoGenerateInvoice = true;
        payload.fee = feeNum;
        payload.isPaid = true;
      } else {
        delete payload.autoGenerateInvoice;
      }
      return appointmentsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(hasPayment ? 'Appointment booked & invoice created!' : 'Appointment booked!');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to book'),
  });

  const fetchAiSlots = async () => {
    if (!watchDentist || !watchType) return toast.error('Select dentist and type first');
    setLoadingSlots(true);
    try {
      const r = await appointmentsApi.suggestSlots({
        dentistId: watchDentist,
        treatmentType: watchType,
        durationMinutes: watch('durationMinutes'),
      });
      setAiSlots(r.data?.suggestions || []);
    } catch { toast.error('AI suggestions unavailable'); }
    finally { setLoadingSlots(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] modal-clearance flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/*
        The modal is a bottom sheet on mobile (slides up from bottom).
        On sm+ it centers in the viewport like a normal dialog.
        
        Key mobile fixes:
        - No fixed height — grows with content up to 94dvh
        - Header is sticky so it stays visible while form scrolls
        - Action buttons are inside the scroll container but still visually
          anchored at the bottom via padding
        - overscroll-contain prevents background page from scrolling
      */}
      <motion.div
        className="relative w-full sm:max-w-2xl flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          // Limit height — on mobile this is crucial so content doesn't clip
          maxHeight: '94dvh',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}>

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Sticky header */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Appointment</h2>
            <p className="text-xs text-[var(--text-muted)]">Book a new appointment</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-10 h-10 p-0 justify-center ml-2 rounded-xl">
            <X size={17} />
          </button>
        </div>

        {/* Scrollable form — flex-1 + overflow-y-auto is the key */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form
            onSubmit={handleSubmit(d => mutation.mutate(d))}
            className="p-4 sm:p-5 space-y-4">

            {/* Patient */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel icon={User}>Patient *</FieldLabel>
                <button
                  type="button"
                  onClick={() => setShowAddPatient(s => !s)}
                  className="flex items-center gap-1 text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors">
                  <UserPlus size={12} />
                  {showAddPatient ? 'Search' : 'Add'}
                </button>
              </div>

              {!showAddPatient && (
                <>
                  <Controller name="patientId" control={control}
                    render={({ field }) => (
                      <PatientCombobox
                        value={field.value}
                        onChange={field.onChange}
                        branchId={selectedBranchId || activeBranch?.id || undefined}
                        placeholder={
                          (selectedBranchId || activeBranch?.id)
                            ? 'Search patients in this branch…'
                            : 'Select a branch first…'
                        }
                      />
                    )} />
                  {errors.patientId && <p className="mt-1 text-xs text-red-400">{errors.patientId.message}</p>}
                </>
              )}

              {showAddPatient && (
                <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <FieldLabel>First name *</FieldLabel>
                      <input
                        value={newPatient.firstName}
                        onChange={e => setNewPatient(p => ({ ...p, firstName: e.target.value }))}
                        className="input w-full text-sm h-9" placeholder="John" />
                    </div>
                    <div>
                      <FieldLabel>Last name *</FieldLabel>
                      <input
                        value={newPatient.lastName}
                        onChange={e => setNewPatient(p => ({ ...p, lastName: e.target.value }))}
                        className="input w-full text-sm h-9" placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel icon={CalendarClock}>
                      Registration Date
                      <span className="ml-1 text-[var(--text-muted)] font-normal normal-case">(defaults to today, can backdate)</span>
                    </FieldLabel>
                    <RegistrationDateField
                      value={newPatient.registrationDate}
                      onChange={v => setNewPatient(p => ({ ...p, registrationDate: v }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <FieldLabel>Phone</FieldLabel>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)]"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>+977</span>
                        <input
                          value={newPatient.phone}
                          onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                          inputMode="numeric" maxLength={10}
                          className="input w-full text-sm h-9" placeholder="98XXXXXXXX" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>OPD No.</FieldLabel>
                      <input
                        value={newPatient.opdNo}
                        onChange={e => setNewPatient(p => ({ ...p, opdNo: e.target.value }))}
                        className="input w-full text-sm h-9" placeholder="e.g. OPD-00123" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Gender</FieldLabel>
                    <select
                      value={newPatient.gender}
                      onChange={e => setNewPatient(p => ({ ...p, gender: e.target.value }))}
                      className="input w-full text-sm h-9">
                      <option value="">Select…</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    This patient will be created automatically when the appointment is saved.
                  </p>
                </div>
              )}
            </div>

            {/* Branch */}
            {branches.length > 1 && (
              <div>
                <FieldLabel icon={Building2}>Branch</FieldLabel>
                <select {...register('branchId')} className="input w-full text-sm h-10">
                  <option value="">— No specific branch —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {/* Doctor */}
            <div>
              <FieldLabel icon={Stethoscope}>
                Doctor *
                {selectedBranchId && branches.length > 1 && (
                  <span className="ml-1.5 text-[10px] text-brand-400 font-normal">(branch filtered)</span>
                )}
              </FieldLabel>
              <select {...register('dentistId')} className="input w-full text-sm h-10">
                <option value="">Select doctor</option>
                {doctors.map((d: UserType) => (
                  <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                ))}
              </select>
              {doctors.length === 0 && selectedBranchId && !branchDoctorsError && (
                <p className="mt-1 text-xs text-amber-400">No doctors assigned to this branch yet.</p>
              )}
              {branchDoctorsError && (
                <p className="mt-1 text-xs text-red-400">
                  {(branchDoctorsError as any)?.response?.status === 403
                    ? "You don't have permission to view this branch's doctors. Ask an admin to grant it."
                    : 'Failed to load doctors. Please try again.'}
                </p>
              )}
              {errors.dentistId && <p className="mt-1 text-xs text-red-400">{errors.dentistId.message}</p>}
            </div>

            {/* Type + Duration — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Service *</FieldLabel>
                {!servicesLoading && services.length === 0 ? (
                  <div className="input w-full text-sm h-10 flex items-center" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
                    <span className="text-amber-400 text-xs">No services found — please create services from the Services page first.</span>
                  </div>
                ) : (
                  <select
                    {...register('type')}
                    className="input w-full text-sm h-10"
                    onChange={e => { register('type').onChange(e); handleTypeChange(e); }}>
                    <option value="">{servicesLoading ? 'Loading…' : 'Select service'}</option>
                    {services.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name}{s.price ? ` — NPR ${Number(s.price).toLocaleString()}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type.message}</p>}
              </div>

              <div>
                <FieldLabel icon={Clock}>Duration (min)</FieldLabel>
                <input
                  type="number"
                  {...register('durationMinutes')}
                  className="input w-full text-sm h-10"
                  min={15} max={180} step={15}
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <FieldLabel icon={CalendarClock}>Date &amp; Time *</FieldLabel>
              <input
                type="datetime-local"
                {...register('scheduledAt')}
                className="input w-full text-sm h-10"
              />
              {errors.scheduledAt && <p className="mt-1 text-xs text-red-400">{errors.scheduledAt.message}</p>}
            </div>

            {/* AI Slots */}
            <div>
              <button
                type="button"
                onClick={fetchAiSlots}
                disabled={loadingSlots}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors h-9">
                {loadingSlots
                  ? <Loader2 size={12} className="animate-spin shrink-0" />
                  : <Sparkles size={12} className="shrink-0" />}
                AI suggest available slots
              </button>
              {aiSlots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {aiSlots.map((slot, i) => (
                    <button
                      key={i} type="button"
                      onClick={() => setValue('scheduledAt', utcToNepalLocalInputValue(slot.scheduledAt))}
                      className="text-xs px-2.5 py-2 rounded-lg border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 transition-colors">
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chief Complaint */}
            <div>
              <FieldLabel>Chief Complaint</FieldLabel>
              <textarea
                {...register('chiefComplaint')}
                rows={2}
                className="input w-full resize-none text-sm"
                placeholder="Patient's main concern…"
              />
            </div>

            {/* Payment / Fee */}
            {/* <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setShowPayment(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/5"
                style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className={showPayment ? 'text-emerald-400' : 'text-[var(--text-muted)]'} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Payment / Fee</span>
                  {hasPayment && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400">
                      Invoice ready
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-[var(--text-muted)] transition-transform duration-200 ${showPayment ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {showPayment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden">
                    <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Fee Amount (NPR)</FieldLabel>
                          <input
                            type="number"
                            {...register('fee')}
                            className="input w-full text-sm h-10"
                            placeholder="e.g. 2000"
                            min={0}
                            step={0.01}
                            inputMode="decimal"
                          />
                        </div>
                        <div>
                          <FieldLabel>Payment Type</FieldLabel>
                          <select {...register('paymentMethod')} className="input w-full text-sm h-10">
                            <option value="">Select method</option>
                            {PAYMENT_METHODS.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {feeNum > 0 && (
                        <div className="rounded-lg p-3 space-y-1.5"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Invoice Preview
                          </p>
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">Subtotal</span>
                            <span className="text-[var(--text-primary)]">NPR {feeNum.toLocaleString()}</span>
                          </div>
                          {vatPercent > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-[var(--text-secondary)]">VAT ({vatPercent}%)</span>
                              <span className="text-[var(--text-primary)]">NPR {taxAmount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-semibold pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                            <span className="text-[var(--text-primary)]">Total</span>
                            <span className="text-emerald-400">NPR {totalDue.toLocaleString()}</span>
                          </div>
                          {!watchPayMethod && (
                            <p className="text-[10px] text-amber-400 pt-1">
                              Select a payment type to enable auto-invoice.
                            </p>
                          )}
                          {watchPayMethod && (
                            <p className="text-[10px] text-emerald-400 pt-1">
                              ✓ Invoice will be auto-generated on submit.
                            </p>
                          )}
                        </div>
                      )}

                      {!feeNum && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Enter an amount and payment method to auto-generate a paid invoice on booking.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div> */}

            {/* Submit actions — inside scroll but at the bottom of the form */}
            <div className="flex gap-3 pt-1 pb-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center h-11 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || (!watch('patientId') && !hasNewPatientData)}
                className="btn-primary flex-1 justify-center h-11 text-sm">
                {mutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : hasPayment ? 'Book & Invoice' : 'Book Appointment'}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}