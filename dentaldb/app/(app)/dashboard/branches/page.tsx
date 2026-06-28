'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import {
  Plus, X, Building2, Phone, Mail, MapPin,
  Users, Pencil, Trash2, UserPlus, UserMinus, Search, Loader2, Calendar,
  BarChart2, Lock, AlertTriangle, CheckCircle2, Info, Clock, ShieldAlert,
  RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { branchesApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import Header from '@/components/layout/Header';
import { formatDistanceToNow, format } from 'date-fns';
import type { Branch, User } from '@/types';

// Leaflet touches `window` on import, so it must be loaded client-side only.
const LocationMapPicker = dynamic(() => import('@/components/ui/LocationMapPicker'), {
  ssr: false,
  loading: () => <div className="h-56 w-full rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />,
});

// ── Branch status enum (mirrors backend) ─────────────────────────────────────
type BranchStatus = 'active' | 'inactive' | 'pending_selection';

// ── Branch Form Schema ────────────────────────────────────────────────────────
const branchSchema = z.object({
  name:    z.string().min(2, 'Name required'),
  address: z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email('Invalid email').optional().or(z.literal('')),
});
type BranchForm = z.infer<typeof branchSchema>;

function planLabel(plan: string, maxBranches: number): string {
  if (maxBranches === Infinity || maxBranches >= 9999) return 'Unlimited branches';
  const suffix = `${maxBranches} branch${maxBranches !== 1 ? 'es' : ''} allowed`;
  if (plan === 'pro')        return `Pro — ${suffix}`;
  if (plan === 'enterprise') return `Enterprise — ${suffix}`;
  return suffix;
}

// ── Pending Downgrade Selection Banner ───────────────────────────────────────
function DowngradeSelectionBanner({
  pendingSelection,
  onChoose,
  isAdmin,
}: {
  pendingSelection: {
    newQuota: number;
    previousQuota: number;
    gracePeriodEndsAt: string | null;
    gracePeriodExpired: boolean;
    effectiveAt: string;
  };
  onChoose: () => void;
  isAdmin: boolean;
}) {
  const isExpired = pendingSelection.gracePeriodExpired;
  const hasGrace  = !!pendingSelection.gracePeriodEndsAt;

  return (
    <div
      className="mb-5 rounded-xl overflow-hidden"
      style={{ border: `1px solid ${isExpired ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}` }}
    >
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3"
        style={{ background: isExpired ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)' }}
      >
        <ShieldAlert size={17} className={isExpired ? 'text-red-400 shrink-0' : 'text-amber-400 shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
            {isExpired ? 'Branch selection overdue' : 'Branch selection required'}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Your plan was reduced from{' '}
            <strong className="text-[var(--text-secondary)]">{pendingSelection.previousQuota}</strong> to{' '}
            <strong className="text-[var(--text-secondary)]">{pendingSelection.newQuota}</strong> branch
            {pendingSelection.newQuota !== 1 ? 'es' : ''}.{' '}
            {hasGrace && !isExpired && pendingSelection.gracePeriodEndsAt && (
              <>
                Choose which branches to keep active.{' '}
                <span className="text-amber-300 font-medium">
                  Grace period ends {formatDistanceToNow(new Date(pendingSelection.gracePeriodEndsAt), { addSuffix: true })}.
                </span>
              </>
            )}
            {isExpired && (
              <span className="text-red-300 font-medium">
                {' '}Grace period expired — please select your branches now to avoid auto-assignment.
              </span>
            )}
            {!hasGrace && ' Branches with pending_selection status cannot process appointments or billing until selection is confirmed.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onChoose}
            className={`text-xs py-1.5 px-3 shrink-0 whitespace-nowrap rounded-lg font-semibold transition-colors ${
              isExpired
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            }`}
            style={{ border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}
          >
            Choose branches
          </button>
        )}
      </div>
    </div>
  );
}

// ── Over-quota Banner (legacy path, should be rare with new system) ───────────
function QuotaStatusBanner({
  quota, activeBranches, overActiveQuota, onManage, isAdmin,
}: {
  quota: number;
  activeBranches: number;
  overActiveQuota: boolean;
  onManage: () => void;
  isAdmin: boolean;
}) {
  if (!overActiveQuota) return null;
  return (
    <div
      className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-400">Branch limit exceeded</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Your plan allows <strong>{quota}</strong> active {quota !== 1 ? 'branches' : 'branch'}.{' '}
          You have <strong>{activeBranches}</strong> active — please choose which {quota} to keep.
        </p>
      </div>
      {isAdmin && (
        <button onClick={onManage} className="btn-secondary text-xs py-1.5 px-3 shrink-0 whitespace-nowrap">
          Choose active branches
        </button>
      )}
    </div>
  );
}

// ── Downgrade Selection Modal ─────────────────────────────────────────────────
function DowngradeSelectionModal({
  branches,
  maxKeep,
  pendingSelection,
  onConfirm,
  onClose,
  isPending,
}: {
  branches: Branch[];
  maxKeep: number;
  pendingSelection?: {
    gracePeriodEndsAt: string | null;
    gracePeriodExpired: boolean;
    previousQuota: number;
  } | null;
  onConfirm: (keepIds: string[]) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  // All branches are eligible choices — no pre-filtering needed
  const eligibleBranches = branches;
  // Pre-select active + pending_selection branches up to maxKeep.
  // pending_selection branches were active before the downgrade triggered, so they
  // should appear pre-checked rather than forcing the user to re-pick from scratch.
  const initialSelected = new Set(
    branches
      .filter(b => (b as any).status === 'active' || (b as any).status === 'pending_selection')
      .slice(0, maxKeep)
      .map(b => b.id),
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxKeep) {
        next.add(id);
      } else {
        toast.error(`You can only keep ${maxKeep} active branch${maxKeep !== 1 ? 'es' : ''}.`);
      }
      return next;
    });
  };

  const isOverdue = pendingSelection?.gracePeriodExpired;

  return (
    <motion.div
      className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            borderBottom: '1px solid var(--border)',
            background: isOverdue ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isOverdue ? 'bg-red-500/15' : 'bg-amber-500/15'
              }`}>
                <ShieldAlert size={18} className={isOverdue ? 'text-red-400' : 'text-amber-400'} />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">Choose Active Branches</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
                  Your plan allows{' '}
                  <strong className="text-[var(--text-secondary)]">{maxKeep}</strong>{' '}
                  active {maxKeep !== 1 ? 'branches' : 'branch'}.
                  Select which to keep active — others become <strong>read-only</strong> (data preserved, not deleted).
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Grace period warning */}
          {pendingSelection?.gracePeriodEndsAt && (
            <div className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              isOverdue
                ? 'bg-red-500/10 text-red-300'
                : 'bg-amber-500/10 text-amber-300'
            }`}>
              <Clock size={11} className="shrink-0" />
              {isOverdue
                ? 'Grace period has expired. Please confirm selection now to avoid automatic assignment.'
                : `Grace period ends ${format(new Date(pendingSelection.gracePeriodEndsAt), 'MMM d, yyyy h:mm a')}.`
              }
            </div>
          )}
        </div>

        {/* Quota tracker */}
        <div className="mx-5 mt-4 mb-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (selected.size / maxKeep) * 100)}%`,
                background: selected.size === maxKeep ? 'rgb(52,211,153)' : 'rgb(14,157,232)',
              }}
            />
          </div>
          <span className={`text-xs shrink-0 font-medium ${
            selected.size === maxKeep ? 'text-emerald-400' : 'text-[var(--text-muted)]'
          }`}>
            {selected.size}/{maxKeep}
          </span>
        </div>

        {/* Branch list */}
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {branches.map(b => {
            const bStatus: BranchStatus = (b as any).status || (b.isActive ? 'active' : 'inactive');
            const isChecked  = selected.has(b.id);
            const canSelect  = isChecked || selected.size < maxKeep;

            return (
              <button
                key={b.id}
                onClick={() => toggle(b.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isChecked
                    ? 'ring-1 ring-brand-400/40'
                    : canSelect
                    ? 'opacity-70 hover:opacity-90'
                    : 'opacity-30 cursor-not-allowed'
                }`}
                style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${isChecked ? 'rgba(14,157,232,0.3)' : 'var(--border)'}`,
                }}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  isChecked ? 'bg-brand-500' : 'bg-white/10'
                }`}>
                  {isChecked && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.name}</p>
                  {b.address && <p className="text-[10px] text-[var(--text-muted)] truncate">{b.address}</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  bStatus === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : bStatus === 'pending_selection'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {bStatus === 'pending_selection' ? 'Pending' : bStatus === 'active' ? 'Active' : 'Inactive'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Info note */}
        <div className="mx-5 mb-2 flex items-start gap-2 text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <Info size={11} className="shrink-0 mt-0.5" />
          <span>
            This selection applies for your current billing cycle. Unselected branches will be read-only — no appointments, billing, or data entry — but all data is preserved.
          </span>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center" disabled={isPending}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0 || isPending}
            className="btn-primary flex-1 justify-center"
          >
            {isPending
              ? <Loader2 size={14} className="animate-spin" />
              : `Confirm ${selected.size}/${maxKeep} branch${maxKeep !== 1 ? 'es' : ''}`
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Branch Stats Modal ────────────────────────────────────────────────────────
function BranchStatsModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['branch-stats', branch.id],
    queryFn: () => branchesApi.getStats(branch.id).then(r => r.data),
  });

  const stats = [
    { icon: Users,    label: 'Total Patients',      value: isLoading ? '—' : (data?.totalPatients ?? 0).toLocaleString(),      color: 'text-brand-400 bg-brand-400/10' },
    { icon: Calendar, label: 'Total Appointments',  value: isLoading ? '—' : (data?.totalAppointments ?? 0).toLocaleString(), color: 'text-emerald-400 bg-emerald-400/10' },
  ];

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center">
              <Building2 size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">{branch.name}</h2>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                Branch Overview
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  (branch as any).isPubliclyListed ? 'bg-brand-500/10 text-brand-400' : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {(branch as any).isPubliclyListed ? <Eye size={9} /> : <EyeOff size={9} />}
                  {(branch as any).isPubliclyListed ? 'Public' : 'Hidden'}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={17} /></button>
        </div>
        <div className="p-5">
          <div className="space-y-1.5 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            {branch.address && (
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <MapPin size={11} className="text-[var(--text-muted)] shrink-0" />{branch.address}
              </p>
            )}
            {branch.phone && (
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Phone size={11} className="text-[var(--text-muted)] shrink-0" />{branch.phone}
              </p>
            )}
            {branch.email && (
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Mail size={11} className="text-[var(--text-muted)] shrink-0" />{branch.email}
              </p>
            )}
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
              <Users size={11} className="text-[var(--text-muted)] shrink-0" />
              {branch.staff?.length || 0} staff assigned
            </p>
          </div>
          {(branch as any).latitude != null && (branch as any).longitude != null && (
            <div className="mb-5">
              <LocationMapPicker
                theme="dark"
                heightClassName="h-40"
                readOnly
                latitude={Number((branch as any).latitude)}
                longitude={Number((branch as any).longitude)}
                onChange={() => {}}
              />
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-xl p-4"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Branch Create / Edit Modal ────────────────────────────────────────────────
function BranchModal({
  branch,
  onClose,
  onSuccess,
}: {
  branch?: Branch;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: branch
      ? { name: branch.name, address: branch.address || '', phone: branch.phone || '', email: branch.email || '' }
      : {},
  });

  const [latitude, setLatitude] = useState<number | ''>(
    (branch as any)?.latitude !== undefined && (branch as any)?.latitude !== null ? Number((branch as any).latitude) : ''
  );
  const [longitude, setLongitude] = useState<number | ''>(
    (branch as any)?.longitude !== undefined && (branch as any)?.longitude !== null ? Number((branch as any).longitude) : ''
  );
  const [isPubliclyListed, setIsPubliclyListed] = useState<boolean>((branch as any)?.isPubliclyListed || false);
  const [detectedAddress, setDetectedAddress] = useState('');

  const createMut = useMutation({
    mutationFn: (d: BranchForm & { latitude?: number | null; longitude?: number | null; isPubliclyListed?: boolean }) => branchesApi.create(d),
    onSuccess: () => { toast.success('Branch created'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create branch'),
  });
  const updateMut = useMutation({
    mutationFn: (d: BranchForm & { latitude?: number | null; longitude?: number | null; isPubliclyListed?: boolean }) => branchesApi.update(branch!.id, d),
    onSuccess: () => { toast.success('Branch updated'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update branch'),
  });

  const onSubmit = (d: BranchForm) => {
    const payload = {
      ...d,
      latitude: latitude === '' ? null : latitude,
      longitude: longitude === '' ? null : longitude,
      isPubliclyListed,
    };
    branch ? updateMut.mutate(payload) : createMut.mutate(payload);
  };
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[var(--text-primary)]">{branch ? 'Edit Branch' : 'New Branch'}</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="label">Branch Name *</label>
            <input {...register('name')} className="input w-full mt-1" placeholder="Main Branch" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Address</label>
            <input {...register('address')} className="input w-full mt-1" placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input w-full mt-1" placeholder="+977…" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} className="input w-full mt-1" placeholder="branch@clinic.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>

          {/* Location map — GPS auto-detect, drag/tap to fine-tune */}
          <div>
            <label className="label mb-1.5 block">Branch Location</label>
            <LocationMapPicker
              theme="dark"
              heightClassName="h-56"
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              onAddressDetected={setDetectedAddress}
            />
            {detectedAddress && (
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Detected: <span className="text-[var(--text-secondary)]">{detectedAddress}</span>
              </p>
            )}
          </div>

          {/* Public visibility toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPubliclyListed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {isPubliclyListed ? <Eye size={14} /> : <EyeOff size={14} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Show on public listing</p>
                <p className="text-xs text-[var(--text-muted)]">Visible to patients in discovery search, if clinic listing is also on</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPubliclyListed(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPubliclyListed ? 'bg-emerald-500' : 'bg-gray-500/40'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPubliclyListed ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center" disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={isPending}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : branch ? 'Save changes' : 'Create branch'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Staff Panel ───────────────────────────────────────────────────────────────
function StaffPanel({
  branch,
  onClose,
  onUpdate,
}: {
  branch: Branch;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState('');

  const { data: staffData } = useQuery({
    queryKey: ['all-staff'],
    queryFn: () => usersApi.listStaff({ role: 'all' }).then(r => r.data?.data ?? r.data ?? []),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => branchesApi.assignStaff(branch.id, userId),
    onSuccess: onUpdate,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => branchesApi.removeStaff(branch.id, userId),
    onSuccess: onUpdate,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const allStaff: User[] = Array.isArray(staffData) ? staffData : (staffData?.data || []);
  const assignedIds      = new Set(branch.staff?.map(s => s.id) || []);
  const filtered         = allStaff.filter(u =>
    `${u.firstName} ${u.lastName} ${u.role}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Manage Staff</h2>
            <p className="text-xs text-[var(--text-muted)]">{branch.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={15} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…" className="input w-full" style={{ paddingLeft: '2.1rem' }} />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No staff found</p>
            ) : filtered.map((u: User) => {
              const isAssigned = assignedIds.has(u.id);
              return (
                <div key={u.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-600/15 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {u.role === 'dentist' ? 'Dr. ' : ''}{u.firstName} {u.lastName}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] capitalize">{u.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => isAssigned ? removeMutation.mutate(u.id) : assignMutation.mutate(u.id)}
                    disabled={assignMutation.isPending || removeMutation.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      isAssigned ? 'text-red-400 hover:bg-red-400/10' : 'text-brand-400 hover:bg-brand-400/10'
                    }`}
                    style={{ border: `1px solid ${isAssigned ? 'rgba(239,68,68,0.2)' : 'rgba(14,157,232,0.2)'}` }}>
                    {isAssigned ? <><UserMinus size={11} /> Remove</> : <><UserPlus size={11} /> Assign</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function BranchesPageInner() {
  const [showCreate, setShowCreate]               = useState(false);
  const [editBranch, setEditBranch]               = useState<Branch | null>(null);
  const [staffBranch, setStaffBranch]             = useState<Branch | null>(null);
  const [statsBranch, setStatsBranch]             = useState<Branch | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const { setBranches } = useAuthStore();
  const { can }         = usePermissions();
  const { plan, maxBranches } = useFeatureAccess();
  const qc      = useQueryClient();
  const isAdmin = can('branch.manage');

  const { data, isLoading, refetch: refetchBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    // Keep branch statuses fresh — an admin quota change on another page won't
    // invalidate this cache automatically, so poll and refetch on focus.
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  // Quota status — backend source of truth
  const { data: quotaStatus, refetch: refetchQuota } = useQuery({
    queryKey: ['branch-quota-status'],
    queryFn: () => branchesApi.getQuotaStatus().then(r => r.data),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const rawBranches: Branch[] = Array.isArray(data) ? data : (data?.data || []);

  const quota                  = quotaStatus?.quota ?? (maxBranches === Infinity ? 9999 : maxBranches);
  const activeBranches         = rawBranches.filter(b => (b as any).status === 'active' || (b.isActive && !(b as any).isLocked));
  const inactiveBranches       = rawBranches.filter(b => (b as any).status === 'inactive');
  const pendingBranches        = rawBranches.filter(b => (b as any).status === 'pending_selection');
  const overActiveQuota        = quotaStatus?.overActiveQuota ?? false;
  const requiresSelection      = quotaStatus?.requiresDowngradeSelection ?? false;
  const pendingSelection       = quotaStatus?.pendingSelection ?? null;

  // When quota-status detects a quota change (admin upgraded/downgraded the plan
  // from the admin panel), immediately re-fetch the branch list so branch statuses
  // (active/inactive/pending) reflect the backend's latest state.
  const prevQuotaRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (prevQuotaRef.current !== undefined && prevQuotaRef.current !== quota) {
      refetchBranches();
    }
    prevQuotaRef.current = quota;
  }, [quota, refetchBranches]);

  // Auto-show selection modal when downgrade selection is required
  useEffect(() => {
    if (requiresSelection && isAdmin && !showDowngradeModal) {
      setShowDowngradeModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresSelection, isAdmin]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.remove(id),
    onSuccess: () => { toast.success('Branch deleted'); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Cannot delete — has linked data'),
  });

  const confirmSelectionMutation = useMutation({
    mutationFn: (keepIds: string[]) => branchesApi.confirmDowngradeSelection(keepIds),
    onSuccess: () => {
      toast.success('Branch selection confirmed. Active branches updated.');
      setShowDowngradeModal(false);
      refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to confirm selection'),
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['branches'] });
    qc.invalidateQueries({ queryKey: ['branch-quota-status'] });
    branchesApi.list().then(r =>
      setBranches(Array.isArray(r.data) ? r.data : r.data?.data || [])
    );
  }, [qc, setBranches]);

  const handleAddBranch = () => {
    if (maxBranches !== Infinity && rawBranches.length >= quota) {
      toast.error(`Your plan allows ${quota} branch${quota !== 1 ? 'es' : ''}. Upgrade to add more.`);
      return;
    }
    setShowCreate(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Branches"
        action={isAdmin ? {
          label: (maxBranches !== Infinity && rawBranches.length >= quota)
            ? planLabel(plan, quota)
            : 'New branch',
          onClick: handleAddBranch,
        } : undefined}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {/* Downgrade selection required banner */}
        {requiresSelection && pendingSelection && (
          <DowngradeSelectionBanner
            pendingSelection={pendingSelection}
            onChoose={() => setShowDowngradeModal(true)}
            isAdmin={isAdmin}
          />
        )}

        {/* Over-quota warning (legacy/edge-case) */}
        {!requiresSelection && overActiveQuota && (
          <QuotaStatusBanner
            quota={quota}
            activeBranches={activeBranches.length}
            overActiveQuota={overActiveQuota}
            onManage={() => setShowDowngradeModal(true)}
            isAdmin={isAdmin}
          />
        )}

        {/* Plan + quota info pills */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {planLabel(plan, quota)}
          </span>
          {maxBranches !== Infinity && (
            <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Info size={10} />
              {activeBranches.length} of {quota} active
            </span>
          )}
          {requiresSelection && (
            <span
              className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 text-amber-400"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Clock size={10} />
              Selection required
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Branches',    value: rawBranches.length,       color: 'text-brand-400 bg-brand-400/10' },
            { label: 'Active',            value: activeBranches.length,    color: 'text-emerald-400 bg-emerald-400/10' },
            { label: 'Inactive',          value: inactiveBranches.length,  color: 'text-gray-400 bg-gray-400/10' },
            { label: 'Pending Selection', value: pendingBranches.length,   color: 'text-amber-400 bg-amber-400/10' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Building2 size={15} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Branches grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-1/2 mb-3" />
                <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : rawBranches.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No branches yet</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
              Add branches to manage multiple clinic locations under one system.
            </p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                <Plus size={14} /> Create first branch
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {rawBranches.map((branch, i) => {
              const bStatus: BranchStatus = (branch as any).status || (branch.isActive ? 'active' : 'inactive');
              const isPending   = bStatus === 'pending_selection';
              const isInactive  = bStatus === 'inactive';
              const isReadOnly  = isPending || isInactive || (branch as any).isLocked;

              return (
                <motion.div key={branch.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card p-5 flex flex-col gap-3 transition-all ${
                    isReadOnly
                      ? 'opacity-75'
                      : 'cursor-pointer hover:ring-1 hover:ring-brand-400/30'
                  }`}
                  onClick={() => !isReadOnly && setStatsBranch(branch)}>

                  {/* Status banner */}
                  {isPending ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <Clock size={11} className="text-amber-400 shrink-0" />
                      <span className="text-amber-400 font-medium">Pending selection — read-only</span>
                      {isAdmin && (
                        <button
                          className="ml-auto text-[10px] text-brand-400 hover:text-brand-300"
                          onClick={e => { e.stopPropagation(); setShowDowngradeModal(true); }}
                        >
                          Choose now
                        </button>
                      )}
                    </div>
                  ) : isInactive ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)' }}>
                      <Lock size={11} className="text-gray-400 shrink-0" />
                      <span className="text-gray-400 font-medium">Inactive — read-only mode</span>
                      {isAdmin && activeBranches.length < quota && !requiresSelection && (
                        <button
                          className="ml-auto text-[10px] text-brand-400 hover:text-brand-300"
                          onClick={e => {
                            e.stopPropagation();
                            branchesApi.update(branch.id, { isActive: true })
                              .then(() => { toast.success('Branch activated!'); refresh(); })
                              .catch((err: any) => toast.error(err.response?.data?.message || 'Failed'));
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  ) : (branch as any).isLocked ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <Lock size={11} className="text-red-400 shrink-0" />
                      <span className="text-red-400 font-medium">Locked — upgrade to unlock</span>
                    </div>
                  ) : null}

                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        bStatus === 'active' ? 'bg-brand-600/15' : 'bg-gray-500/10'
                      }`}>
                        {bStatus === 'active'
                          ? <Building2 size={17} className="text-brand-400" />
                          : <Lock size={17} className="text-gray-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{branch.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className={`badge text-[10px] ${
                            bStatus === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isPending
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {bStatus === 'active' ? 'Active' : isPending ? 'Pending Selection' : 'Inactive'}
                          </span>
                          <span className={`badge text-[10px] flex items-center gap-1 ${
                            (branch as any).isPubliclyListed
                              ? 'bg-brand-500/10 text-brand-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {(branch as any).isPubliclyListed ? <Eye size={9} /> : <EyeOff size={9} />}
                            {(branch as any).isPubliclyListed ? 'Public' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { if (!isReadOnly) setEditBranch(branch); }}
                          disabled={isReadOnly}
                          className={`btn-ghost w-9 h-9 sm:w-10 sm:h-10 p-0 justify-center rounded-xl ${isReadOnly ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title={isReadOnly ? 'Branch is read-only' : 'Edit branch'}>
                          <Pencil size={15} className="sm:hidden" />
                          <Pencil size={16} className="hidden sm:block" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${branch.name}"? This cannot be undone.`))
                              deleteMutation.mutate(branch.id);
                          }}
                          className="btn-ghost w-9 h-9 sm:w-10 sm:h-10 p-0 justify-center rounded-xl text-red-400 hover:bg-red-400/10"
                          title="Delete branch">
                          <Trash2 size={15} className="sm:hidden" />
                          <Trash2 size={16} className="hidden sm:block" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5">
                    {branch.address && (
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <MapPin size={11} className="text-[var(--text-muted)] shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </p>
                    )}
                    {branch.phone && (
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <Phone size={11} className="text-[var(--text-muted)] shrink-0" />{branch.phone}
                      </p>
                    )}
                    {branch.email && (
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <Mail size={11} className="text-[var(--text-muted)] shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Staff footer */}
                  <div className="flex items-center justify-between pt-2"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Users size={12} />
                      <span>{branch.staff?.length || 0} staff assigned</span>
                    </div>
                    {isAdmin && bStatus === 'active' && (
                      <button
                        onClick={e => { e.stopPropagation(); setStaffBranch(branch); }}
                        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                        <UserPlus size={12} /> Manage staff
                      </button>
                    )}
                  </div>

                  {/* Staff avatars */}
                  {(branch.staff?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {(branch.staff || []).slice(0, 5).map(s => (
                        <div key={s.id}
                          title={`${s.firstName} ${s.lastName}`}
                          className="w-6 h-6 rounded-full bg-brand-600/20 flex items-center justify-center text-[9px] font-bold text-brand-400 ring-1 ring-[var(--bg-surface)]">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                      ))}
                      {(branch.staff?.length || 0) > 5 && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          +{(branch.staff?.length || 0) - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {bStatus === 'active' && (
                    <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-1">
                      <BarChart2 size={9} /> Click to view statistics
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(showCreate || editBranch) && (
          <BranchModal
            branch={editBranch || undefined}
            onClose={() => { setShowCreate(false); setEditBranch(null); }}
            onSuccess={() => { setShowCreate(false); setEditBranch(null); refresh(); }}
          />
        )}
        {staffBranch && (
          <StaffPanel
            branch={staffBranch}
            onClose={() => setStaffBranch(null)}
            onUpdate={() => {
              refresh();
              branchesApi.get(staffBranch.id).then(r => setStaffBranch(r.data));
            }}
          />
        )}
        {statsBranch && (
          <BranchStatsModal branch={statsBranch} onClose={() => setStatsBranch(null)} />
        )}
        {showDowngradeModal && (
          <DowngradeSelectionModal
            branches={rawBranches}
            maxKeep={pendingSelection?.newQuota ?? quota}
            pendingSelection={pendingSelection}
            onConfirm={keepIds => confirmSelectionMutation.mutate(keepIds)}
            onClose={() => setShowDowngradeModal(false)}
            isPending={confirmSelectionMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BranchesPage() {
  return <BranchesPageInner />;
}