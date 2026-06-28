'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Camera, Save, Loader2,
  Calendar, Clock, ChevronLeft, ChevronRight,
  TrendingUp, CalendarOff, Users, CheckCircle2, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatNepalClockTime } from '@/lib/timezone';
import toast from 'react-hot-toast';
import { profileApi, appointmentsApi, usersApi, commissionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate, formatMonthYear, currentMonthRange } from '@/lib/calendar';
import Header from '@/components/layout/Header';
import PatientDetailPanel from '@/components/patients/PatientDetailPanel';
import AppointmentDetailPanel from '@/components/appointments/AppointmentDetailPanel';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  phone:     z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const ROLE_COLORS: Record<string, string> = {
  owner:        'text-amber-400 bg-amber-400/10 border-amber-400/20',
  dentist:      'text-brand-400 bg-brand-400/10 border-brand-400/20',
  receptionist: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  accountant:   'text-brand-400 bg-brand-400/10 border-brand-400/20',
  staff:        'text-gray-400 bg-gray-400/10 border-gray-400/20',
  super_admin:  'text-red-400 bg-red-400/10 border-red-400/20',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'text-blue-400 bg-blue-400/10',
  confirmed:   'text-brand-400 bg-brand-400/10',
  completed:   'text-emerald-400 bg-emerald-400/10',
  cancelled:   'text-red-400 bg-red-400/10',
  in_progress: 'text-amber-400 bg-amber-400/10',
  no_show:     'text-gray-400 bg-gray-400/10',
  rescheduled: 'text-brand-400 bg-brand-400/10',
};

const PAGE_SIZE = 10;

// ── Reusable Pagination Bar ───────────────────────────────────────────────────
function PaginationBar({
  page, total, pageSize, onPrev, onNext,
}: {
  page: number; total: number; pageSize: number;
  onPrev: () => void; onNext: () => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 pt-3 mt-1"
      style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-xs text-[var(--text-muted)]">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1}
          onClick={onPrev}
          className="btn-secondary text-xs py-1.5 px-3 gap-1 disabled:opacity-40">
          <ChevronLeft size={12} /> Prev
        </button>
        <span className="text-xs text-[var(--text-muted)] font-medium min-w-[60px] text-center">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={onNext}
          className="btn-secondary text-xs py-1.5 px-3 gap-1 disabled:opacity-40">
          Next <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Resolve avatar URL: prepend base if it's a relative path ─────────────────
function resolveAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  // relative path like /uploads/avatars/xxx.jpg
  return `${BASE_URL}${avatar}`;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc                   = useQueryClient();
  const calendarType         = useCalendarType();
  const fileInputRef         = useRef<HTMLInputElement>(null);
  const sigInputRef          = useRef<HTMLInputElement>(null);
  const [uploading,       setUploading]       = useState(false);
  const [uploadingSig,    setUploadingSig]    = useState(false);
  const [signatureUrl,    setSignatureUrl]    = useState<string>('');
  const [activeTab, setActiveTab] = useState<'info' | 'performance' | 'patients' | 'appointments'>('info');
  const [patientPage,     setPatientPage]     = useState(1);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedApt,     setSelectedApt]     = useState<any>(null);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName:  user?.lastName  || '',
      phone:     user?.phone     || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => profileApi.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data);
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['profile-me'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB for profile photo'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await profileApi.uploadAvatar(fd);
      // res.data.avatarUrl is a relative path like /uploads/avatars/xxx.jpg
      updateUser({ avatar: res.data.avatarUrl });
      toast.success('Profile photo updated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return; }
    setUploadingSig(true);
    try {
      const res = await profileApi.uploadSignature(file);
      const url = res.data.signatureUrl;
      setSignatureUrl(url);
      updateUser({ signatureUrl: url } as any);
      toast.success('Signature saved — will appear on prescriptions');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingSig(false);
    }
  };

  const isDentist   = user?.role === 'dentist';
  const avatarUrl   = resolveAvatarUrl(user?.avatar);
  const resolvedSig = (() => {
    const s = signatureUrl || (user as any)?.signatureUrl || '';
    if (!s) return null;
    return s.startsWith('http') ? s : `${BASE_URL}${s}`;
  })();
  const initials    = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const roleColor   = ROLE_COLORS[user?.role || 'staff'] || ROLE_COLORS.staff;

  // ── Performance query ─────────────────────────────────────────────────────
  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['dentist-performance', user?.id],
    queryFn:  () => usersApi.getDentistPerformance(user!.id).then(r => r.data),
    enabled:  isDentist && activeTab === 'performance',
  });

  const { data: commissionData } = useQuery({
    queryKey: ['doctor-commission-summary', user?.id, calendarType],
    queryFn: () => {
      const { start, end } = currentMonthRange(calendarType);
      return commissionsApi.getSummary({
        doctorId:  user!.id,
        startDate: format(start, 'yyyy-MM-dd'),
        endDate:   format(end,   'yyyy-MM-dd'),
      }).then(r => r.data);
    },
    enabled: isDentist && activeTab === 'performance',
  });

  // ── Paginated patients query ──────────────────────────────────────────────
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['profile-doctor-patients', user?.id, patientPage],
    queryFn:  () => appointmentsApi.list({
      dentistId: user?.id,
      limit: PAGE_SIZE * 5,          // fetch more, deduplicate, then paginate in JS
      page:  1,
      order: 'DESC',
    }).then(r => {
      const seen = new Set<string>();
      const patients: any[] = [];
      for (const apt of (r.data?.data || [])) {
        if (apt.patient && !seen.has(apt.patientId)) {
          seen.add(apt.patientId);
          patients.push(apt.patient);
        }
      }
      return patients;
    }),
    enabled: isDentist && activeTab === 'patients',
  });

  const allPatients   = patientsData ?? [];
  const totalPatients = allPatients.length;
  const pagedPatients = allPatients.slice((patientPage - 1) * PAGE_SIZE, patientPage * PAGE_SIZE);

  // ── Paginated appointments query ──────────────────────────────────────────
  const { data: aptsData, isLoading: aptsLoading } = useQuery({
    queryKey: ['profile-doctor-appointments', user?.id, appointmentPage],
    queryFn:  () => appointmentsApi.list({
      dentistId: user?.id,
      limit:     PAGE_SIZE,
      page:      appointmentPage,
      order:     'DESC',
    }).then(r => r.data),
    enabled: isDentist && activeTab === 'appointments',
  });

  const appointments  = aptsData?.data || [];
  const totalApts     = aptsData?.total || 0;

  const tabs = isDentist
    ? [
        { id: 'info',         label: 'Info'         },
        { id: 'performance',  label: 'Performance'     },
        { id: 'patients',     label: 'Patients'     },
        { id: 'appointments', label: 'Appointments' },
      ]
    : [{ id: 'info', label: 'My Info' }];

  function computeAge(person: { dateOfBirth?: string | Date | null }): number | null {
    if (!person.dateOfBirth) return null;

    const dob = new Date(person.dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    return age;
  }

  const myCommission = commissionData?.doctors?.find((d: any) => d.doctorId === user?.id);
  const actualCommission = myCommission?.totalCommission ?? 0;
  const serviceRevenue   = myCommission?.totalServiceRevenue ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Profile" />

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">

        {/* ── Hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="card p-5 sm:p-6 mb-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">

          {/* Avatar with upload button */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border)' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  className="w-full h-full object-cover"
                  onError={e => {
                    // If image fails to load, clear src to show initials fallback
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl font-bold text-brand-400">{initials}</span>
              )}
            </div>

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change profile photo"
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
              style={{ background: '#0e9de8', border: '2px solid var(--bg-surface)' }}>
              {uploading
                ? <Loader2 size={13} className="animate-spin text-white" />
                : <Camera size={13} className="text-white" />
              }
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleAvatarUpload(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Name + role + contact */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {user?.firstName} {user?.lastName}
            </h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${roleColor}`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mt-3 text-sm text-[var(--text-muted)]">
              {user?.email && (
                <span className="flex items-center gap-1.5"><Mail size={13} />{user.email}</span>
              )}
              {user?.phone && (
                <span className="flex items-center gap-1.5"><Phone size={13} />{user.phone}</span>
              )}
            </div>
            {user?.lastLoginAt && (
              <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-center sm:justify-start gap-1">
                <Clock size={11} /> Last login {formatDate(new Date(user.lastLoginAt), calendarType)}
                {' · '}{format(new Date(user.lastLoginAt), 'h:mm a')}
              </p>
            )}

            {/* Signature upload — shown for doctors/owners */}
            {(user?.role === 'dentist' || user?.role === 'owner') && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Prescription Signature
                </p>
                <div className="flex items-center gap-3">
                  {/* Preview box */}
                  <div
                    className="w-28 h-14 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: 'var(--bg-base)', border: '1px dashed var(--border)' }}
                  >
                    {resolvedSig
                      ? <img src={resolvedSig} alt="Signature" className="w-full h-full object-contain p-1" />
                      : <span className="text-[10px] text-[var(--text-muted)] text-center px-1">No signature</span>
                    }
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => sigInputRef.current?.click()}
                      disabled={uploadingSig}
                      className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5"
                    >
                      {uploadingSig ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      {uploadingSig ? 'Uploading…' : resolvedSig ? 'Replace' : 'Upload signature'}
                    </button>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">PNG with transparent background recommended</p>
                  </div>
                </div>
                <input
                  ref={sigInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.svg"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleSignatureUpload(f);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        {tabs.length > 1 && (
          <div className="overflow-x-auto mb-5 -mx-1 px-1">
            <div className="flex gap-0.5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeTab === t.id
                      ? 'text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                  style={activeTab === t.id ? { background: 'var(--bg-surface)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── My Info Tab ── */}
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5 sm:p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-5">Personal Details</h3>
            <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input {...register('firstName')} className="input w-full" />
                  {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input {...register('lastName')} className="input w-full" />
                  {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <div className="input flex items-center gap-2 opacity-60 cursor-not-allowed"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Mail size={13} className="text-[var(--text-muted)] shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)]">{user?.email}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">Email cannot be changed. Contact your admin.</p>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input {...register('phone')} type="tel" className="input w-full" placeholder="+977 98XXXXXXXX" />
              </div>
              <div>
                <label className="label">Role</label>
                <div className="input flex items-center gap-2 opacity-60 cursor-not-allowed"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Shield size={13} className="text-[var(--text-muted)] shrink-0" />
                  <span className="text-sm capitalize text-[var(--text-secondary)]">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending || !isDirty}
                  className="btn-primary gap-2">
                  {updateMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Save size={14} />
                  }
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── Performance & Earnings Tab ── */}
        {activeTab === 'performance' && isDentist && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {perfLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : (
              <>
                {/* This Month */}
                <div className="card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center">
                      <TrendingUp size={15} className="text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">This Month Performance</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{formatMonthYear(new Date(), calendarType)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        icon: Users, label: 'Patients Attended',
                        value: perfData?.monthly?.totalPatients ?? 0,
                        color: 'bg-brand-600/15 text-brand-400',
                        iconColor: 'text-brand-400',
                      },
                      {
                        icon: CheckCircle2, label: 'Completed Apts',
                        value: perfData?.monthly?.totalAppointments ?? 0,
                        color: 'bg-emerald-500/10 text-emerald-400',
                        iconColor: 'text-emerald-400',
                      },
                      {
                        icon: CalendarOff, label: 'Total Leave This Month',
                        value: perfData?.monthly?.leaveThisMonth ?? 0,
                        color: 'bg-amber-500/10 text-amber-400',
                        iconColor: 'text-amber-400',
                      },
                      {
                        icon: TrendingUp, label: 'Commission Earned',
                        value: `NPR ${Number(actualCommission).toLocaleString()}`,
                        sub: serviceRevenue > 0
                          ? `From NPR ${Number(serviceRevenue).toLocaleString()} service revenue`
                          : 'No service revenue this month',
                        color: 'bg-purple-500/10 text-purple-400',
                        iconColor: 'text-purple-400',
                      },
                    ].map(({ icon: Icon, label, value, color, iconColor, sub }) => (
                      <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                          <Icon size={14} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mb-1">{label}</p>
                        <p className="text-base font-bold text-[var(--text-primary)]">{value}</p>
                        {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall */}
                <div className="card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Calendar size={15} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">Overall Performance</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">All time</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        icon: Users, label: 'Total Patients',
                        value: perfData?.overall?.totalPatients ?? 0,
                        color: 'bg-brand-600/15 text-brand-400',
                      },
                      {
                        icon: CheckCircle2, label: 'Completed Appointments',
                        value: perfData?.overall?.totalAppointments ?? 0,
                        color: 'bg-emerald-500/10 text-emerald-400',
                      },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                          <Icon size={14} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mb-1">{label}</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{(value as number).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── My Patients Tab ── */}
        {activeTab === 'patients' && isDentist && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">My Patients</h3>
              {totalPatients > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {totalPatients} unique patient{totalPatients !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {patientsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : pagedPatients.length === 0 ? (
              <div className="text-center py-12">
                <User size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">No patients yet</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl"
                  style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        {['Patient','Contact','Age','Gender','Last Visit'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPatients.map((p: any) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          className="cursor-pointer transition-colors hover:bg-white/3"
                          style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                                {p.firstName?.[0]}{p.lastName?.[0]}
                              </div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {p.firstName} {p.lastName}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {p.phone || p.email || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                            {p.ageYears ?? p.age ?? '—'}
                            {(p.ageYears ?? p.age) ? ' yrs' : ''}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)] capitalize">
                            {p.gender || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                            {p.lastVisitAt ? formatDate(new Date(p.lastVisitAt), calendarType) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {pagedPatients.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className="w-full card p-3 text-left flex items-center gap-3 hover:border-brand-500/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
                        {p.firstName?.[0]}{p.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {p.phone || p.email || '—'}
                          {computeAge(p) !== null ? ` · ${computeAge(p)}y` : ''}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
                    </button>
                  ))}
                </div>

                <PaginationBar
                  page={patientPage}
                  total={totalPatients}
                  pageSize={PAGE_SIZE}
                  onPrev={() => setPatientPage(p => p - 1)}
                  onNext={() => setPatientPage(p => p + 1)}
                />
              </>
            )}
          </motion.div>
        )}

        {/* ── My Appointments Tab ── */}
        {activeTab === 'appointments' && isDentist && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">My Appointments</h3>
              {totalApts > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{totalApts} total</span>
              )}
            </div>

            {aptsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">No appointments yet</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl"
                  style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        {['Patient','Type','Date & Time','Status'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(appointments as any[]).map((apt: any) => (
                        <tr
                          key={apt.id}
                          onClick={() => setSelectedApt(apt)}
                          className="cursor-pointer transition-colors hover:bg-white/3"
                          style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                                {apt.patient?.firstName?.[0]}{apt.patient?.lastName?.[0]}
                              </div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {apt.patient?.firstName} {apt.patient?.lastName}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)] capitalize">
                            {(apt.type || '').replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                            {formatDate(new Date(apt.scheduledAt), calendarType)}
                            {' · '}{formatNepalClockTime(apt.scheduledAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                              {apt.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {(appointments as any[]).map((apt: any) => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedApt(apt)}
                      className="w-full card p-3 text-left flex items-center gap-3 hover:border-brand-500/30 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-brand-600/10 flex items-center justify-center shrink-0">
                        <Calendar size={15} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                          {(apt.type || '').replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {apt.patient?.firstName} {apt.patient?.lastName} ·{' '}
                          {formatDate(new Date(apt.scheduledAt), calendarType)}
                          {' '}{formatNepalClockTime(apt.scheduledAt)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                        {apt.status}
                      </span>
                    </button>
                  ))}
                </div>

                <PaginationBar
                  page={appointmentPage}
                  total={totalApts}
                  pageSize={PAGE_SIZE}
                  onPrev={() => setAppointmentPage(p => p - 1)}
                  onNext={() => setAppointmentPage(p => p + 1)}
                />
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Detail panels */}
      <AnimatePresence>
        {selectedPatient && (
          <PatientDetailPanel
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
            onUpdate={() => {
              setSelectedPatient(null);
              qc.invalidateQueries({ queryKey: ['profile-doctor-patients'] });
            }}
          />
        )}
        {selectedApt && (
          <AppointmentDetailPanel
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onUpdate={() => {
              setSelectedApt(null);
              qc.invalidateQueries({ queryKey: ['profile-doctor-appointments'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}