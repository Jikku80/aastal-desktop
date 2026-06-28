'use client';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Clock, Stethoscope, Building2, Loader2,
  User, CalendarClock, CreditCard, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { appointmentsApi, branchesApi, usersApi, servicesApi } from '@/lib/api';
import { nepalLocalInputToUTCISOString, utcToNepalLocalInputValue } from '@/lib/timezone';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useAuthStore } from '@/store/auth.store';
import PatientCombobox from '@/components/ui/PatientCombobox';
import type { User as UserType } from '@/types';

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'esewa',         label: 'eSewa' },
  { value: 'khalti',        label: 'Khalti' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'insurance',     label: 'Insurance' },
];

const schema = z.object({
  patientId:       z.string().min(1, 'Select a patient'),
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
  const vatPercent = (clinic as any)?.settings?.vatPercent ?? 0;
  useBodyScrollLock(true);

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

  const { data: branchDoctorsData } = useQuery({
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

  const feeNum    = Number(watchFee) || 0;
  const taxAmount = +(feeNum * vatPercent / 100).toFixed(2);
  const totalDue  = +(feeNum + taxAmount).toFixed(2);
  const hasPayment = showPayment && feeNum > 0 && !!watchPayMethod;

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: any = { ...data, branchId: data.branchId || undefined };
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
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to book'),
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
              <FieldLabel icon={User}>Patient *</FieldLabel>
              <Controller name="patientId" control={control}
                render={({ field }) => <PatientCombobox value={field.value} onChange={field.onChange} />} />
              {errors.patientId && <p className="mt-1 text-xs text-red-400">{errors.patientId.message}</p>}
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
              {doctors.length === 0 && selectedBranchId && (
                <p className="mt-1 text-xs text-amber-400">No doctors assigned to this branch yet.</p>
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
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
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

                      {/* Fee + Payment method — stacked on mobile */}
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

                      {/* Invoice preview */}
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
            </div>

            {/* Submit actions — inside scroll but at the bottom of the form */}
            <div className="flex gap-3 pt-1 pb-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center h-11 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center h-11 text-sm">
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