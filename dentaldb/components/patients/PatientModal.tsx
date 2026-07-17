'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientsApi } from '@/lib/api';
import { nepalLocalInputToUTCISOString } from '@/lib/timezone';
import { useAuthStore } from '@/store/auth.store';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { RegistrationDateField, toDatetimeLocal } from '@/components/ui/RegistrationDateFIeld';

const schema = z.object({
  opdNo:                 z.string().optional(),
  firstName:             z.string().min(1, 'Required'),
  lastName:              z.string().min(1, 'Required'),
  email:                 z.string().email('Invalid email').optional().or(z.literal('')),
  phone:                 z.string().optional().refine(
    v => !v || /^\d{10}$/.test(v),
    { message: 'Phone number must be exactly 10 digits' },
  ),
  ageYears:              z.coerce.number().int().min(0).max(150).optional().or(z.literal('')),
  gender:                z.enum(['male', 'female', 'other']).optional(),
  address:               z.string().optional(),
  emergencyContactName:  z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies:             z.string().optional(),
  medicalConditions:     z.string().optional(),
  insuranceProvider:     z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  notes:                 z.string().optional(),
  // "Created At" — editable datetime; stored as ISO string
  createdAt:             z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/** Strip a stored +977 (or 977/leading-0) prefix so the form shows just the 10-digit local number. */
function stripNepalPhonePrefix(val: string | undefined | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');
  if (digits.startsWith('977') && digits.length > 10) return digits.slice(-10);
  return digits.slice(-10);
}

export default function PatientModal({
  onClose, onSuccess, patient,
}: { onClose: () => void; onSuccess: () => void; patient?: any }) {
  const { activeBranch } = useAuthStore();
  useBodyScrollLock(true);
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: patient ? {
      ...patient,
      ageYears:          patient.ageYears ?? patient.age ?? '',
      allergies:         patient.allergies?.join(', '),
      medicalConditions: patient.medicalConditions?.join(', '),
      phone:                 stripNepalPhonePrefix(patient.phone),
      emergencyContactPhone: stripNepalPhonePrefix(patient.emergencyContactPhone),
      // For existing patients use their real createdAt; for new patients default to now
      createdAt: toDatetimeLocal(patient.createdAt),
    } : {
      createdAt: toDatetimeLocal(new Date()),
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        branchId: patient ? patient.branchId : (activeBranch?.id || null),
        ageYears: data.ageYears !== '' && data.ageYears !== undefined ? Number(data.ageYears) : null,
        email: data.email || null,
        phone:                 data.phone ? `+977${data.phone}` : null,
        emergencyContactPhone: data.emergencyContactPhone
          ? (/^\d{10}$/.test(data.emergencyContactPhone) ? `+977${data.emergencyContactPhone}` : data.emergencyContactPhone)
          : null,
        allergies:         data.allergies ? data.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        medicalConditions: data.medicalConditions ? data.medicalConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        // Send ISO string so backend can override createdAt
        createdAt: data.createdAt ? nepalLocalInputToUTCISOString(data.createdAt) : undefined,
      };
      return patient ? patientsApi.update(patient.id, payload) : patientsApi.create(payload);
    },
    onSuccess,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save patient'),
  });

  return (
    <motion.div className="fixed inset-0 z-[200] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{patient ? 'Edit Patient' : 'Add New Patient'}</h2>
            {activeBranch && !patient && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Adding to: {activeBranch.name}</p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 sm:w-10 sm:h-10 p-0 justify-center"><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Personal Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
            {/* Created At — always visible, defaults to now for new patients */}
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5">
                <Calendar size={12} className="text-[var(--text-muted)]" />
                Registration Date
                <span className="text-[var(--text-muted)] normal-case font-normal">(you can backdate for old records)</span>
              </label>
              <Controller
                name="createdAt"
                control={control}
                render={({ field }) => (
                  <RegistrationDateField value={field.value || ''} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">OPD No.</label>
              <input {...register('opdNo')} className="input w-full" placeholder="e.g. OPD-00123" />
            </div>
            <div>
              <label className="label">First name *</label>
              <input {...register('firstName')} className="input w-full" placeholder="John" />
              {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last name *</label>
              <input {...register('lastName')} className="input w-full" placeholder="Doe" />
              {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="label">Email <span className="text-[var(--text-muted)] normal-case font-normal">(optional)</span></label>
              <input {...register('email')} type="email" className="input w-full" placeholder="patient@email.com" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>+977</span>
                <input
                  {...register('phone')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="input w-full"
                  placeholder="98XXXXXXXX"
                  onChange={e => setValue('phone', e.target.value.replace(/\D/g, '').slice(0, 10), { shouldValidate: true })}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Age (years)</label>
              <input {...register('ageYears')} type="number" min="0" max="150" className="input w-full" placeholder="e.g. 35" />
              {errors.ageYears && <p className="mt-1 text-xs text-red-400">{errors.ageYears.message}</p>}
            </div>
            <div>
              <label className="label">Gender</label>
              <select {...register('gender')} className="input w-full">
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input {...register('address')} className="input w-full" placeholder="Full address" />
            </div>
          </div>

          <div className="section-divider mb-4" />
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Medical Information</p>
          <div className="grid grid-cols-1 gap-3 mb-5">
            <div>
              <label className="label">Allergies <span className="text-[var(--text-muted)] normal-case font-normal">(comma separated)</span></label>
              <input {...register('allergies')} className="input w-full" placeholder="Penicillin, Latex, Aspirin" />
            </div>
            <div>
              <label className="label">Medical Conditions <span className="text-[var(--text-muted)] normal-case font-normal">(comma separated)</span></label>
              <input {...register('medicalConditions')} className="input w-full" placeholder="Diabetes, Hypertension" />
            </div>
          </div>

          <div className="section-divider mb-4" />
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Emergency Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
            <div>
              <label className="label">Name</label>
              <input {...register('emergencyContactName')} className="input w-full" placeholder="Contact name" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('emergencyContactPhone')} className="input w-full" placeholder="+977 98XXXXXXXX" />
            </div>
          </div>

          <div className="section-divider mb-4" />
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Insurance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
            <div>
              <label className="label">Insurance Provider</label>
              <input {...register('insuranceProvider')} className="input w-full" placeholder="Provider name" />
            </div>
            <div>
              <label className="label">Policy Number</label>
              <input {...register('insurancePolicyNumber')} className="input w-full" placeholder="POL-XXXXXXX" />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} rows={3} className="input w-full resize-none" placeholder="Additional notes…" />
          </div>

          <div className="flex gap-3 mt-5">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : patient ? 'Save Changes' : 'Add Patient'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}