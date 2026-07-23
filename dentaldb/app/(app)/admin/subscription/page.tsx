'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, branchesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, XCircle, ChevronLeft, ChevronRight,
  Building2, Zap, RefreshCw, Bell, X, Check,
  ChevronDown, ChevronUp, Users, Phone, CreditCard,
  GitBranch, Clock, Image as ImageIcon, ExternalLink,
  Mail, Calendar, ShieldCheck, AlertTriangle, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired:   'bg-red-500/10 text-red-400 border-red-500/20',
  trial:     'bg-brand-500/10 text-brand-400 border-brand-500/20',
  none:      'bg-gray-500/10 text-gray-400 border-gray-500/20',
  pending:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const REQ_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-gray-500/10 text-gray-400',
  basic:      'bg-brand-500/10 text-brand-400',
  pro:        'bg-purple-500/10 text-purple-400',
  enterprise: 'bg-amber-500/10 text-amber-400',
};

const PLANS = ['free', 'pro', 'enterprise'];

/** Resolve a proof URL — handles relative /uploads/... paths */
function resolveProofUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Proof image lightbox ────────────────────────────────────────────────────
function ProofLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const resolved = resolveProofUrl(url);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
        >
          <X size={16} className="text-white" />
        </button>
        <img
          src={resolved}
          alt="Payment proof"
          className="w-full rounded-2xl shadow-2xl"
          onError={e => { (e.target as HTMLImageElement).src = ''; }}
        />
        <a
          href={resolved}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-black/50 px-2.5 py-1.5 rounded-lg"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={11} /> Open original
        </a>
      </div>
    </div>
  );
}

// ─── Clinic detail right panel ───────────────────────────────────────────────
function ClinicDetailPanel({ row, onClose, onManage }: {
  row: any;
  onClose: () => void;
  onManage: () => void;
}) {
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const qc = useQueryClient();

  const clinicId = row.clinic.id;

  // Fetch all requests for this clinic
  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['clinic-requests', clinicId],
    queryFn: () => adminApi.getRequests({ limit: 50 }).then(r => r.data),
  });

  // Fetch branches for this clinic using the admin subscription data (members already in row)
  // We count branches from members who have branchId set — or just show members.length + 1
  const branchCount = row.members ? row.members.length + 1 : 1; // rough estimate; use actual below
  const { data: branchData } = useQuery({
    queryKey: ['admin-clinic-branches', clinicId],
    queryFn: () =>
      fetch(`${BASE_URL}/api/v1/branches`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      })
        .then(r => r.json())
        .catch(() => []),
    staleTime: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => adminApi.approveRequest(id),
    onSuccess: () => {
      toast.success('Request approved!');
      qc.invalidateQueries({ queryKey: ['clinic-requests', clinicId] });
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['admin-requests-count'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => adminApi.rejectRequest(id, { adminNote: 'Rejected by admin' }),
    onSuccess: () => {
      toast.success('Request rejected');
      qc.invalidateQueries({ queryKey: ['clinic-requests', clinicId] });
      qc.invalidateQueries({ queryKey: ['admin-requests-count'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const clinicRequests = (reqData?.data || []).filter(
    (r: any) => r.clinic?.id === clinicId || r.clinicId === clinicId
  );

  const sub    = row.subscription;
  const status = row.subscriptionStatus;
  const owner  = row.owner;
  const members: any[] = row.members || [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        className="fixed right-0 top-0 h-screen z-50 flex flex-col w-full max-w-md"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate">{row.clinic.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{row.clinic.email || row.clinic.slug}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onManage} className="btn-primary text-xs py-1.5 px-3 gap-1.5">
              <Zap size={11} /> Manage
            </button>
            <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Current subscription status ── */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Subscription</p>
            <div className="flex items-center justify-between">
              <span className={`text-sm px-2.5 py-1 rounded-full font-semibold capitalize ${PLAN_COLORS[sub?.plan || 'free']}`}>
                {sub?.plan || 'free'} plan
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLES[status] || STATUS_STYLES.none}`}>
                {status}
              </span>
            </div>
            {sub?.currentPeriodStart && sub?.currentPeriodEnd && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Calendar size={11} />
                {format(new Date(sub.currentPeriodStart), 'MMM d, yyyy')} → {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
              </div>
            )}
            {sub?.billingCycle && (
              <p className="text-xs text-[var(--text-muted)] capitalize">Billing: {sub.billingCycle}</p>
            )}
            {(sub?.plan === 'enterprise' || sub?.plan === 'pro') && (row.clinic?.settings as any)?.numBranches && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <GitBranch size={11} />
                Branch quota: <strong className="text-[var(--text-primary)] ml-1">{(row.clinic.settings as any).numBranches}</strong>
              </div>
            )}
          </div>

          {/* ── Owner contact details ── */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Owner Contact</p>
            {owner ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center shrink-0">
                    <span className="text-brand-400 text-xs font-bold">
                      {owner.firstName?.[0]}{owner.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{owner.firstName} {owner.lastName}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{owner.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                {owner.email && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Mail size={11} className="text-[var(--text-muted)] shrink-0" />
                    <a href={`mailto:${owner.email}`} className="hover:text-brand-400 truncate">{owner.email}</a>
                  </div>
                )}
                {owner.phone && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Phone size={11} className="text-[var(--text-muted)] shrink-0" />
                    <a href={`tel:${owner.phone}`} className="hover:text-brand-400">{owner.phone}</a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No owner assigned</p>
            )}
          </div>

          {/* ── Clinic details + branch count ── */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Clinic Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-xl font-bold text-[var(--text-primary)]">{members.length + 1}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  <Users size={9} className="inline mr-1" />Total Members
                </p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-xl font-bold text-[var(--text-primary)]">{clinicRequests.length}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  <Clock size={9} className="inline mr-1" />Total Requests
                </p>
              </div>
            </div>
            {row.clinic.phone && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pt-1">
                <Phone size={11} className="text-[var(--text-muted)] shrink-0" />
                {row.clinic.phone}
              </div>
            )}
            {row.clinic.address && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Building2 size={11} className="text-[var(--text-muted)] shrink-0" />
                {row.clinic.address}
              </div>
            )}
          </div>

          {/* ── Staff members ── */}
          {members.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Staff ({members.length})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2.5 py-1">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <span className="text-[9px] text-[var(--text-muted)] font-bold">
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-secondary)] truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] capitalize shrink-0 px-1.5 py-0.5 rounded-md"
                      style={{ background: 'var(--bg-surface)' }}>
                      {m.role?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Payment request history ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              Payment Request History
            </p>

            {reqLoading ? (
              <div className="space-y-2">
                {[1,2].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                ))}
              </div>
            ) : clinicRequests.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Clock size={20} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
                <p className="text-xs text-[var(--text-muted)]">No requests yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clinicRequests.map((req: any) => (
                  <div key={req.id} className="rounded-xl p-3.5 space-y-2.5"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>

                    {/* Request header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PLAN_COLORS[req.requestedPlan] || 'bg-gray-500/10 text-gray-400'}`}>
                          {req.requestedPlan}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] capitalize">{req.type}</span>
                        <span className="text-xs text-[var(--text-muted)]">· {req.billingCycle}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border capitalize shrink-0 ${REQ_STATUS_STYLES[req.status] || REQ_STATUS_STYLES.pending}`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Payment method + contact */}
                    {req.paymentMethod && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <CreditCard size={10} />
                        <span className="capitalize">via {req.paymentMethod}</span>
                        {req.contactNumber && (
                          <>
                            <span>·</span>
                            <Phone size={10} />
                            <span>{req.contactNumber}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Branch count for enterprise requests */}
                    {req.numBranches && (req.requestedPlan === 'enterprise' || req.requestedPlan === 'pro') && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <GitBranch size={10} />
                        <span>Requested branches: <strong className="text-[var(--text-primary)]">{req.numBranches}</strong></span>
                      </div>
                    )}

                    {/* Date */}
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {req.createdAt ? format(new Date(req.createdAt), 'MMM dd, yyyy · h:mm a') : ''}
                    </p>

                    {/* Payment proof screenshot */}
                    {req.paymentProofUrl && (
                      <div>
                        <button
                          onClick={() => setProofUrl(req.paymentProofUrl)}
                          className="w-full relative group overflow-hidden rounded-lg"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          <img
                            src={resolveProofUrl(req.paymentProofUrl)}
                            alt="Payment proof"
                            className="w-full max-h-32 object-cover group-hover:opacity-80 transition-opacity"
                            onError={e => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = 'none';
                              t.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden flex items-center justify-center gap-2 py-4 text-xs text-[var(--text-muted)]">
                            <ImageIcon size={14} /> Could not load image
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <span className="text-white text-xs font-medium flex items-center gap-1.5">
                              <ExternalLink size={12} /> View full image
                            </span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Admin note */}
                    {req.adminNote && (
                      <p className="text-[10px] text-[var(--text-muted)] italic">Admin note: {req.adminNote}</p>
                    )}

                    {/* Approve / reject actions for pending */}
                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={() => rejectMut.mutate(req.id)}
                          disabled={rejectMut.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                          style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <XCircle size={11} /> Reject
                        </button>
                        <button
                          onClick={() => approveMut.mutate(req.id)}
                          disabled={approveMut.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          style={{ border: '1px solid rgba(52,211,153,0.2)' }}
                        >
                          <Check size={11} /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Proof lightbox */}
      <AnimatePresence>
        {proofUrl && <ProofLightbox url={proofUrl} onClose={() => setProofUrl(null)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Update subscription modal ───────────────────────────────────────────────
function UpdateSubModal({ clinic, onClose }: { clinic: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [plan, setPlan]               = useState(clinic.subscription?.plan || 'pro');
  const [cycle, setCycle]             = useState(clinic.subscription?.billingCycle || 'monthly');
  const [duration, setDuration]       = useState<number | ''>(1);
  const [numBranches, setNumBranches] = useState<number | ''>(() => (clinic.clinic?.settings as any)?.numBranches ?? 1);

  // Custom expiry — lets admin override the auto-calculated period end date.
  // Defaults to the current subscription's expiry so it's pre-populated for quick edits.
  const defaultExpiry = clinic.subscription?.currentPeriodEnd
    ? format(new Date(clinic.subscription.currentPeriodEnd), "yyyy-MM-dd'T'HH:mm")
    : '';
  const [useCustomExpiry, setUseCustomExpiry] = useState(false);
  const [customExpiry, setCustomExpiry]       = useState(defaultExpiry);

  const mut = useMutation({
    mutationFn: () => adminApi.updateSubscription(clinic.clinic.id, {
      plan,
      billingCycle: cycle,
      durationMonths: Number(duration) || 1,
      ...((plan === 'enterprise' || plan === 'pro') ? { numBranches: Number(numBranches) || 1 } : {}),
      ...(useCustomExpiry && customExpiry ? { customPeriodEnd: new Date(customExpiry).toISOString() } : {}),
    }),
    onSuccess: () => {
      toast.success(`Subscription updated for ${clinic.clinic.name}`);
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update'),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Update Subscription</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0 justify-center"><X size={14} /></button>
        </div>

        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
          <Building2 size={14} className="text-brand-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{clinic.clinic.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{clinic.owner?.email || 'No owner'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {PLANS.map(p => (
                <button key={p} onClick={() => setPlan(p)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium capitalize transition-all ${plan === p ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  style={{ border: `1px solid ${plan === p ? 'transparent' : 'var(--border)'}` }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Billing Cycle</label>
            <div className="grid grid-cols-2 gap-2">
              {['monthly', 'yearly'].map(c => (
                <button key={c} onClick={() => { setCycle(c); setDuration(c === 'yearly' ? 12 : 1); }}
                  className={`py-2 px-3 rounded-xl text-sm font-medium capitalize transition-all ${cycle === c ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  style={{ border: `1px solid ${cycle === c ? 'transparent' : 'var(--border)'}` }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Duration — only shown when custom expiry is NOT active */}
          {!useCustomExpiry && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Duration (months)</label>
              <input type="number" min={1} max={60} value={duration}
                onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="input w-full text-sm" />
            </div>
          )}

          {/* Custom expiry date toggle */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setUseCustomExpiry(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/5"
              style={{ background: useCustomExpiry ? 'rgba(14,157,232,0.06)' : 'var(--bg-elevated)' }}
            >
              <div className="flex items-center gap-2">
                <Calendar size={13} className={useCustomExpiry ? 'text-brand-400' : 'text-[var(--text-muted)]'} />
                <span className={`text-xs font-medium ${useCustomExpiry ? 'text-brand-400' : 'text-[var(--text-muted)]'}`}>
                  Set custom expiry date
                </span>
              </div>
              <div className={`w-8 h-4 rounded-full transition-colors relative ${useCustomExpiry ? 'bg-brand-500' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${useCustomExpiry ? 'left-4' : 'left-0.5'}`} />
              </div>
            </button>
            {useCustomExpiry && (
              <div className="px-3 pb-3 pt-2" style={{ background: 'var(--bg-elevated)' }}>
                <input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={e => setCustomExpiry(e.target.value)}
                  className="input w-full text-sm"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  Overrides the duration field. Use this to set an exact expiry, force-expire a plan now, or extend an existing one.
                </p>
              </div>
            )}
          </div>

          {(plan === 'enterprise' || plan === 'pro') && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Number of Branches ({plan === 'enterprise' ? 'Enterprise' : 'Pro'})
              </label>
              <input type="number" min={1} max={100} value={numBranches}
                onChange={e => setNumBranches(e.target.value === '' ? '' : Number(e.target.value))}
                className="input w-full text-sm" />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {plan === 'pro'
                  ? `NPR 1,500 base + ${(Number(numBranches) || 1) - 1} × NPR 500 = NPR ${(1500 + ((Number(numBranches) || 1) - 1) * 500).toLocaleString()}/mo`
                  : `NPR 2,500 base + ${(Number(numBranches) || 1) - 1} × NPR 500 = NPR ${(2500 + ((Number(numBranches) || 1) - 1) * 500).toLocaleString()}/mo`}
                {' '}· excess branches become read-only automatically.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="btn-primary flex-1 justify-center text-sm gap-2">
            {mut.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
            Activate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Global requests panel ───────────────────────────────────────────────────
function RequestsPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: () => adminApi.getRequests({ limit: 50 }).then(r => r.data),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => adminApi.approveRequest(id),
    onSuccess: () => {
      toast.success('Request approved!');
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['admin-requests-count'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => adminApi.rejectRequest(id, { adminNote: 'Rejected by admin' }),
    onSuccess: () => {
      toast.success('Request rejected');
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-requests-count'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const requests = data?.data || [];
  const pending  = requests.filter((r: any) => r.status === 'pending');

  return (
    <>
      <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}>
        <div className="w-full max-w-lg rounded-2xl max-h-[80vh] flex flex-col"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between p-5 pb-3"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-orange-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">Subscription Requests</h2>
              {pending.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold">
                  {pending.length}
                </span>
              )}
            </div>
            <button onClick={onClose} className="btn-ghost w-7 h-7 p-0 justify-center"><X size={14} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">No requests yet</div>
            ) : requests.map((req: any) => (
              <div key={req.id} className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{req.clinic?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {req.user?.firstName} {req.user?.lastName} · {req.user?.email}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize shrink-0 ${REQ_STATUS_STYLES[req.status] || REQ_STATUS_STYLES.pending}`}>
                    {req.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full capitalize font-medium ${PLAN_COLORS[req.requestedPlan] || 'bg-gray-500/10 text-gray-400'}`}>
                    {req.requestedPlan}
                  </span>
                  <span className="text-[var(--text-muted)] capitalize">{req.type}</span>
                  <span className="text-[var(--text-muted)]">{req.billingCycle}</span>
                  {req.numBranches && (req.requestedPlan === 'enterprise' || req.requestedPlan === 'pro') && (
                    <span className="flex items-center gap-1 text-brand-400 font-medium">
                      <GitBranch size={10} /> {req.numBranches} branches
                    </span>
                  )}
                  {req.paymentMethod && (
                    <span className="text-[var(--text-muted)] capitalize">via {req.paymentMethod}</span>
                  )}
                  <span className="ml-auto text-[var(--text-muted)]">
                    {req.createdAt ? format(new Date(req.createdAt), 'MMM dd') : ''}
                  </span>
                </div>

                {/* Manual payment details */}
                {(req.contactNumber || req.paymentProofUrl) && (
                  <div className="text-xs p-2 rounded-lg space-y-2" style={{ background: 'var(--bg-surface)' }}>
                    {req.contactNumber && (
                      <p className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <Phone size={10} /> {req.contactNumber}
                      </p>
                    )}
                    {req.paymentProofUrl && (
                      <button
                        onClick={() => setProofUrl(req.paymentProofUrl)}
                        className="w-full relative group overflow-hidden rounded-lg"
                        style={{ border: '1px solid var(--border)' }}
                      >
                        <img
                          src={resolveProofUrl(req.paymentProofUrl)}
                          alt="Payment proof"
                          className="w-full max-h-28 object-cover group-hover:opacity-80 transition-opacity"
                          onError={e => {
                            const t = e.target as HTMLImageElement;
                            t.style.display = 'none';
                            t.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden flex items-center justify-center gap-2 py-3 text-xs text-[var(--text-muted)]">
                          <ImageIcon size={13} /> Could not load image · <a href={resolveProofUrl(req.paymentProofUrl)} target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">open link</a>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                          <span className="text-white text-xs font-medium">Click to enlarge</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => rejectMut.mutate(req.id)} disabled={rejectMut.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                      style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                      <XCircle size={12} /> Reject
                    </button>
                    <button onClick={() => approveMut.mutate(req.id)} disabled={approveMut.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                      style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
                      <Check size={12} /> Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {proofUrl && <ProofLightbox url={proofUrl} onClose={() => setProofUrl(null)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Clinic table row ────────────────────────────────────────────────────────
function ClinicRow({ row, onSelect, onDelete }: { row: any; onSelect: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const sub    = row.subscription;
  const status = row.subscriptionStatus;
  const members: any[] = row.members || [];

  return (
    <tr
      onClick={onSelect}
      className="cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-brand-400" />
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)] text-sm">{row.clinic.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.clinic.email || row.clinic.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {row.owner ? (
          <div>
            <p className="text-sm text-[var(--text-primary)]">{row.owner.firstName} {row.owner.lastName}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.owner.email}</p>
          </div>
        ) : <span className="text-xs text-[var(--text-muted)]">No owner</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[sub?.plan || 'free']}`}>
          {sub?.plan || 'free'}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {sub?.currentPeriodStart && sub?.currentPeriodEnd ? (
          <div className="text-xs">
            <p className="text-[var(--text-secondary)]">{format(new Date(sub.currentPeriodStart), 'MMM dd, yyyy')}</p>
            <p className="text-[var(--text-muted)]">→ {format(new Date(sub.currentPeriodEnd), 'MMM dd, yyyy')}</p>
          </div>
        ) : <span className="text-xs text-[var(--text-muted)]">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLES[status] || STATUS_STYLES.none}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Users size={11} />
          <span>{members.length + 1}</span>
          <ChevronRight size={11} className="ml-1 opacity-40" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Delete clinic"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function AdminSubscriptionPage() {
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(1);
  const [selectedRow, setSelected]       = useState<any>(null);
  const [editClinic, setEditClinic]       = useState<any>(null);
  const [showRequests, setShowReqs]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<any>(null);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', search, statusFilter, page],
    queryFn: () => adminApi.getSubscriptions({ search, status: statusFilter || undefined, page, limit }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  }) as { data: any; isLoading: boolean };

  const deleteClinicMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteClinic(id),
    onSuccess: () => {
      toast.success('Clinic deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete clinic'),
  });

  const { data: reqData } = useQuery({
    queryKey: ['admin-requests-count'],
    queryFn: () => adminApi.getRequests({ limit: 100 }).then(r => r.data),
    refetchInterval: 15_000,
  });
  const pendingCount = (reqData?.data || []).filter((r: any) => r.status === 'pending').length;

  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Subscription Management</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">Click any clinic to view details</p>
        </div>
        <button onClick={() => setShowReqs(true)} className="btn-secondary gap-1.5 text-xs sm:text-sm relative shrink-0">
          <Bell size={13} />
          Requests
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search clinic or email…" className="input pl-8 w-full text-sm" />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input text-sm w-full sm:w-40">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="trial">Trial</option>
          <option value="none">No Sub</option>
        </select>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        {total} clinic{total !== 1 ? 's' : ''} total
        {pendingCount > 0 && <span className="ml-2 text-orange-400">· {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span>}
      </p>

      {/* Desktop Table */}
      <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide hidden md:table-cell">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide hidden lg:table-cell">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Members</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-elevated)', width: '100px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)] text-sm">
                    No clinics found
                  </td>
                </tr>
              ) : rows.map((row: any) => (
                <ClinicRow
                  key={row.clinic.id}
                  row={row}
                  onSelect={() => setSelected(row)}
                  onDelete={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages} · {total} clinics</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost w-8 h-8 p-0 justify-center disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-ghost w-8 h-8 p-0 justify-center disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', height: 90 }} />
        )) : rows.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No clinics found</p>
          </div>
        ) : rows.map((row: any) => {
          const sub = row.subscription;
          const status = row.subscriptionStatus;
          const members: any[] = row.members || [];
          return (
            <button key={row.clinic.id} onClick={() => setSelected(row)}
              className="w-full text-left rounded-2xl p-4 hover:border-brand-500/30 transition-colors"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                    <Building2 size={13} className="text-brand-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)] text-sm truncate">{row.clinic.name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{row.owner?.firstName} {row.owner?.lastName}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[sub?.plan || 'free']}`}>
                  {sub?.plan || 'free'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLES[status] || STATUS_STYLES.none}`}>
                  {status}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <Users size={9} />{members.length + 1} members
                </span>
              </div>
            </button>
          );
        })}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Clinic Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">Delete Clinic</h3>
            <p className="text-sm text-[var(--text-muted)] text-center mb-2">
              Permanently delete <strong className="text-[var(--text-primary)]">{deleteTarget.clinic.name}</strong>?
            </p>
            <p className="text-xs text-red-400 text-center mb-5">This will also delete all users, subscriptions, and data for this clinic. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteClinicMutation.isPending} className="flex-1 btn-ghost py-2 text-sm">Cancel</button>
              <button onClick={() => deleteClinicMutation.mutate(deleteTarget.clinic.id)} disabled={deleteClinicMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleteClinicMutation.isPending ? 'Deleting…' : 'Delete Clinic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedRow && (
          <ClinicDetailPanel
            key={selectedRow.clinic.id}
            row={selectedRow}
            onClose={() => setSelected(null)}
            onManage={() => { setEditClinic(selectedRow); }}
          />
        )}
      </AnimatePresence>

      {editClinic && <UpdateSubModal clinic={editClinic} onClose={() => setEditClinic(null)} />}
      {showRequests && <RequestsPanel onClose={() => setShowReqs(false)} />}
    </div>
  );
}