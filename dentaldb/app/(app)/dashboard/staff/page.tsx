'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X, UserCheck, UserX, Shield, Stethoscope,
  Phone, Mail, Search, ChevronLeft, ChevronRight, Loader2,
  Calendar, Users, TrendingUp, ShieldCheck, Trash2, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatNepalDateTime } from '@/lib/timezone';
import toast from 'react-hot-toast';
import { usersApi, appointmentsApi, rbacApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Header from '@/components/layout/Header';
import { ActionIconButton } from '@/components/ui/ActionIconButton';
import PermissionGate from '@/components/rbac/PermissionGate';
import RoleAssignmentModal from '@/components/rbac/RoleAssignmentModal';
import type { User } from '@/types';
import { useContextPanelStore } from '@/store/contextpanel.store';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';

const STAFF_PER_PAGE = 12;

interface RoleOption { id: string; name: string; description?: string; }

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  email:     z.string().email('Valid email required'),
  password:  z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
  role:      z.string().min(1, 'Role is required'),
  phone:     z.string().optional(),
  branchId:  z.string().optional(),
  nmcNo:     z.string().optional(),
  commissionRate: z.preprocess(
    v => (v === '' || v === undefined || v === null) ? undefined : Number(v),
    z.number().min(0, 'Min 0').max(100, 'Max 100').optional()
  ),
  baseSalary: z.preprocess(
    v => (v === '' || v === undefined || v === null) ? undefined : Number(v),
    z.number().min(0, 'Min 0').optional()
  ),
});
type FormData = z.infer<typeof schema>;

const ROLE_META: Record<string, { label: string; color: string; icon: any }> = {
  owner:        { label: 'Owner',        color: 'text-amber-400 bg-amber-400/10',     icon: Shield      },
  dentist:      { label: 'Doctor',      color: 'text-brand-400 bg-brand-400/10',     icon: Stethoscope },
  receptionist: { label: 'Receptionist', color: 'text-emerald-400 bg-emerald-400/10', icon: UserCheck   },
  accountant:   { label: 'Accountant',   color: 'text-purple-400 bg-purple-400/10',   icon: Shield      },
  staff:        { label: 'Staff',        color: 'text-gray-400 bg-gray-400/10',       icon: UserCheck   },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, color: 'text-gray-400 bg-gray-400/10', icon: Shield };
}

function StaffModal({ onClose, onSuccess, member }: { onClose: () => void; onSuccess: () => void; member?: User }) {
  const { data: rolesData, isLoading: rolesLoading } = useQuery<RoleOption[]>({
    queryKey: ['rbac-roles-for-staff'],
    queryFn: () => rbacApi.getRoles().then(r => r.data),
    staleTime: 30_000,
  });

  const { branches, activeBranch } = useAuthStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: member
      ? { firstName: member.firstName, lastName: member.lastName, email: member.email, phone: member.phone || '', password: '', role: member.role || 'staff', commissionRate: (member as any).commissionRate ?? undefined, baseSalary: (member as any).baseSalary ?? undefined, branchId: '', nmcNo: (member as any).nmcNo || '' }
      : { role: 'staff', firstName: '', lastName: '', email: '', phone: '', password: '', commissionRate: undefined, baseSalary: undefined, branchId: activeBranch?.id ?? '', nmcNo: '' },
  });

  const watchedRole = watch('role');
  const sigInputRef = useRef<HTMLInputElement>(null);
  const [sigUrl, setSigUrl] = useState<string>((member as any)?.signatureUrl || '');
  const [uploadingSig, setUploadingSig] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const resolvedSig = sigUrl ? (sigUrl.startsWith('http') ? sigUrl : `${API_BASE}${sigUrl}`) : null;

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: any = { ...data };
      if (!payload.password) delete payload.password;
      // The branch selector is only rendered for new staff (see the
      // `!member && branches.length > 1` block below) — in edit mode
      // `branchId` never has a real input and always carries the
      // hardcoded '' from defaultValues, so don't send it as if the user
      // meant to clear the member's branch assignment.
      if (member) delete payload.branchId;
      return member ? usersApi.update(member.id, payload) : usersApi.create(payload);
    },
    onSuccess,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const handleSigUpload = async (file: File) => {
    if (!member?.id) { toast.error('Save the member first before uploading a signature'); return; }
    setUploadingSig(true);
    try {
      const res = await usersApi.uploadStaffSignature(member.id, file);
      setSigUrl(res.data.signatureUrl);
      toast.success('Signature uploaded');
    } catch { toast.error('Signature upload failed'); }
    finally { setUploadingSig(false); }
  };

  const apiRoles = rolesData ?? [];

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[var(--text-primary)]">{member ? 'Edit Member' : 'Add Staff Member'}</h2>
          <ActionIconButton icon={<X />} tooltip="Close" onClick={onClose} />
        </div>
        <div className="overflow-y-auto max-h-[80vh]">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input {...register('firstName')} className="input w-full" placeholder="John" />
                {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last name</label>
                <input {...register('lastName')} className="input w-full" placeholder="Doe" />
                {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input w-full" placeholder="staff@clinic.com" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} type="tel" className="input w-full" placeholder="+977 98XXXXXXXX" />
            </div>
            <div>
              <label className="label">Role</label>
              {rolesLoading ? (
                <div className="input w-full flex items-center gap-2 text-[var(--text-muted)]">
                  <Loader2 size={14} className="animate-spin" /> Loading roles…
                </div>
              ) : (
                <select {...register('role')} className="input w-full">
                  <option value="">Select a role…</option>
                  {apiRoles.map(r => (
                    <option key={r.id} value={r.name.toLowerCase()}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                  ))}
                </select>
              )}
              {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role.message}</p>}
            </div>
            {/* Show commission field for roles that are doctor/dentist type */}
            {watchedRole && /doctor|dentist/i.test(watchedRole) && (
              <div>
                <label className="label">Commission Rate (%)</label>
                <input {...register('commissionRate')} type="number" min={0} max={100} step={0.01} className="input w-full" placeholder="e.g. 10" />
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">Commission earned per service payment. Leave blank for no commission.</p>
                {errors.commissionRate && <p className="mt-1 text-xs text-red-400">{errors.commissionRate.message}</p>}
              </div>
            )}
            {/* NMC No — for doctor/dentist roles */}
            {watchedRole && /doctor|dentist/i.test(watchedRole) && (
              <div>
                <label className="label">NMC No.</label>
                <input {...register('nmcNo')} className="input w-full" placeholder="e.g. 12345" />
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">Nepal Medical Council registration number.</p>
              </div>
            )}
            {/* Branch assignment — only shown when adding new staff and multiple branches exist */}
            {!member && branches.length > 1 && (
              <div>
                <label className="label">Assign to Branch</label>
                <select {...register('branchId')} className="input w-full">
                  <option value="">— No specific branch —</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">Staff will be visible when this branch is selected.</p>
              </div>
            )}
            {/* Base salary field for all staff — used in payroll calculations */}
            <div>
              <label className="label">Monthly Base Salary (NPR)</label>
              <input {...register('baseSalary')} type="number" min={0} step={100} className="input w-full" placeholder="e.g. 50000" />
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">Monthly fixed salary used in payroll. Leave blank if paid on commission only.</p>
              {errors.baseSalary && <p className="mt-1 text-xs text-red-400">{errors.baseSalary.message}</p>}
            </div>
            {/* Signature upload — only for editing doctor/dentist/owner */}
            {member && watchedRole && /doctor|dentist|owner/i.test(watchedRole) && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Prescription Signature</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-24 h-12 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: 'var(--bg-base)', border: '1px dashed var(--border)' }}
                  >
                    {resolvedSig
                      ? <img src={resolvedSig} alt="Sig" className="w-full h-full object-contain p-1" />
                      : <span className="text-[10px] text-[var(--text-muted)]">No signature</span>
                    }
                  </div>
                  <div>
                    <button type="button" onClick={() => sigInputRef.current?.click()} disabled={uploadingSig}
                      className="btn-ghost text-xs flex items-center gap-1.5 px-2 py-1">
                      {uploadingSig ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      {uploadingSig ? 'Uploading…' : resolvedSig ? 'Replace' : 'Upload'}
                    </button>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">PNG recommended</p>
                  </div>
                </div>
                <input ref={sigInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.svg"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleSigUpload(f); e.target.value = ''; }} />
              </div>
            )}
            <div>
              <label className="label">{member ? 'New Password (blank = unchanged)' : 'Password'}</label>
              <input {...register('password')} type="password" className="input w-full" placeholder="Min. 8 characters" />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
                {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : member ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

const APT_PER_PAGE = 5;
function DentistPanel({ member, onClose }: { member: User; onClose: () => void }) {
  const [aptPage, setAptPage] = useState(1);
  const { data: perfData } = useQuery({ queryKey: ['dentist-performance', member.id], queryFn: () => usersApi.getDentistPerformance(member.id).then(r => r.data) });
  const { data: aptsData, isLoading: aptsLoading } = useQuery({ queryKey: ['dentist-appointments', member.id, aptPage], queryFn: () => appointmentsApi.list({ dentistId: member.id, limit: APT_PER_PAGE, page: aptPage, order: 'DESC' }).then(r => r.data) });
  const totalAptPages = aptsData?.totalPages ?? 1;
  const apts = aptsData?.data ?? [];
  const meta = getRoleMeta(member.role);
  const Icon = meta.icon;

  return (
    <>
      <motion.div className="drawer-overlay bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="drawer-panel w-full max-w-md flex flex-col shadow-2xl rounded-tl-2xl rounded-bl-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${meta.color}`}>{member.firstName[0]}{member.lastName[0]}</div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Dr. {member.firstName} {member.lastName}</p>
              <span className={`text-[10px] font-medium capitalize px-1.5 py-0.5 rounded-md ${meta.color}`}>{meta.label}</span>
            </div>
          </div>
          <ActionIconButton icon={<X />} tooltip="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {perfData?.monthly && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users, label: 'Patients', value: perfData.monthly.totalPatients ?? 0, color: 'text-brand-400' },
                  { icon: Calendar, label: 'Completed', value: perfData.monthly.totalAppointments ?? 0, color: 'text-emerald-400' },
                  { icon: TrendingUp, label: 'Revenue', value: `NPR ${(perfData.monthly.totalRevenue ?? 0).toLocaleString()}`, color: 'text-amber-400' },
                ].map(({ icon: SI, label, value, color }) => (
                  <div key={label} className="card p-3 text-center">
                    <SI size={14} className={`mx-auto mb-1 ${color}`} />
                    <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{value}</p>
                  </div>
                ))}
              </div>
              {/* Commission section */}
              {(perfData.monthly.commissionRate > 0 || perfData.monthly.estimatedCommission > 0) && (
                <div className="card p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Est. Commission (this month)</p>
                    <p className="text-lg font-bold text-emerald-400">
                      NPR {(perfData.monthly.estimatedCommission ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Rate</p>
                    <span className="text-sm font-semibold text-brand-400 px-2 py-0.5 rounded-full bg-brand-500/10">
                      {perfData.monthly.commissionRate}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          {perfData?.overall && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Overall</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-[var(--text-muted)]">Total Patients</p><p className="text-sm font-bold text-[var(--text-primary)]">{(perfData.overall.totalPatients as number).toLocaleString()}</p></div>
                <div><p className="text-[10px] text-[var(--text-muted)]">Appointments</p><p className="text-sm font-bold text-[var(--text-primary)]">{(perfData.overall.totalAppointments as number).toLocaleString()}</p></div>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Recent Appointments</p>
            {aptsLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
              : apts.length === 0 ? <p className="text-sm text-[var(--text-muted)] text-center py-6">No appointments yet</p>
              : <div className="space-y-2">
                  {apts.map((apt: any) => (
                    <div key={apt.id} className="card p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0"><Calendar size={12} className="text-brand-400" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{apt.patient?.firstName} {apt.patient?.lastName}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{formatNepalDateTime(apt.scheduledAt)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${apt.status === 'completed' ? 'bg-emerald-400/10 text-emerald-400' : apt.status === 'cancelled' ? 'bg-red-400/10 text-red-400' : 'bg-brand-400/10 text-brand-400'}`}>{apt.status}</span>
                    </div>
                  ))}
                  {totalAptPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <button disabled={aptPage === 1} onClick={() => setAptPage(p => p - 1)} className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"><ChevronLeft size={12} /></button>
                      <span className="text-xs text-[var(--text-muted)]">{aptPage} / {totalAptPages}</span>
                      <button disabled={aptPage >= totalAptPages} onClick={() => setAptPage(p => p + 1)} className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"><ChevronRight size={12} /></button>
                    </div>
                  )}
                </div>
            }
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default function StaffPage() {
  const [showModal,       setShowModal]       = useState(false);
  const [editMember,      setEditMember]      = useState<User | null>(null);
  const [selectedDentist, setSelectedDentist] = useState<User | null>(null);
  const setSelectedStaff = useContextPanelStore(s => s.setSelectedStaff);
  const clearContext     = useContextPanelStore(s => s.clear);
  const focusStaff = (member: User) => { setSelectedStaff(member); if (/doctor|dentist/i.test(member.role)) setSelectedDentist(member); };
  const closeDentistPanel = () => { setSelectedDentist(null); clearContext(); };
  useEffect(() => () => clearContext(), [clearContext]);
  const [assignTarget,    setAssignTarget]    = useState<User | null>(null);
  const [search,          setSearch]          = useState('');
  const [page,            setPage]            = useState(1);
  const [deleteTarget,    setDeleteTarget]    = useState<User | null>(null);
  const qc = useQueryClient();
  const { activeBranch, user: currentUser } = useAuthStore();
  const { isReadOnly: branchLocked } = useBranchReadOnly();

  const { data, isLoading } = useQuery<{ data: User[]; total: number; page: number; limit: number; totalPages: number; }>({
    queryKey: ['staff', page, search, activeBranch?.id],
    queryFn: () => usersApi.listStaff({ page, limit: STAFF_PER_PAGE, search: search || undefined, branchId: activeBranch?.id }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const staff: User[]  = data?.data      || [];
  const total          = data?.total     || 0;
  const totalPages     = data?.totalPages || Math.ceil(total / STAFF_PER_PAGE);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { toast.success('Staff member deactivated'); qc.invalidateQueries({ queryKey: ['staff'] }); },
    onError: () => toast.error('Failed to deactivate'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.reactivate(id),
    onSuccess: () => { toast.success('Staff member reactivated'); qc.invalidateQueries({ queryKey: ['staff'] }); },
    onError: () => toast.error('Failed to reactivate'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteStaff(id),
    onSuccess: () => { toast.success('Staff member deleted'); qc.invalidateQueries({ queryKey: ['staff'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete staff member'),
  });

  const handleSuccess = () => {
    setShowModal(false); setEditMember(null);
    qc.invalidateQueries({ queryKey: ['staff'] });
    toast.success('Staff member saved!');
  };

  const roleCounts = Object.fromEntries(
    Object.keys(ROLE_META).filter(r => r !== 'owner').map(role => [role, staff.filter((s: User) => s.role === role && s.isActive).length]),
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Staff Mgmt" action={!branchLocked ? { label: 'Add staff', onClick: () => setShowModal(true) } : undefined} />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">Delete Staff Member</h3>
            <p className="text-sm text-[var(--text-muted)] text-center mb-5">
              Permanently delete <strong className="text-[var(--text-primary)]">{deleteTarget.firstName} {deleteTarget.lastName}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="flex-1 btn-ghost py-2 text-sm">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-5">
        {activeBranch && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
            <span>— showing staff for this branch</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {Object.entries(ROLE_META).filter(([r]) => r !== 'owner').map(([role, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={role} className="card p-3 sm:p-4 flex items-center gap-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${meta.color}`}><Icon size={14} /></div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{meta.label}s</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{roleCounts[role] ?? 0}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email…" className="input w-full" style={{ paddingLeft: '2.25rem' }} />
            {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={13} /></button>}
          </div>
          <p className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">{total} member{total !== 1 ? 's' : ''}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array(STAFF_PER_PAGE).fill(0).map((_, i) => <div key={i} className="card p-5 animate-pulse"><div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 rounded-full bg-white/10" /><div className="flex-1 space-y-2"><div className="h-4 bg-white/10 rounded w-3/4" /><div className="h-3 bg-white/10 rounded w-1/2" /></div></div></div>)}
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck size={36} className="mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
            <p className="text-[var(--text-muted)] mb-4">{search ? `No staff matching "${search}"` : 'No staff members yet'}</p>
            {!search && <PermissionGate permission="staff.manage">{!branchLocked && <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">Add first member</button>}</PermissionGate>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {staff.map((member, i) => {
                const meta = getRoleMeta(member.role);
                const Icon = meta.icon;
                return (
                  <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => focusStaff(member)}
                    className={`card p-5 transition-all cursor-pointer hover:border-brand-500/40 ${!member.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${meta.color}`}>{member.firstName[0]}{member.lastName[0]}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)] text-sm truncate">{/doctor|dentist/i.test(member.role) ? 'Dr. ' : ''}{member.firstName} {member.lastName}</p>
                          <span className={`badge text-[10px] ${meta.color}`}><Icon size={9} className="mr-1 inline" />{meta.label}</span>
                        </div>
                      </div>
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${member.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {member.email && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 truncate"><Mail size={10} className="text-[var(--text-muted)] shrink-0" />{member.email}</p>}
                      {member.phone && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2"><Phone size={10} className="text-[var(--text-muted)] shrink-0" />{member.phone}</p>}
                      {(member as any).commissionRate != null && (
                        <p className="text-[10px] text-[var(--text-muted)]">Commission: <span className="text-emerald-400 font-medium">{(member as any).commissionRate}%</span></p>
                      )}
                      {(member as any).nmcNo && (
                        <p className="text-[10px] text-[var(--text-muted)]">NMC No: <span className="text-[var(--text-secondary)] font-medium">{(member as any).nmcNo}</span></p>
                      )}
                      {(member as any).baseSalary != null && Number((member as any).baseSalary) > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">Base Salary: <span className="text-blue-400 font-medium">NPR {Number((member as any).baseSalary).toLocaleString()}</span></p>
                      )}
                      <p className="text-[10px] text-[var(--text-muted)]">Joined {format(new Date(member.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-2">
                      {/doctor|dentist/i.test(member.role) && (
                        <button onClick={(e) => { e.stopPropagation(); focusStaff(member); }} className="btn-secondary flex-1 justify-center text-xs py-1.5 text-brand-400 border-brand-500/20">View</button>
                      )}
                      <PermissionGate permission="staff.manage">
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setAssignTarget(member); }} title="Assign Roles"
                            className="flex items-center gap-1 justify-center px-2.5 py-1.5 rounded-lg text-xs text-brand-400 hover:bg-brand-400/5 transition-colors shrink-0"
                            style={{ border: '1px solid rgba(14,157,232,0.2)' }}>
                            <ShieldCheck size={11} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditMember(member); }} className={`btn-secondary justify-center text-xs py-1.5 ${/doctor|dentist/i.test(member.role) ? '' : 'flex-1'}`}>Edit</button>
                          {member.isActive ? (
                            <button onClick={(e) => { e.stopPropagation(); deactivateMutation.mutate(member.id); }} disabled={deactivateMutation.isPending}
                              title="Deactivate member"
                              className="flex items-center gap-1 justify-center px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-400/5 transition-colors shrink-0"
                              style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                              <UserX size={11} />
                            </button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); reactivateMutation.mutate(member.id); }} disabled={reactivateMutation.isPending}
                              title="Reactivate member"
                              className="flex items-center gap-1 justify-center px-3 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-400/5 transition-colors shrink-0"
                              style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
                              <UserCheck size={11} />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(member); }} disabled={deleteMutation.isPending}
                            className="flex items-center gap-1 justify-center px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                            title="Delete member"
                            style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                            <Trash2 size={11} />
                          </button>
                        </>
                      </PermissionGate>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-[var(--text-muted)]">{((page - 1) * STAFF_PER_PAGE) + 1}–{Math.min(page * STAFF_PER_PAGE, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 gap-1"><ChevronLeft size={13} /> Prev</button>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                      return <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${n === page ? 'bg-brand-600 text-white' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}>{n}</button>;
                    })}
                  </div>
                  <span className="sm:hidden text-xs text-[var(--text-muted)]">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 gap-1">Next <ChevronRight size={13} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {(showModal || editMember) && (
          <StaffModal onClose={() => { setShowModal(false); setEditMember(null); }} onSuccess={handleSuccess} member={editMember || undefined} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedDentist && <DentistPanel member={selectedDentist} onClose={closeDentistPanel} />}
      </AnimatePresence>
      {assignTarget && (
        <RoleAssignmentModal user={assignTarget} onClose={() => setAssignTarget(null)} onSaved={() => { setAssignTarget(null); qc.invalidateQueries({ queryKey: ['staff'] }); toast.success('Roles updated!'); }} />
      )}
    </div>
  );
}