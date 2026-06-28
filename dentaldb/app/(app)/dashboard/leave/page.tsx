'use client';
import FeatureGate from '@/components/layout/FeatureGate';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Loader2, CheckCircle, XCircle, Clock,
  CalendarOff, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { leaveApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';

const applySchema = z.object({
  leaveType: z.enum(['sick', 'casual', 'annual', 'unpaid', 'other']),
  startDate: z.string().min(1, 'Required'),
  endDate:   z.string().min(1, 'Required'),
  reason:    z.string().optional(),
}).refine(d => d.endDate >= d.startDate, { message: 'End date must be after start date', path: ['endDate'] });
type ApplyData = z.infer<typeof applySchema>;

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',       icon: Clock },
  approved:  { label: 'Approved',  color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: 'text-red-400 bg-red-400/10 border-red-400/20',             icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20',          icon: XCircle },
};

const LEAVE_TYPES = [
  { value: 'sick',   label: '🤒 Sick Leave'   },
  { value: 'casual', label: '🏖️ Casual Leave'  },
  { value: 'annual', label: '📅 Annual Leave'  },
  { value: 'unpaid', label: '💸 Unpaid Leave'  },
  { value: 'other',  label: '📝 Other'         },
];

// ── Apply Modal ──────────────────────────────────────────────────────────────
function ApplyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ApplyData>({
    resolver: zodResolver(applySchema),
    defaultValues: { leaveType: 'casual' },
  });

  const mutation = useMutation({
    mutationFn: (data: ApplyData) => leaveApi.apply(data),
    onSuccess: () => {
      toast.success('Leave application submitted');
      qc.invalidateQueries({ queryKey: ['leave-list'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to apply'),
  });

  return (
    <motion.div
      className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Apply for Leave</h2>
            <p className="text-xs text-[var(--text-muted)]">Submit your leave request</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="label">Leave Type *</label>
            <select {...register('leaveType')} className="input w-full">
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input {...register('startDate')} type="date" className="input w-full" />
              {errors.startDate && <p className="mt-1 text-xs text-red-400">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input {...register('endDate')} type="date" className="input w-full" />
              {errors.endDate && <p className="mt-1 text-xs text-red-400">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea {...register('reason')} rows={3} className="input w-full resize-none"
              placeholder="Optional: describe your reason for leave…" />
          </div>
          <div className="flex gap-3 pt-1 pb-safe">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Submit'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Approval Modal ───────────────────────────────────────────────────────────
function ApprovalModal({ leave, action, onClose }: { leave: any; action: 'approve' | 'reject'; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      action === 'approve' ? leaveApi.approve(leave.id, { note }) : leaveApi.reject(leave.id, { note }),
    onSuccess: () => {
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave rejected');
      qc.invalidateQueries({ queryKey: ['leave-list'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Action failed'),
  });

  const isApprove = action === 'approve';
  const days = differenceInDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isApprove ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {isApprove ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
          {isApprove ? 'Approve' : 'Reject'} Leave Request
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          <strong className="text-[var(--text-secondary)]">{leave.user?.firstName} {leave.user?.lastName}</strong> —&nbsp;
          {leave.leaveType} leave · {days} day{days !== 1 ? 's' : ''}&nbsp;
          ({format(parseISO(leave.startDate), 'MMM d')} – {format(parseISO(leave.endDate), 'MMM d')})
        </p>
        <div className="mb-4">
          <label className="label">Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="input w-full resize-none" placeholder="Add a note for the employee…" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-colors ${isApprove ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
            {mutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : isApprove ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function LeavePageInner() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const isAdmin  = can('leave.manage') && !branchLocked;
  const canApply = !branchLocked;

  const [showApply,    setShowApply]    = useState(false);
  const [approvalData, setApprovalData] = useState<{ leave: any; action: 'approve' | 'reject' } | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['leave-list', statusFilter, page],
    queryFn: () => leaveApi.list({ limit: PAGE_SIZE, page, status: statusFilter || undefined }).then(r => r.data),
  });
  const leaves: any[]  = data?.data  || [];
  const totalLeaves     = data?.total || 0;
  const totalLeavePages = Math.ceil(totalLeaves / PAGE_SIZE);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: () => { toast.success('Leave cancelled'); qc.invalidateQueries({ queryKey: ['leave-list'] }); },
    onError: () => toast.error('Failed to cancel'),
  });

  const myLeaves  = leaves.filter(l => l.userId === user?.id);
  const allLeaves = isAdmin ? leaves : myLeaves;
  const pending   = leaves.filter(l => l.status === 'pending').length;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Leave Mgmt"
        action={canApply ? { label: 'Apply for Leave', onClick: () => setShowApply(true) } : undefined}
      />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>

      <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full space-y-4 sm:space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total',    value: allLeaves.length,                                    color: 'text-[var(--text-primary)]' },
            { label: 'Pending',  value: allLeaves.filter(l => l.status === 'pending').length,  color: 'text-amber-400' },
            { label: 'Approved', value: allLeaves.filter(l => l.status === 'approved').length, color: 'text-emerald-400' },
            { label: 'Rejected', value: allLeaves.filter(l => l.status === 'rejected').length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="card p-3 sm:p-4 text-center">
              <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input text-xs py-1.5 flex-1 sm:flex-none sm:w-auto">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {pending > 0 && isAdmin && (
            <span className="text-xs px-2.5 py-1 rounded-full text-amber-400 bg-amber-400/10 shrink-0">
              {pending} pending
            </span>
          )}
        </div>

        {/* Leave list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : allLeaves.length === 0 ? (
          <div className="card p-12 sm:p-16 text-center">
            <CalendarOff size={30} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No leave applications found</p>
            {canApply && (
              <button onClick={() => setShowApply(true)} className="btn-primary mt-4 mx-auto gap-2 text-xs">
                <Plus size={14} /> Apply for Leave
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {allLeaves.map((leave: any) => {
              const cfg  = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const days = differenceInDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
              const isOwn = leave.userId === user?.id;
              const leaveTypeLabel = LEAVE_TYPES.find(t => t.value === leave.leaveType)?.label || leave.leaveType;

              return (
                <motion.div key={leave.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="card p-3 sm:p-4">

                  {/* Top row: avatar + info + status */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                      {leave.user?.firstName?.[0]}{leave.user?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isAdmin && (
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                      )}
                      <p className="text-sm font-medium text-[var(--text-primary)]">{leaveTypeLabel}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {format(parseISO(leave.startDate), 'MMM d')} – {format(parseISO(leave.endDate), 'MMM d, yyyy')}
                        <span className="mx-1">·</span>{days} day{days !== 1 ? 's' : ''}
                      </p>
                      {leave.reason && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{leave.reason}</p>
                      )}
                      {leave.approvalNote && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 italic">"{leave.approvalNote}"</p>
                      )}
                    </div>
                    {/* Status badge — top right */}
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
                      <Icon size={10} /> {cfg.label}
                    </span>
                  </div>

                  {/* Actions row */}
                  {((isAdmin && leave.status === 'pending') || (isOwn && leave.status === 'pending')) && (
                    <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      {isAdmin && leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setApprovalData({ leave, action: 'approve' })}
                            className="flex-1 text-xs py-2 rounded-lg text-emerald-400 bg-emerald-400/8 hover:bg-emerald-400/15 transition-colors font-medium">
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setApprovalData({ leave, action: 'reject' })}
                            className="flex-1 text-xs py-2 rounded-lg text-red-400 bg-red-400/8 hover:bg-red-400/15 transition-colors font-medium">
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {isOwn && leave.status === 'pending' && !isAdmin && (
                        <button
                          onClick={() => cancelMutation.mutate(leave.id)}
                          disabled={cancelMutation.isPending}
                          className="flex-1 text-xs py-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/8 transition-colors">
                          Cancel Request
                        </button>
                      )}
                      {isOwn && isAdmin && leave.status === 'pending' && (
                        <button
                          onClick={() => cancelMutation.mutate(leave.id)}
                          disabled={cancelMutation.isPending}
                          className="text-xs px-3 py-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/8 transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalLeavePages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[var(--text-muted)]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalLeaves)} of {totalLeaves}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs py-1.5 px-3 gap-1 disabled:opacity-40">
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="text-xs text-[var(--text-muted)] font-medium min-w-[50px] text-center">
                {page} / {totalLeavePages}
              </span>
              <button disabled={page >= totalLeavePages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs py-1.5 px-3 gap-1 disabled:opacity-40">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showApply && <ApplyModal onClose={() => setShowApply(false)} />}
        {approvalData && (
          <ApprovalModal
            leave={approvalData.leave}
            action={approvalData.action}
            onClose={() => setApprovalData(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LeavePage() {
  return (
    <FeatureGate feature="leave">
      <LeavePageInner />
    </FeatureGate>
  );
}