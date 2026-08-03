'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Clock, CreditCard, Save, Check, Lock,
  ChevronDown, Zap, AlertCircle, Loader2, GitBranch,
  RefreshCw, Calendar, Info, Percent, X, Code, Copy,
  Eye, EyeOff, KeyRound, Trash2, ShieldCheck, AlertTriangle,
  Plus, RotateCcw, CheckCircle2, Upload, Phone, QrCode,
  CircleDollarSign,
  Wallet,
  Landmark,
  FileText,
  Receipt,
  CloudCog,
  ImagePlus,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clinicsApi, subscriptionsApi, paymentsApi, apiKeysApi, adminApi, api } from '@/lib/api';
import PrescriptionTemplateTab from '@/components/prescriptions/PrescriptionTemplateTab';
import BillingTemplateTab from '@/components/billing/BillingTemplateTab';
import SyncSettingsTab from '@/components/system/SyncSettingsTab';
import WatchedFolderSettingsTab from '@/components/system/WatchedFolderSettingsTab';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import type { WorkingHours } from '@/types';

const ADMIN_ROLES = new Set(['super_admin', 'owner']);
const TABS = ['Clinic Profile', 'Working Hours', 'VAT Settings', 'Subscription', 'API Access', 'Prescription', 'Billing', 'Sync', 'Photo Sync'] as const;
type Tab = typeof TABS[number];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PLANS = [
  {
    id: 'free', name: 'Free Trial', priceMonthly: 0, priceYearly: 0,
    badge: '14 days', yearlyNote: '',
    features: ['All features unlocked', 'Dashboard, Appointments, Patients', 'Billing, Analytics, Staff', 'Settings, SMS Reminders', 'Notifications', '14-day trial — no renewal'],
    restrictions: ['Expires after 14 days, no renewal'],
    color: 'border-gray-500/30', badgeColor: 'bg-gray-500/10 text-gray-400',
  },
  {
    id: 'pro', name: 'Pro', priceMonthly: 800, priceYearly: 8800,
    badge: 'Popular', yearlyNote: '1 month free', popular: true,
    features: ['Dashboard & Appointments', 'Patients & Billing', 'Analytics & Staff', 'Attendance & Leave', 'Settings, SMS Reminders', 'Notifications', 'NPR 800/mo for 1 branch', '+ NPR 500/mo per extra branch'],
    restrictions: ['No Website Builder', 'No API Access'],
    color: 'border-brand-500/30', badgeColor: 'bg-brand-500/10 text-brand-400',
  },
  {
    id: 'enterprise', name: 'Enterprise', priceMonthly: 1200, priceYearly: 13200,
    badge: 'website-builder', yearlyNote: '1 month free',
    features: ['Everything in Pro', 'NPR 1,200/mo for 1 branch', '+ NPR 500/mo per extra branch', 'Website builder', 'API Access', 'Priority support'],
    restrictions: [],
    color: 'border-amber-500/30', badgeColor: 'bg-amber-500/10 text-amber-400',
  },
];

const TAB_ICONS: Record<Tab, any> = {
  'Clinic Profile': Building2,
  'Working Hours': Clock,
  'VAT Settings': Percent,
  'Subscription': CreditCard,
  'API Access': Code,
  'Prescription': FileText,
  'Billing': Receipt,
  'Sync': CloudCog,
  'Photo Sync': ImagePlus,
};

// ── Subscription upgrade modal — eSewa / Khalti / Manual ─────────────────────
const PRO_BASE = 800;
const ENTERPRISE_BASE = 1200;
const PER_BR = 500;

function calcProMonthly(n: number) { return PRO_BASE + (Math.max(1, n) - 1) * PER_BR; }
function calcProYearly(n: number) { return calcProMonthly(n) * 11; }
function calcEnterpriseMonthly(n: number) { return ENTERPRISE_BASE + (Math.max(1, n) - 1) * PER_BR; }
function calcEnterpriseYearly(n: number) { return calcEnterpriseMonthly(n) * 11; }

function UpgradeModal({ plan, onClose, onSuccess }: {
  plan: typeof PLANS[number];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [gateway, setGateway] = useState<'esewa' | 'khalti' | 'manual'>('esewa');
  const [numBranches, setNumBranches] = useState(1); // enterprise only
  const [loading, setLoading] = useState(false);
  // Manual-payment state
  const [contactNo, setContactNo] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { setClinic } = useAuthStore();
  const isEnterprisePlan = plan.id === 'enterprise';
  const isBranchPricedPlan = plan.id === 'pro' || plan.id === 'enterprise';
  const price = plan.id === 'enterprise'
    ? (cycle === 'yearly' ? calcEnterpriseYearly(numBranches) : calcEnterpriseMonthly(numBranches))
    : plan.id === 'pro'
      ? (cycle === 'yearly' ? calcProYearly(numBranches) : calcProMonthly(numBranches))
      : (cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly);
  const isFree = price === 0;

  // Handle proof file selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProofFile(f);
    const reader = new FileReader();
    reader.onload = ev => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const requestMut = useMutation({
    mutationFn: (extra?: { contactNumber?: string; paymentProofUrl?: string }) =>
      adminApi.createRequest({
        requestedPlan: plan.id,
        billingCycle: cycle,
        type: 'activation',
        paymentMethod: gateway,
        contactNumber: extra?.contactNumber,
        paymentProofUrl: extra?.paymentProofUrl,
        numBranches: isBranchPricedPlan ? numBranches : undefined,
      }),
    onSuccess: () => {
      toast.success('Request submitted! Admin will review shortly.');
      qc.invalidateQueries({ queryKey: ['my-sub-requests'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Request failed'),
  });

  const handlePay = async () => {
    if (isFree) {
      // Free trial — direct upgrade
      setLoading(true);
      try {
        await subscriptionsApi.upgrade({ plan: plan.id, billingCycle: cycle });
        toast.success('Free trial activated!');
        try { const r = await clinicsApi.getCurrent(); setClinic(r.data); } catch { }
        qc.invalidateQueries({ queryKey: ['subscription-status'] });
        onSuccess();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Activation failed');
      } finally { setLoading(false); }
      return;
    }

    if (gateway === 'esewa') {
      setLoading(true);
      try {
        const r = await paymentsApi.initEsewa({ amount: price, purpose: 'subscription', planId: plan.id, billingCycle: cycle, numBranches: isBranchPricedPlan ? numBranches : undefined });
        const { formUrl, params } = r.data;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = formUrl || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
        Object.entries(params).forEach(([k, v]) => {
          const inp = document.createElement('input'); inp.type = 'hidden'; inp.name = k; inp.value = String(v);
          form.appendChild(inp);
        });
        document.body.appendChild(form); form.submit();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'eSewa initiation failed');
        setLoading(false);
      }
      return;
    }

    if (gateway === 'khalti') {
      setLoading(true);
      try {
        const r = await paymentsApi.initKhalti({ amount: price * 100, purpose: 'subscription', planId: plan.id, billingCycle: cycle, productName: `ClinicKarobar ${plan.name}`, numBranches: isBranchPricedPlan ? numBranches : undefined });
        window.location.href = r.data.payment_url;
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Khalti initiation failed');
        setLoading(false);
      }
      return;
    }

    if (gateway === 'manual') {
      if (!contactNo.trim()) { toast.error('Please enter your contact number'); return; }
      if (!proofFile) { toast.error('Please upload your payment screenshot'); return; }

      setUploading(true);
      try {
        // Upload screenshot
        const fd = new FormData();
        fd.append('file', proofFile);
        const uploadRes = await api.post('/files/payment-proof', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const proofUrl = uploadRes.data?.url || uploadRes.data?.path || '';
        requestMut.mutate({ contactNumber: contactNo.trim(), paymentProofUrl: proofUrl });
      } catch {
        // If upload endpoint isn't ready yet, still submit the request without proof URL
        requestMut.mutate({ contactNumber: contactNo.trim() });
      } finally {
        setUploading(false);
      }
    }
  };

  const busy = loading || uploading || requestMut.isPending;

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Upgrade to {plan.name}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Choose your billing cycle and payment method</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Branch count selector — shown for Pro and Enterprise */}
          {isBranchPricedPlan && (
            <div>
              <p className="label mb-2">Number of Branches</p>
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNumBranches(n => Math.max(1, n - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold hover:bg-white/10 transition-colors"
                      style={{ border: '1px solid var(--border)' }}
                    >−</button>
                    <span className="text-xl font-bold text-[var(--text-primary)] w-8 text-center">{numBranches}</span>
                    <button
                      onClick={() => setNumBranches(n => n + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold hover:bg-white/10 transition-colors"
                      style={{ border: '1px solid var(--border)' }}
                    >+</button>
                    <span className="text-sm text-[var(--text-muted)]">branch{numBranches !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">
                      NPR {(isEnterprisePlan ? ENTERPRISE_BASE : PRO_BASE).toLocaleString()} base
                    </p>
                    {numBranches > 1 && (
                      <p className="text-xs text-[var(--text-muted)]">+ {numBranches - 1} × NPR {PER_BR.toLocaleString()}</p>
                    )}
                    <p className="text-sm font-bold text-brand-400">
                      = NPR {(isEnterprisePlan ? calcEnterpriseMonthly(numBranches) : calcProMonthly(numBranches)).toLocaleString()}/mo
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n} onClick={() => setNumBranches(n)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${numBranches === n ? 'bg-brand-600 text-white' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}
                      style={{ border: `1px solid ${numBranches === n ? 'transparent' : 'var(--border)'}` }}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  1 branch included · each extra +NPR {PER_BR.toLocaleString()}/mo · excess branches become read-only if quota reduced
                </p>
              </div>
            </div>
          )}

          {/* Billing cycle */}
          <div>
            <p className="label mb-2">Billing Cycle</p>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'yearly'] as const).map(c => {
                const p = plan.id === 'enterprise'
                  ? (c === 'yearly' ? calcEnterpriseYearly(numBranches) : calcEnterpriseMonthly(numBranches))
                  : plan.id === 'pro'
                    ? (c === 'yearly' ? calcProYearly(numBranches) : calcProMonthly(numBranches))
                    : (c === 'yearly' ? plan.priceYearly : plan.priceMonthly);
                return (
                  <button key={c} onClick={() => setCycle(c)}
                    className={`p-3 rounded-xl text-sm font-medium text-left transition-all ${cycle === c ? 'border-brand-500/60 bg-brand-500/10 text-brand-400' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                    style={{ border: `1px solid ${cycle === c ? 'rgba(14,157,232,0.4)' : 'var(--border)'}` }}>
                    <div className="capitalize font-semibold">{c}</div>
                    <div className="text-xs mt-0.5 opacity-80">
                      {p === 0 ? 'Free' : `NPR ${p.toLocaleString()}`}
                      {c === 'yearly' && !isEnterprisePlan && plan.yearlyNote && <span className="ml-1 text-emerald-400 text-[10px]">({plan.yearlyNote})</span>}
                      {c === 'yearly' && isEnterprisePlan && <span className="ml-1 text-emerald-400 text-[10px]">(1 month free)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment method (not for free) */}
          {!isFree && (
            <div>
              <p className="label mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  // { id: 'esewa',  icon: CircleDollarSign, label: 'eSewa'  },
                  // { id: 'khalti', icon: Wallet, label: 'Khalti' },
                  { id: 'manual', icon: Landmark, label: 'Manual' },
                ].map(gw => {
                  const Icon = gw.icon;

                  return (
                    <button
                      key={gw.id}
                      onClick={() => setGateway(gw.id as any)}
                      className={`p-3 rounded-xl text-sm flex flex-col items-center gap-1.5 transition-all ${gateway === gw.id
                          ? 'border-brand-500/60 bg-brand-500/10 text-brand-400'
                          : 'text-[var(--text-secondary)] hover:bg-white/5'
                        }`}
                      style={{
                        border: `1px solid ${gateway === gw.id
                            ? 'rgba(14,157,232,0.4)'
                            : 'var(--border)'
                          }`,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{gw.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* eSewa hint */}
              {gateway === 'esewa' && (
                <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                  Sandbox: ID 9806800001 · Pass: Nepal@123 · MPIN: 1122
                </p>
              )}
              {/* Khalti hint */}
              {gateway === 'khalti' && (
                <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                  Sandbox: Phone 9800000000 · MPIN: 1111 · OTP: 987654
                </p>
              )}

              {/* Manual payment form */}
              {gateway === 'manual' && (
                <div className="mt-4 space-y-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <QrCode size={14} className="text-brand-400" /> Manual Payment Instructions
                  </p>

                  {/* QR code placeholder */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-36 h-36 rounded-xl flex items-center justify-center"
                      style={{ border: '2px solid var(--border)', background: 'var(--bg-surface)' }}>
                      {/* QR code — replace src with your actual QR image */}
                      <div className="text-center">
                        {/* <QrCode size={64} className="text-[var(--text-muted)] mx-auto mb-1 opacity-40" /> */}
                        <img
                          src="/qr.jpeg"
                          alt="QR Code"
                          className="w-20 h-20 mx-auto mb-1 opacity-80"
                        />
                        <p className="text-[10px] text-[var(--text-muted)]">Scan to pay</p>
                      </div>
                    </div>
                    <div className="text-center text-xs text-[var(--text-secondary)]">
                      <p className="font-semibold text-[var(--text-primary)]">ClinicKarobar Pvt. Ltd.</p>
                      <p className="text-[var(--text-muted)]">eSewa / Khalti: 9860269554</p>
                      <p className="text-[var(--text-muted)]">Bank: Siddartha Bank · A/C: Jeshan Maharjan</p>
                    </div>
                  </div>

                  {/* Contact number */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                      Your Contact Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="tel"
                        value={contactNo}
                        onChange={e => setContactNo(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="input w-full text-sm pl-20"
                      />
                    </div>
                  </div>

                  {/* Screenshot upload */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                      Payment Screenshot <span className="text-red-400">*</span>
                    </label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    {proofPreview ? (
                      <div className="relative">
                        <img src={proofPreview} alt="Proof" className="w-full max-h-40 object-contain rounded-xl" style={{ border: '1px solid var(--border)' }} />
                        <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
                          <X size={11} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 py-5 rounded-xl transition-colors hover:bg-white/5"
                        style={{ border: '2px dashed var(--border)' }}>
                        <Upload size={20} className="text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]">Click to upload payment screenshot</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary box */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--text-secondary)]">Plan</span>
              <span className="font-semibold text-[var(--text-primary)]">{plan.name}</span>
            </div>
            {isBranchPricedPlan && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Branches</span>
                <span className="font-semibold text-[var(--text-primary)]">{numBranches} branch{numBranches !== 1 ? 'es' : ''}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--text-secondary)]">Cycle</span>
              <span className="font-semibold text-[var(--text-primary)] capitalize">{cycle}</span>
            </div>
            {!isFree && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Method</span>
                <span className="font-semibold text-[var(--text-primary)] capitalize">{gateway}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-[var(--text-primary)]">Total</span>
              <span className="text-brand-400 text-lg">{isFree ? 'Free' : `NPR ${price.toLocaleString()}`}</span>
            </div>
          </div>

          {/* Action button */}
          <button onClick={handlePay} disabled={busy}
            className="btn-primary w-full justify-center py-3 text-sm gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {isFree
              ? 'Activate Free Trial'
              : gateway === 'esewa'
                ? `Pay NPR ${price.toLocaleString()} via eSewa`
                : gateway === 'khalti'
                  ? `Pay NPR ${price.toLocaleString()} via Khalti`
                  : 'Request Upgrade'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Legacy request modal for renewal/activation requests ─────────────────────
function RequestModal({ plan, requestType, onClose, onSuccess }: {
  plan: typeof PLANS[number];
  requestType: 'activation' | 'renewal' | 'upgrade' | 'pay';
  onClose: () => void;
  onSuccess: () => void;
}) {
  if (requestType === 'pay' || requestType === 'upgrade') {
    return <UpgradeModal plan={plan} onClose={onClose} onSuccess={onSuccess} />;
  }

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const qc = useQueryClient();
  const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

  const requestMut = useMutation({
    mutationFn: () => adminApi.createRequest({
      requestedPlan: plan.id,
      billingCycle: cycle,
      type: requestType,
      paymentMethod: 'manual',
    }),
    onSuccess: () => {
      toast.success('Request submitted! Admin will review shortly.');
      qc.invalidateQueries({ queryKey: ['my-sub-requests'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Request failed'),
  });

  const titleMap: Record<string, string> = {
    activation: `Request Activation — ${plan.name}`,
    renewal: `Request Renewal — ${plan.name}`,
  };

  return (
    <motion.div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{titleMap[requestType]}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Admin will review and activate your subscription</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="label mb-2">Billing Cycle</p>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'yearly'] as const).map(c => {
                const p = c === 'yearly' ? plan.priceYearly : plan.priceMonthly;
                return (
                  <button key={c} onClick={() => setCycle(c)}
                    className={`p-3 rounded-xl text-sm font-medium text-left transition-all ${cycle === c ? 'border-brand-500/60 bg-brand-500/10 text-brand-400' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                    style={{ border: `1px solid ${cycle === c ? 'rgba(14,157,232,0.4)' : 'var(--border)'}` }}>
                    <div className="capitalize font-semibold">{c}</div>
                    <div className="text-xs mt-0.5">{p === 0 ? 'Free' : `NPR ${p.toLocaleString()}`}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-[var(--text-primary)]">Total</span>
              <span className="text-brand-400 text-lg">{price === 0 ? 'Free' : `NPR ${price.toLocaleString()}`}</span>
            </div>
          </div>
          <button onClick={() => requestMut.mutate()} disabled={requestMut.isPending}
            className="btn-primary w-full justify-center py-3 text-sm gap-2">
            {requestMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            Submit Request
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SubscriptionStatusCard({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { setClinic } = useAuthStore();

  const { data: subData, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionsApi.getCurrent().then(r => r.data),
    refetchInterval: 30_000,
  });

  const renewMutation = useMutation({
    mutationFn: () => subscriptionsApi.renew(),
    onSuccess: async () => {
      toast.success('Subscription renewed!');
      try { const r = await clinicsApi.getCurrent(); setClinic(r.data); } catch { }
      qc.invalidateQueries({ queryKey: ['subscription-status'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Renewal failed'),
  });

  if (isLoading) return <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />;
  if (!subData) return null;

  const isExpired = subData.isLocked;
  const plan = subData.plan || 'free';
  const endDate = subData.currentPeriodEnd;
  const cycle = subData.billingCycle;
  const trialEnd = subData.trialEndsAt;
  const isTrial = plan === 'free' && trialEnd;
  const daysLeft = endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className={`p-4 rounded-xl ${isExpired ? 'bg-red-500/5' : 'bg-brand-500/5'}`}
      style={{ border: `1px solid ${isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(14,157,232,0.15)'}` }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <CreditCard size={14} className={isExpired ? 'text-red-400' : 'text-brand-400'} />
            <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{plan} Plan</p>
            {cycle && <span className="badge text-[10px] bg-white/5 text-[var(--text-muted)] capitalize">{cycle}</span>}
            {isTrial && !isExpired && <span className="badge text-[10px] bg-amber-500/10 text-amber-400">Trial</span>}
            {isExpired && <span className="badge text-[10px] bg-red-500/10 text-red-400">Expired</span>}
          </div>
          {isTrial && trialDaysLeft !== null && !isExpired && (
            <p className="text-xs text-amber-400">
              <Calendar size={10} className="inline mr-1" />
              Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} · {format(new Date(trialEnd!), 'MMM d, yyyy')}
            </p>
          )}
          {endDate && !isTrial && (
            <p className={`text-xs ${isExpired ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
              <Calendar size={10} className="inline mr-1" />
              {isExpired ? `Expired on ${format(new Date(endDate), 'MMM d, yyyy')}` : `Renews ${format(new Date(endDate), 'MMM d, yyyy')} · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
            </p>
          )}
        </div>
        {isAdmin && isExpired && plan !== 'free' && (
          <button onClick={() => renewMutation.mutate()} disabled={renewMutation.isPending} className="btn-primary text-xs py-1.5 px-3 gap-1.5">
            {renewMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Renew Now
          </button>
        )}
      </div>
    </div>
  );
}

function LogoUploader({ clinic, onUploaded }: { clinic: any; onUploaded: (logo: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const res = await clinicsApi.uploadLogo(file);
      onUploaded(res.data.logo);
      toast.success('Logo uploaded!');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const logoSrc = clinic?.logo
    ? (clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`)
    : null;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Clinic Logo</p>
      <p className="text-xs text-[var(--text-muted)]">
        Shown on invoices when "Show clinic logo" is enabled in the Billing Template settings.
      </p>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {logoSrc
            ? <img src={logoSrc} alt="Clinic logo" className="w-full h-full object-contain p-1" />
            : <span className="text-[10px] text-[var(--text-muted)] text-center px-2">No logo</span>
          }
        </div>
        <div className="space-y-2">
          <label className={`btn-ghost cursor-pointer gap-2 text-sm inline-flex items-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : logoSrc ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <p className="text-[10px] text-[var(--text-muted)]">PNG, JPG or SVG · Max 5MB</p>
        </div>
      </div>
    </div>
  );
}

function VatSettingsTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { clinic, setClinic } = useAuthStore();
  const currentVat = (clinic as any)?.settings?.vatPercent ?? 0;
  const [vatValue, setVatValue] = useState<string>(String(currentVat));

  const vatMutation = useMutation({
    mutationFn: (vatPercent: number) =>
      clinicsApi.update({ settings: { ...((clinic as any)?.settings || {}), vatPercent } }),
    onSuccess: (res) => {
      setClinic(res.data);
      qc.invalidateQueries({ queryKey: ['clinic-me'] });
      toast.success('VAT setting saved! Will apply to all new invoices.');
    },
    onError: () => toast.error('Failed to save VAT setting'),
  });

  const handleSave = () => {
    const num = parseFloat(vatValue);
    if (isNaN(num) || num < 0 || num > 100) { toast.error('VAT must be between 0 and 100'); return; }
    vatMutation.mutate(num);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">VAT / Tax Settings</h3>
        <p className="text-sm text-[var(--text-muted)]">Set a global VAT percentage that auto-fills on all new invoices</p>
      </div>
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
        style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
        <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
        <p className="text-[var(--text-secondary)]">
          This VAT % will be automatically applied when creating new invoices in the <span className="text-brand-400 font-medium">Billing</span> section. You can still override it per invoice.
        </p>
      </div>
      <div className="card p-5 space-y-4">
        <div>
          <label className="label mb-2">Global VAT Percentage</label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[200px]">
              <input type="number" min={0} max={100} step={0.01} value={vatValue}
                onChange={e => setVatValue(e.target.value)} disabled={!isAdmin}
                className="input w-full pr-8" placeholder="e.g. 13" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">%</span>
            </div>
            {isAdmin && (
              <button onClick={handleSave} disabled={vatMutation.isPending} className="btn-primary gap-2">
                {vatMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
              <Lock size={11} /> Only admins can change VAT settings
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs text-[var(--text-muted)] mb-1">Current VAT rate</p>
          <p className="text-2xl font-bold text-brand-400">{currentVat}%</p>
          {currentVat > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              On NPR 10,000 invoice → VAT: NPR {(10000 * currentVat / 100).toLocaleString()} → Total: NPR {(10000 * (1 + currentVat / 100)).toLocaleString()}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] font-medium mb-2">Common rates in Nepal</p>
          <div className="flex flex-wrap gap-2">
            {[{ v: 0, label: '0% (Exempt)' }, { v: 13, label: '13% (Standard)' }, { v: 15, label: '15% (Medical)' }].map(({ v, label }) => (
              <button key={v} onClick={() => { if (isAdmin) setVatValue(String(v)); }} disabled={!isAdmin}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${parseFloat(vatValue) === v ? 'bg-brand-600 text-white' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                style={{ border: '1px solid var(--border)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Access Tab (Enterprise only)
// ─────────────────────────────────────────────────────────────────────────────

function ApiAccessTab({ isAdmin, clinicPlan }: { isAdmin: boolean; clinicPlan?: string }) {
  const qc = useQueryClient();
  const isEnterprise = clinicPlan === 'enterprise';

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyIps, setNewKeyIps] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['api-key-stats'],
    queryFn: () => apiKeysApi.getStats().then(r => r.data),
    enabled: isEnterprise,
  });

  const { data: keys = [], isLoading } = useQuery<any[]>({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.list().then(r => r.data),
    enabled: isEnterprise,
  });

  const createMutation = useMutation({
    mutationFn: () => apiKeysApi.create({
      name: newKeyName.trim(),
      allowedIps: newKeyIps.trim() || undefined,
      expiresAt: newKeyExpiry || undefined,
    }),
    onSuccess: (res) => {
      setRevealedKey(res.data.rawKey);
      setShowCreate(false);
      setNewKeyName(''); setNewKeyIps(''); setNewKeyExpiry('');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      qc.invalidateQueries({ queryKey: ['api-key-stats'] });
      toast.success('API key created');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      qc.invalidateQueries({ queryKey: ['api-key-stats'] });
      toast.success('API key revoked');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to revoke'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.remove(id),
    onSuccess: () => {
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      qc.invalidateQueries({ queryKey: ['api-key-stats'] });
      toast.success('API key deleted');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const fmtDate = (d: string | null) =>
    d ? format(new Date(d), 'MMM d, yyyy') : '—';

  // ── Non-enterprise gate ──────────────────────────────────────────────────
  if (!isEnterprise) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">API Access</h3>
          <p className="text-sm text-[var(--text-muted)]">Integrate ClinicKarobar with your own systems via REST API</p>
        </div>
        <div className="rounded-2xl p-8 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(14,157,232,0.08)', border: '1px solid rgba(14,157,232,0.2)' }}>
            <Code size={24} className="text-brand-400" />
          </div>
          <h4 className="font-bold text-[var(--text-primary)] text-base mb-2">Enterprise Feature</h4>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-6 leading-relaxed">
            API access is available exclusively on the <strong className="text-[var(--text-primary)]">Enterprise plan</strong>.
            Upgrade to create API keys, integrate with third-party systems, and automate workflows.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto mb-6">
            {[
              { icon: KeyRound, title: 'Secure API Keys', desc: 'SHA-256 hashed, revocable' },
              { icon: ShieldCheck, title: 'IP Allowlisting', desc: 'Restrict key by IP/CIDR' },
              { icon: Code, title: 'REST API Access', desc: 'Patients, appointments, billing' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-3 rounded-xl text-left" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Icon size={14} className="text-brand-400 mb-2" />
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Go to the <strong>Subscription</strong> tab to upgrade to Enterprise (NPR 10,000/mo).
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Enterprise view ──────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">API Access</h3>
          <p className="text-sm text-[var(--text-muted)]">Manage API keys for external integrations</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(v => !v)} className="btn-primary gap-2 text-sm py-2 px-4 shrink-0">
            <Plus size={14} /> New API Key
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 p-3.5 rounded-xl text-xs"
        style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
        <ShieldCheck size={13} className="text-brand-400 shrink-0" />
        <p className="text-[var(--text-secondary)]">
          Use API keys to authenticate as your clinic from external systems.
          Pass the key as <code className="bg-white/10 px-1 rounded text-brand-300">Authorization: Bearer &lt;key&gt;</code> or{' '}
          <code className="bg-white/10 px-1 rounded text-brand-300">X-API-Key: &lt;key&gt;</code>.{' '}
          Keys are shown <strong className="text-[var(--text-primary)]">once</strong> on creation — store them securely.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Keys', value: stats.total, color: 'text-[var(--text-primary)]' },
            { label: 'Active', value: stats.active, color: 'text-emerald-400' },
            { label: 'Revoked', value: stats.revoked, color: 'text-red-400' },
            { label: 'Total Requests', value: stats.totalRequests, color: 'text-brand-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value?.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revealed key banner (shown once after creation) */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-400">Your new API key — copy it now!</p>
              </div>
              <button onClick={() => setRevealedKey(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} /></button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">This key will <strong className="text-[var(--text-primary)]">not</strong> be shown again. Store it in a secure vault.</p>
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <code className="flex-1 text-xs text-emerald-300 break-all font-mono">{revealedKey}</code>
              <button onClick={() => copyToClipboard(revealedKey, 'new')}
                className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: copiedId === 'new' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', color: copiedId === 'new' ? '#10b981' : 'var(--text-muted)' }}>
                {copiedId === 'new' ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === 'new' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Create New API Key</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label mb-1.5 block">Key Name <span className="text-red-400">*</span></label>
                  <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production, Mobile App"
                    className="input w-full text-sm h-9" maxLength={60} />
                </div>
                <div>
                  <label className="label mb-1.5 block">Expiry Date <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                  <input type="date" value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)}
                    className="input w-full text-sm h-9" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label mb-1.5 block">
                    IP Allowlist <span className="text-[var(--text-muted)] font-normal">(optional — comma-separated IPs or CIDRs)</span>
                  </label>
                  <input value={newKeyIps} onChange={e => setNewKeyIps(e.target.value)}
                    placeholder="e.g. 203.0.113.5, 192.168.1.0/24"
                    className="input w-full text-sm h-9" />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => { setShowCreate(false); setNewKeyName(''); setNewKeyIps(''); setNewKeyExpiry(''); }}
                  className="btn-ghost text-sm px-4 py-2">Cancel</button>
                <button onClick={() => createMutation.mutate()}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  className="btn-primary text-sm px-4 py-2 gap-2">
                  {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                  Generate Key
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <KeyRound size={28} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">No API keys yet</p>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-brand-400 hover:underline">
              Create your first key
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key: any) => {
            const isActive = key.status === 'active';
            const isExpired = key.expiresAt && new Date() > new Date(key.expiresAt);
            const statusColor = isExpired ? 'text-amber-400 bg-amber-400/10' : isActive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10';
            const statusLabel = isExpired ? 'Expired' : isActive ? 'Active' : 'Revoked';

            return (
              <motion.div key={key.id} layout
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="card p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm text-[var(--text-primary)]">{key.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <code className="text-xs text-[var(--text-muted)] font-mono bg-white/5 px-2 py-0.5 rounded">
                        {key.keyPrefix}••••••••••••••••••••••••
                      </code>
                      <button onClick={() => copyToClipboard(key.keyPrefix, key.id + '-prefix')}
                        className="text-[var(--text-muted)] hover:text-brand-400 transition-colors">
                        {copiedId === key.id + '-prefix' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]">
                      <span>Created {fmtDate(key.createdAt)}</span>
                      {key.expiresAt && <span className={isExpired ? 'text-amber-400' : ''}>Expires {fmtDate(key.expiresAt)}</span>}
                      {key.lastUsedAt && <span>Last used {fmtDate(key.lastUsedAt)}</span>}
                      <span>{(key.requestCount || 0).toLocaleString()} requests</span>
                      {key.allowedIps && <span>IPs: {key.allowedIps}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0 mt-1 sm:mt-0">
                      {isActive && !isExpired && (
                        <button onClick={() => revokeMutation.mutate(key.id)}
                          disabled={revokeMutation.isPending}
                          title="Revoke key"
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-amber-400 hover:bg-amber-400/10"
                          style={{ border: '1px solid rgba(251,191,36,0.3)' }}>
                          {revokeMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                          <span className="hidden xs:inline">Revoke</span>
                        </button>
                      )}
                      {deleteConfirm === key.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-red-400">Sure?</span>
                          <button onClick={() => deleteMutation.mutate(key.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded-lg hover:bg-red-400/10 transition-colors">
                            {deleteMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Yes'}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-[var(--text-muted)] px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(key.id)}
                          title="Delete key"
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-400/10"
                          style={{ border: '1px solid rgba(248,113,113,0.3)' }}>
                          <Trash2 size={11} />
                          <span className="hidden xs:inline">Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* API Reference — grouped by resource */}
      <ApiReferencePanel />

      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--text-muted)] space-y-1">
          <p className="font-semibold text-[var(--text-secondary)]">Security reminders</p>
          <p>• Never commit API keys to source control or share them in chat/email.</p>
          <p>• Revoke keys immediately if they are compromised.</p>
          <p>• Use IP allowlisting to restrict keys to trusted server IPs.</p>
          <p>• Set expiry dates for keys used in short-lived integrations.</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── API Reference Panel ──────────────────────────────────────────────────────
function ApiReferencePanel() {
  const [activeGroup, setActiveGroup] = useState('patients');
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const BASE = 'https://api.clinickarobar.com/api/v1';

  const methodColors: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    POST: 'text-blue-400   bg-blue-400/10   border-blue-400/20',
    PATCH: 'text-amber-400  bg-amber-400/10  border-amber-400/20',
    DELETE: 'text-red-400    bg-red-400/10    border-red-400/20',
    PUT: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  };

  type Endpoint = {
    method: string;
    path: string;
    desc: string;
    body?: string;
    response?: string;
    params?: string;
  };

  type Group = {
    label: string;
    icon: string;
    endpoints: Endpoint[];
  };

  const groups: Record<string, Group> = {
    patients: {
      label: 'Patients', icon: '👤',
      endpoints: [
        {
          method: 'GET', path: '/patients', desc: 'List patients', params: '?page=1&limit=20&search=ram&branchId=UUID',
          response: `{ "data": [{ "id": "uuid", "name": "Ramesh Sharma", "phone": "9841234567", "email": "ram@example.com", "dateOfBirth": "1990-05-12", "createdAt": "2024-01-15T10:00:00Z" }], "total": 284, "page": 1, "limit": 20 }`
        },
        {
          method: 'POST', path: '/patients', desc: 'Create patient',
          body: `{ "name": "Sita Thapa", "phone": "9867654321", "email": "sita@example.com", "dateOfBirth": "1995-08-20", "address": "Thamel, Kathmandu", "bloodGroup": "A+", "notes": "Allergic to penicillin" }`,
          response: `{ "id": "uuid-new", "name": "Sita Thapa", "phone": "9867654321", "createdAt": "2024-03-01T09:00:00Z" }`
        },
        {
          method: 'GET', path: '/patients/:id', desc: 'Get patient by ID',
          response: `{ "id": "uuid", "name": "Ramesh Sharma", "phone": "9841234567", "medicalHistory": "...", "appointments": [], "invoices": [] }`
        },
        {
          method: 'PATCH', path: '/patients/:id', desc: 'Update patient',
          body: `{ "phone": "9841111111", "address": "New Baneshwor, Kathmandu" }`,
          response: `{ "id": "uuid", "name": "Ramesh Sharma", "phone": "9841111111", "updatedAt": "2024-03-05T11:00:00Z" }`
        },
        {
          method: 'DELETE', path: '/patients/:id', desc: 'Delete patient',
          response: `{ "message": "Patient deleted successfully" }`
        },
      ],
    },
    appointments: {
      label: 'Appointments', icon: '📅',
      endpoints: [
        {
          method: 'GET', path: '/appointments', desc: 'List appointments', params: '?date=2024-03-01&status=scheduled&doctorId=UUID&branchId=UUID&page=1',
          response: `{ "data": [{ "id": "uuid", "scheduledAt": "2024-03-01T09:00:00Z", "status": "scheduled", "type": "consultation", "patientId": "uuid", "durationMinutes": 30 }], "total": 24 }`
        },
        {
          method: 'POST', path: '/appointments', desc: 'Create appointment',
          body: `{ "patientId": "uuid", "scheduledAt": "2024-03-10T10:30:00Z", "type": "consultation", "durationMinutes": 30, "doctorId": "uuid", "branchId": "uuid", "notes": "Follow-up visit" }`,
          response: `{ "id": "uuid-new", "scheduledAt": "2024-03-10T10:30:00Z", "status": "scheduled" }`
        },
        {
          method: 'GET', path: '/appointments/:id', desc: 'Get appointment',
          response: `{ "id": "uuid", "scheduledAt": "2024-03-10T10:30:00Z", "status": "scheduled", "patient": { "id": "uuid", "name": "Ramesh Sharma" }, "notes": "Follow-up" }`
        },
        {
          method: 'PATCH', path: '/appointments/:id', desc: 'Update / reschedule',
          body: `{ "scheduledAt": "2024-03-11T11:00:00Z", "status": "confirmed", "notes": "Rescheduled by patient" }`,
          response: `{ "id": "uuid", "scheduledAt": "2024-03-11T11:00:00Z", "status": "confirmed" }`
        },
        {
          method: 'DELETE', path: '/appointments/:id', desc: 'Cancel appointment',
          response: `{ "message": "Appointment cancelled" }`
        },
      ],
    },
    billing: {
      label: 'Billing', icon: '💳',
      endpoints: [
        {
          method: 'GET', path: '/billing/invoices', desc: 'List invoices', params: '?status=paid&from=2024-01-01&to=2024-03-31&page=1',
          response: `{ "data": [{ "id": "uuid", "invoiceNumber": "INV-001", "totalAmount": 2500, "status": "paid", "createdAt": "2024-01-15T10:00:00Z" }], "total": 142 }`
        },
        {
          method: 'POST', path: '/billing/invoices', desc: 'Create invoice',
          body: `{ "patientId": "uuid", "items": [{ "description": "Root Canal Treatment", "quantity": 1, "unitPrice": 8000 }, { "description": "X-Ray", "quantity": 2, "unitPrice": 500 }], "vatPercent": 13, "discount": 0, "paymentMethod": "esewa" }`,
          response: `{ "id": "uuid-new", "invoiceNumber": "INV-043", "totalAmount": 10165, "vatAmount": 1165, "status": "pending" }`
        },
        {
          method: 'GET', path: '/billing/invoices/:id', desc: 'Get invoice',
          response: `{ "id": "uuid", "invoiceNumber": "INV-001", "patient": { "name": "Ramesh Sharma" }, "items": [], "totalAmount": 2500, "status": "paid" }`
        },
        {
          method: 'PATCH', path: '/billing/invoices/:id', desc: 'Update invoice status',
          body: `{ "status": "paid", "paymentMethod": "khalti", "paidAt": "2024-03-05T12:00:00Z" }`,
          response: `{ "id": "uuid", "status": "paid", "paidAt": "2024-03-05T12:00:00Z" }`
        },
        {
          method: 'GET', path: '/billing/invoices/:id/pdf', desc: 'Download invoice PDF',
          response: `Binary PDF stream — set Accept: application/pdf`
        },
      ],
    },
    staff: {
      label: 'Staff', icon: '🩺',
      endpoints: [
        {
          method: 'GET', path: '/staff', desc: 'List staff members', params: '?role=doctor&branchId=UUID',
          response: `{ "data": [{ "id": "uuid", "name": "Dr. Anita KC", "role": "doctor", "email": "anita@clinic.com", "isActive": true }], "total": 8 }`
        },
        {
          method: 'GET', path: '/staff/:id', desc: 'Get staff member',
          response: `{ "id": "uuid", "name": "Dr. Anita KC", "role": "doctor", "schedule": {}, "leaves": [] }`
        },
        {
          method: 'GET', path: '/attendance', desc: 'List attendance', params: '?staffId=UUID&from=2024-03-01&to=2024-03-31',
          response: `{ "data": [{ "id": "uuid", "staffId": "uuid", "date": "2024-03-01", "checkIn": "09:02", "checkOut": "17:15" }] }`
        },
        {
          method: 'GET', path: '/leave', desc: 'List leave requests', params: '?staffId=UUID&status=pending',
          response: `{ "data": [{ "id": "uuid", "staffId": "uuid", "startDate": "2024-03-10", "endDate": "2024-03-12", "reason": "Sick leave", "status": "pending" }] }`
        },
        {
          method: 'PATCH', path: '/leave/:id', desc: 'Approve / reject leave',
          body: `{ "status": "approved", "note": "Approved by admin" }`,
          response: `{ "id": "uuid", "status": "approved" }`
        },
      ],
    },
    shifts: {
      label: 'Shifts', icon: '🕐',
      endpoints: [
        {
          method: 'GET', path: '/shifts', desc: 'List shifts', params: '?staffId=UUID&from=2024-03-01&to=2024-03-31&branchId=UUID',
          response: `{ "data": [{ "id": "uuid", "staffId": "uuid", "staffName": "Dr. Anita KC", "branchId": "uuid", "date": "2024-03-01", "startTime": "09:00", "endTime": "17:00", "type": "morning", "status": "scheduled" }], "total": 22 }`
        },
        {
          method: 'POST', path: '/shifts', desc: 'Create shift',
          body: `{ "staffId": "uuid", "branchId": "uuid", "date": "2024-03-10", "startTime": "09:00", "endTime": "17:00", "type": "morning", "notes": "Cover for leave" }`,
          response: `{ "id": "uuid-new", "staffId": "uuid", "date": "2024-03-10", "startTime": "09:00", "endTime": "17:00", "status": "scheduled" }`
        },
        {
          method: 'GET', path: '/shifts/:id', desc: 'Get shift by ID',
          response: `{ "id": "uuid", "staffId": "uuid", "staffName": "Dr. Anita KC", "date": "2024-03-10", "startTime": "09:00", "endTime": "17:00", "type": "morning", "status": "scheduled" }`
        },
        {
          method: 'PATCH', path: '/shifts/:id', desc: 'Update shift',
          body: `{ "startTime": "10:00", "endTime": "18:00", "status": "confirmed" }`,
          response: `{ "id": "uuid", "startTime": "10:00", "endTime": "18:00", "status": "confirmed" }`
        },
        {
          method: 'DELETE', path: '/shifts/:id', desc: 'Delete shift',
          response: `{ "message": "Shift deleted successfully" }`
        },
      ],
    },
    attendance: {
      label: 'Attendance', icon: '🗓️',
      endpoints: [
        {
          method: 'GET', path: '/attendance', desc: 'List attendance records', params: '?staffId=UUID&from=2024-03-01&to=2024-03-31&branchId=UUID',
          response: `{ "data": [{ "id": "uuid", "staffId": "uuid", "staffName": "Dr. Anita KC", "date": "2024-03-01", "checkIn": "09:02", "checkOut": "17:15", "hoursWorked": 8.2, "status": "present", "late": false }], "total": 26 }`
        },
        {
          method: 'POST', path: '/attendance', desc: 'Create attendance record',
          body: `{ "staffId": "uuid", "date": "2024-03-10", "checkIn": "09:05", "checkOut": "17:00", "notes": "Manual entry" }`,
          response: `{ "id": "uuid-new", "staffId": "uuid", "date": "2024-03-10", "checkIn": "09:05", "checkOut": "17:00", "hoursWorked": 7.9, "status": "present" }`
        },
        {
          method: 'GET', path: '/attendance/:id', desc: 'Get attendance record',
          response: `{ "id": "uuid", "staffId": "uuid", "staffName": "Dr. Anita KC", "date": "2024-03-10", "checkIn": "09:05", "checkOut": "17:00", "hoursWorked": 7.9, "status": "present", "late": true, "lateMinutes": 5 }`
        },
        {
          method: 'PATCH', path: '/attendance/:id', desc: 'Update attendance record',
          body: `{ "checkOut": "18:30", "notes": "Overtime approved" }`,
          response: `{ "id": "uuid", "checkOut": "18:30", "hoursWorked": 9.4 }`
        },
        {
          method: 'GET', path: '/attendance/summary', desc: 'Monthly summary by staff', params: '?month=2024-03&staffId=UUID',
          response: `{ "staffId": "uuid", "month": "2024-03", "totalDays": 26, "presentDays": 24, "absentDays": 1, "lateDays": 3, "totalHours": 192.5, "overtimeHours": 4.5 }`
        },
      ],
    },
    leave: {
      label: 'Leave', icon: '🏖️',
      endpoints: [
        {
          method: 'GET', path: '/leave', desc: 'List leave requests', params: '?staffId=UUID&status=pending&from=2024-03-01&to=2024-03-31',
          response: `{ "data": [{ "id": "uuid", "staffId": "uuid", "staffName": "Dr. Anita KC", "type": "sick", "startDate": "2024-03-10", "endDate": "2024-03-12", "days": 3, "reason": "Sick leave", "status": "pending", "createdAt": "2024-03-08T10:00:00Z" }], "total": 5 }`
        },
        {
          method: 'POST', path: '/leave', desc: 'Submit leave request',
          body: `{ "staffId": "uuid", "type": "annual", "startDate": "2024-03-20", "endDate": "2024-03-22", "reason": "Family event", "handoverNotes": "Appointments rescheduled" }`,
          response: `{ "id": "uuid-new", "type": "annual", "startDate": "2024-03-20", "endDate": "2024-03-22", "days": 3, "status": "pending" }`
        },
        {
          method: 'GET', path: '/leave/:id', desc: 'Get leave request',
          response: `{ "id": "uuid", "staffId": "uuid", "staffName": "Dr. Anita KC", "type": "sick", "startDate": "2024-03-10", "endDate": "2024-03-12", "days": 3, "status": "approved", "approvedBy": "uuid", "approvedAt": "2024-03-09T08:00:00Z" }`
        },
        {
          method: 'PATCH', path: '/leave/:id', desc: 'Approve / reject leave',
          body: `{ "status": "approved", "note": "Approved. Please ensure handover is complete." }`,
          response: `{ "id": "uuid", "status": "approved", "approvedBy": "uuid", "approvedAt": "2024-03-09T08:00:00Z" }`
        },
        {
          method: 'DELETE', path: '/leave/:id', desc: 'Cancel leave request',
          response: `{ "message": "Leave request cancelled" }`
        },
        {
          method: 'GET', path: '/leave/balance/:staffId', desc: 'Get leave balance for staff',
          response: `{ "staffId": "uuid", "year": 2024, "annual": { "entitled": 18, "used": 5, "remaining": 13 }, "sick": { "entitled": 12, "used": 3, "remaining": 9 }, "unpaid": { "used": 0 } }`
        },
      ],
    },
    analytics: {
      label: 'Analytics', icon: '📊',
      endpoints: [
        {
          method: 'GET', path: '/analytics/overview', desc: 'Clinic overview stats', params: '?from=2024-01-01&to=2024-03-31',
          response: `{ "totalRevenue": 284500, "totalAppointments": 312, "newPatients": 48, "returnPatients": 264, "revenueByMonth": [], "topServices": [] }`
        },
        {
          method: 'GET', path: '/analytics/appointments', desc: 'Appointment analytics', params: '?period=month',
          response: `{ "byStatus": { "scheduled": 42, "completed": 248, "cancelled": 22 }, "byType": {}, "byDoctor": [] }`
        },
        {
          method: 'GET', path: '/analytics/revenue', desc: 'Revenue breakdown', params: '?period=month&branchId=UUID',
          response: `{ "totalRevenue": 284500, "vatCollected": 32270, "byPaymentMethod": { "cash": 120000, "esewa": 98000, "khalti": 66500 }, "byMonth": [] }`
        },
      ],
    },
    branches: {
      label: 'Branches', icon: '🏥',
      endpoints: [
        {
          method: 'GET', path: '/branch', desc: 'List branches',
          response: `{ "data": [{ "id": "uuid", "name": "Main Branch", "address": "Thamel, KTM", "phone": "01-4XXXXXX", "isActive": true }] }`
        },
        {
          method: 'POST', path: '/branch', desc: 'Create branch',
          body: `{ "name": "Pokhara Branch", "address": "Lakeside, Pokhara", "phone": "061-XXXXXX", "email": "pokhara@clinic.com" }`,
          response: `{ "id": "uuid-new", "name": "Pokhara Branch", "isActive": true }`
        },
        {
          method: 'PATCH', path: '/branch/:id', desc: 'Update branch',
          body: `{ "address": "New address, Pokhara", "phone": "061-YYYYYY" }`,
          response: `{ "id": "uuid", "name": "Pokhara Branch", "address": "New address, Pokhara" }`
        },
      ],
    },
    website: {
      label: 'Website', icon: '🌐',
      endpoints: [
        {
          method: 'GET', path: '/website-builder', desc: 'Get website config',
          response: `{ "id": "uuid", "subdomain": "myclinic", "templateId": "warm", "isPublished": true, "content": {}, "theme": {} }`
        },
        {
          method: 'PATCH', path: '/website-builder', desc: 'Update website content',
          body: `{ "content": { "hero": { "headline": "Expert Dental Care", "subheadline": "Caring for your smile" } }, "isPublished": true }`,
          response: `{ "id": "uuid", "subdomain": "myclinic", "isPublished": true }`
        },
        {
          method: 'GET', path: '/website-builder/public/:subdomain/available-slots', desc: 'Public: get available slots',
          response: `{ "slotsPerDay": { "2024-03-10": ["09:00 AM","09:30 AM","10:00 AM"], "2024-03-11": ["11:00 AM","02:00 PM"] } }`
        },
        {
          method: 'POST', path: '/website-builder/public/:subdomain/book', desc: 'Public: book appointment',
          body: `{ "name": "Ramesh Sharma", "phone": "9841234567", "email": "ram@example.com", "date": "2024-03-10", "time": "09:00 AM", "notes": "First visit" }`,
          response: `{ "success": true, "appointmentId": "uuid", "scheduledAt": "2024-03-10T09:00:00Z", "message": "Appointment booked!" }`
        },
      ],
    },
  };

  const exampleCode = (group: string, ep: Endpoint): string => {
    // ✅ Remove the `url` line entirely — it was unused anyway
    const fullUrl = `${BASE}${ep.path.replace(':id', '{id}')}${ep.params ? '?' + ep.params.split('?')[1] : ''}`;
    if (ep.method === 'GET' || ep.method === 'DELETE') {
      return `// ${ep.desc}
  const res = await fetch('${fullUrl}', {
    method: '${ep.method}',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
});

const data = await res.json();
console.log(data);`;
    }
    return `// ${ep.desc}
const res = await fetch('${BASE}${ep.path.replace(':id', '{id}')}', {
  method: '${ep.method}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${ep.body}),
});

const data = await res.json();
console.log(data);`;
  };

  const activeGroupData = groups[activeGroup];

  return (
    <div className="rounded-xl overflow-hidden w-full" style={{ border: '1px solid var(--border)', maxWidth: '100%' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <Code size={13} className="text-brand-400" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">API Reference</p>
        <span className="ml-2 text-[10px] text-[var(--text-muted)] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[120px] sm:max-w-none">
          Base: {BASE}
        </span>
        <div className="ml-auto hidden xs:flex sm:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span className="text-emerald-400 font-semibold">GET</span>
          <span className="text-blue-400 font-semibold">POST</span>
          <span className="text-amber-400 font-semibold">PATCH</span>
          <span className="text-red-400 font-semibold">DELETE</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row" style={{ minHeight: '320px' }}>
        {/* Sidebar — resource groups: horizontal scroll tabs on mobile, vertical sidebar on sm+ */}
        <div
          className="shrink-0 sm:border-r border-b sm:border-b-0 overflow-x-auto sm:overflow-x-visible"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
        >
          <div className="flex sm:flex-col sm:py-2 min-w-max sm:min-w-0" style={{ width: 'auto' }}>
            {Object.entries(groups).map(([key, g]) => (
              <button key={key} onClick={() => { setActiveGroup(key); setActiveExample(null); }}
                className="flex items-center gap-2 px-3 py-2.5 sm:py-2 text-left transition-colors text-[11px] font-medium shrink-0 sm:w-32"
                style={{
                  color: activeGroup === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: activeGroup === key ? 'rgba(14,157,232,0.08)' : 'transparent',
                  borderBottom: 'var(--border)',
                  borderLeft: activeGroup === key ? '2px solid #0e9de8' : '2px solid transparent',
                }}>
                <span>{g.icon}</span>
                <span className="hidden xs:inline sm:inline">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint list */}
        <div className="flex-1 overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {activeGroupData.endpoints.map((ep, i) => {
              const id = `${activeGroup}-${i}`;
              const isOpen = activeExample === id;
              const code = exampleCode(activeGroup, ep);
              return (
                <div key={id}>
                  <button
                    onClick={() => setActiveExample(isOpen ? null : id)}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 text-left hover:bg-white/3 transition-colors group">
                    <span className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md font-mono shrink-0 border ${methodColors[ep.method] || ''}`}
                      style={{ minWidth: '44px', textAlign: 'center' }}>
                      {ep.method}
                    </span>
                    <code className="text-[10px] sm:text-xs font-mono text-[var(--text-secondary)] flex-1 text-left min-w-0 truncate">{ep.path}</code>
                    <span className="text-[11px] text-[var(--text-muted)] hidden sm:block shrink-0">{ep.desc}</span>
                    <svg className={`ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} text-[var(--text-muted)]`}
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="border-t" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                      <div className="px-3 sm:px-4 py-3 grid gap-3">
                        {/* Query params */}
                        {ep.params && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Query Parameters</p>
                            <code className="text-[11px] font-mono text-brand-300 block bg-white/5 rounded-lg px-3 py-2 border border-white/5 break-all overflow-x-auto">
                              {ep.params}
                            </code>
                          </div>
                        )}

                        {/* Body */}
                        {ep.body && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Request Body</p>
                            <pre className="text-[11px] font-mono text-slate-300 bg-white/5 rounded-lg px-3 py-2.5 border border-white/5 overflow-x-auto max-w-full">
                              {JSON.stringify(JSON.parse(ep.body), null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Response */}
                        {ep.response && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Response</p>
                            <pre className="text-[11px] font-mono text-emerald-300 bg-emerald-400/5 rounded-lg px-3 py-2.5 border border-emerald-400/10 overflow-x-auto max-w-full">
                              {ep.response.startsWith('{') ? JSON.stringify(JSON.parse(ep.response), null, 2) : ep.response}
                            </pre>
                          </div>
                        )}

                        {/* Code example */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">JavaScript Example</p>
                            <button onClick={() => copyCode(code, id)}
                              className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-brand-400 transition-colors px-2 py-0.5 rounded-md hover:bg-white/5">
                              {copied === id
                                ? <><CheckCircle2 size={10} className="text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                                : <><Copy size={10} /><span>Copy</span></>
                              }
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-slate-300 bg-[#0a0d16] rounded-lg px-3 py-3 border border-white/5 overflow-x-auto max-w-full leading-relaxed">
                            <code dangerouslySetInnerHTML={{
                              __html: code
                                .replace(/\/\/.+/g, m => `<span style="color:#4b5563">${m}</span>`)
                                .replace(/'(.*?)'/g, m => `<span style="color:#86efac">${m}</span>`)
                                .replace(/\b(const|await|fetch|method|headers|body|JSON|stringify|console|log)\b/g, m => `<span style="color:#93c5fd">${m}</span>`)
                            }} />
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 text-xs"
        style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
        <span className="text-[var(--text-muted)]">Auth header:</span>
        <code className="bg-white/10 px-2 py-0.5 rounded text-brand-300 font-mono text-[10px] border border-white/5">
          Authorization: Bearer {'<api-key>'}
        </code>
        <span className="text-[var(--text-muted)]">or</span>
        <code className="bg-white/10 px-2 py-0.5 rounded text-brand-300 font-mono text-[10px] border border-white/5">
          X-API-Key: {'<api-key>'}
        </code>
        <span className="ml-auto text-[var(--text-muted)] hidden sm:block">
          Click any endpoint to expand request/response details & code example
        </span>
      </div>
    </div>
  );
}

// ── Dynamic subscription plans grid ─────────────────────────────────────────
function SubscriptionPlansGrid({ isAdmin }: { isAdmin: boolean }) {
  const { clinic } = useAuthStore();

  const { data: subData } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionsApi.getCurrent().then(r => r.data),
    staleTime: 30_000,
  });

  const { data: myRequests } = useQuery({
    queryKey: ['my-sub-requests'],
    queryFn: () => adminApi.getMyRequests().then(r => r.data),
    staleTime: 15_000,
  });

  const [modal, setModal] = useState<{ plan: typeof PLANS[number] } | null>(null);

  const currentPlan = clinic?.plan || 'free';
  const isExpired = subData?.isLocked ?? false;
  const isActiveSub = subData && !subData.isLocked && currentPlan !== 'free';

  function getPlanAction(plan: typeof PLANS[number]): {
    label: string;
    variant: 'primary' | 'ghost' | 'active';
    type: 'activation' | 'renewal' | 'upgrade' | 'pay' | null;
  } {
    const isCurrent = currentPlan === plan.id;

    if (isCurrent && isActiveSub) return { label: 'Active', variant: 'active', type: null };
    if (isCurrent && isExpired) return { label: 'Renew', variant: 'primary', type: 'renewal' };
    if (currentPlan === 'free' && plan.id !== 'free') return { label: 'Upgrade', variant: 'primary', type: 'upgrade' };
    if (isExpired && plan.id !== 'free' && !isCurrent) return { label: 'Upgrade', variant: 'primary', type: 'upgrade' };
    if (isActiveSub && !isCurrent && plan.id !== 'free') return { label: 'Upgrade', variant: 'primary', type: 'upgrade' };
    if (plan.id === 'free') return { label: 'Start Free Trial', variant: 'ghost', type: 'pay' };

    return { label: 'Request Activation', variant: 'primary', type: 'activation' };
  }

  function hasPendingRequest(planId: string) {
    return (myRequests || []).some(
      (r: any) => r.requestedPlan === planId && r.status === 'pending',
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const action = getPlanAction(plan);
          const pending = hasPendingRequest(plan.id);

          return (
            <div key={plan.id}
              className="relative rounded-2xl p-4 sm:p-5 transition-all"
              style={{
                border: `1px solid ${isCurrent ? 'rgba(14,157,232,0.6)' : 'var(--border)'}`,
                background: isCurrent ? 'rgba(14,157,232,0.05)' : 'var(--bg-surface)',
              }}>
              {(plan as any).popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 badge bg-brand-500 text-white text-[10px] px-3 whitespace-nowrap">
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-3 right-3 badge bg-brand-500/20 text-brand-400 text-[10px]">
                  <Check size={9} className="mr-1" />
                  {isActiveSub ? 'Active' : isExpired ? 'Expired' : 'Current'}
                </span>
              )}

              <div className="flex items-start justify-between mb-1">
                <p className="font-bold text-[var(--text-primary)]">{plan.name}</p>
                {plan.badge && !isCurrent && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="mb-2">
                {plan.id === 'enterprise' ? (
                  <>
                    <p className="text-brand-400 font-semibold text-base">
                      From NPR {plan.priceMonthly.toLocaleString()}/mo
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      1 branch · +NPR 500/mo per extra branch
                    </p>
                    {isCurrent && subData?.enterprisePricing && (
                      <p className="text-[10px] text-emerald-400 mt-0.5">
                        Active: {subData.enterprisePricing.numBranches} branch{subData.enterprisePricing.numBranches !== 1 ? 'es' : ''} · NPR {subData.enterprisePricing.monthlyTotal.toLocaleString()}/mo
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-brand-400 font-semibold text-base">
                      {plan.priceMonthly === 0 ? 'Free' : `NPR ${plan.priceMonthly.toLocaleString()}/mo`}
                    </p>
                    {plan.priceYearly > 0 && plan.yearlyNote && (
                      <p className="text-[10px] text-emerald-400">
                        NPR {plan.priceYearly.toLocaleString()}/yr · {plan.yearlyNote}
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-1 mb-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Check size={10} className="text-emerald-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
                {plan.restrictions.map(r => (
                  <li key={r} className="flex items-start gap-1.5 text-xs text-[var(--text-muted)] opacity-60">
                    <X size={10} className="text-red-400 mt-0.5 shrink-0" />{r}
                  </li>
                ))}
              </ul>

              {action.variant === 'active' ? (
                <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-emerald-400">
                  <CheckCircle2 size={13} /> Active Plan
                </div>
              ) : pending ? (
                <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-orange-400"
                  style={{ border: '1px solid rgba(249,115,22,0.25)', borderRadius: '10px' }}>
                  <Clock size={13} /> Request Pending
                </div>
              ) : action.type !== null ? (
                <button
                  onClick={() => setModal({ plan })}
                  className={`w-full justify-center text-sm py-2 gap-1.5 flex items-center rounded-xl font-medium transition-all
                    ${action.variant === 'primary'
                      ? 'bg-brand-600 hover:bg-brand-500 text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  style={action.variant === 'ghost' ? { border: '1px solid var(--border)' } : {}}>
                  <Zap size={13} />
                  {action.label}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {myRequests && myRequests.length > 0 && (
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            My Requests
          </p>
          {myRequests.slice(0, 5).map((req: any) => (
            <div key={req.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="capitalize font-medium text-[var(--text-secondary)]">{req.requestedPlan}</span>
                <span className="text-[var(--text-muted)] capitalize">· {req.type}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-medium capitalize
                ${req.status === 'pending' ? 'bg-orange-500/10 text-orange-400' :
                  req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-red-500/10 text-red-400'}`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <UpgradeModal
            plan={modal.plan}
            onClose={() => setModal(null)}
            onSuccess={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Clinic Profile');
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<typeof PLANS[number] | null>(null);
  const [requestPlan, setRequestPlan] = useState<{ plan: typeof PLANS[number]; type: 'activation' | 'renewal' | 'upgrade' | 'pay' } | null>(null);
  const { clinic, setClinic, activeBranch } = useAuthStore();
  const { can } = usePermissions();
  const isAdmin = can('settings.manage');
  const qc = useQueryClient();

  // ── Handle eSewa / Khalti payment return ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const payment = sp.get('payment');
    const planId = sp.get('plan');
    const cycle = sp.get('cycle') as 'monthly' | 'yearly' | null;

    if (payment === 'success' && planId && cycle) {
      window.history.replaceState({}, '', window.location.pathname + '?tab=Subscription');
      setActiveTab('Subscription');

      // Read numBranches from URL (set by payment init redirect)
      const numBranches = parseInt(sp.get('branches') || '1', 10);

      subscriptionsApi.upgrade({ plan: planId, billingCycle: cycle, numBranches })
        .then(async () => {
          toast.success('🎉 Subscription activated! Invoice sent to your email.');
          try { const r = await clinicsApi.getCurrent(); setClinic(r.data); } catch { }
          qc.invalidateQueries({ queryKey: ['clinic-me'] });
          qc.invalidateQueries({ queryKey: ['subscription-status'] });
        })
        .catch(() => {
          toast.error('Payment received but activation failed. Please contact support.');
        });
    } else if (payment === 'failed') {
      window.history.replaceState({}, '', window.location.pathname + '?tab=Subscription');
      setActiveTab('Subscription');
      toast.error('Payment was cancelled or failed. Please try again.');
    }
  }, []);

  const { data: clinicData } = useQuery({
    queryKey: ['clinic-me'],
    queryFn: () => clinicsApi.getCurrent().then(r => { setWorkingHours(r.data.workingHours || {}); return r.data; }),
  });

  const { register, handleSubmit } = useForm({ defaultValues: clinicData || {}, values: clinicData });

  const updateMutation = useMutation({
    mutationFn: (data: any) => clinicsApi.update(data),
    onSuccess: (res) => { setClinic(res.data); toast.success('Clinic updated!'); qc.invalidateQueries({ queryKey: ['clinic-me'] }); },
    onError: () => toast.error('Failed to update'),
  });

  const hoursUpdateMutation = useMutation({
    mutationFn: () => clinicsApi.updateWorkingHours(workingHours),
    onSuccess: () => toast.success('Working hours saved!'),
    onError: () => toast.error('Failed to save hours'),
  });

  const toggleDay = (day: string) => {
    setWorkingHours(prev => {
      if (prev[day as keyof WorkingHours]) { const next = { ...prev }; delete (next as any)[day]; return next; }
      return { ...prev, [day]: { start: '09:00', end: '18:00' } };
    });
  };

  const updateHour = (day: string, field: 'start' | 'end', value: string) => {
    setWorkingHours(prev => ({ ...prev, [day]: { ...(prev[day as keyof WorkingHours] as any || {}), [field]: value } }));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Settings" />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden sm:flex w-48 xl:w-52 shrink-0 flex-col py-4 px-3" style={{ borderRight: '1px solid var(--border)' }}>
          {TABS.map(tab => {
            const Icon = TAB_ICONS[tab];
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all text-left ${activeTab === tab ? 'text-brand-400 bg-brand-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                <Icon size={15} />{tab}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {/* Mobile tab dropdown */}
          <div className="sm:hidden mb-4">
            <button onClick={() => setMobileTabOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span className="flex items-center gap-2">
                {(() => { const Icon = TAB_ICONS[activeTab]; return <Icon size={14} className="text-brand-400" />; })()}
                <span className="text-[var(--text-primary)]">{activeTab}</span>
              </span>
              <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${mobileTabOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {mobileTabOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="mt-1 rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  {TABS.map(tab => {
                    const Icon = TAB_ICONS[tab];
                    return (
                      <button key={tab} onClick={() => { setActiveTab(tab); setMobileTabOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left ${activeTab === tab ? 'text-brand-400' : 'text-[var(--text-secondary)]'}`}>
                        <Icon size={14} />{tab}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="max-w-2xl">
            {/* Clinic Profile */}
            {activeTab === 'Clinic Profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">Clinic Profile</h3>
                  <p className="text-sm text-[var(--text-muted)]">Basic information about your practice</p>
                </div>
                {activeBranch && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(14,157,232,0.06)', border: '1px solid rgba(14,157,232,0.15)' }}>
                    <div className="flex items-center gap-2">
                      <GitBranch size={13} className="text-brand-400" />
                      <p className="text-xs text-brand-400">Clinic profile applies to the whole clinic. Edit branch-specific details on the <strong>Branches</strong> page.</p>
                    </div>
                  </div>
                )}
                {/* Logo Upload */}
                <LogoUploader clinic={clinicData} onUploaded={(logo) => { setClinic({ ...(clinicData || {}), logo } as any); qc.invalidateQueries({ queryKey: ['clinic-me'] }); }} />

                <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Clinic Name</label>
                      <input {...register('name', { required: true })} className="input w-full" placeholder="Smile Dental Clinic" />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input {...register('email')} type="email" className="input w-full" placeholder="clinic@email.com" />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input {...register('phone')} type="tel" className="input w-full" placeholder="+977 01 XXXXXXX" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Address</label>
                      <input {...register('address')} className="input w-full" placeholder="Full address" />
                    </div>
                    <div>
                      <label className="label">City</label>
                      <input {...register('city')} className="input w-full" placeholder="Kathmandu" />
                    </div>
                    <div>
                      <label className="label">License Number</label>
                      <input {...register('licenseNumber')} className="input w-full" placeholder="NDA-XXXXXXXX" />
                    </div>
                    <div>
                      <label className="label">Registration Number <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                      <input {...register('registrationNumber')} className="input w-full" placeholder="e.g. 12345/067/068" />
                    </div>
                    <div>
                      <label className="label">VAT / PAN Number <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                      <input {...register('vatNumber')} className="input w-full" placeholder="e.g. 600123456" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Website</label>
                      <input {...register('website')} className="input w-full" placeholder="https://yourclinic.com" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label flex items-center gap-2">
                        <Calendar size={13} className="text-brand-400" />
                        Appointment Calendar System
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {(['BS', 'AD'] as const).map(type => {
                          const current = (clinic as any)?.settings?.calendarType || 'BS';
                          const isSelected = current === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              disabled={!isAdmin}
                              onClick={async () => {
                                if (!isAdmin) return;
                                try {
                                  const res = await clinicsApi.update({ settings: { ...((clinic as any)?.settings || {}), calendarType: type } });
                                  setClinic(res.data);
                                  toast.success(`Calendar switched to ${type === 'BS' ? 'Nepali (BS)' : 'English (AD)'}`);
                                } catch { toast.error('Failed to update calendar setting'); }
                              }}
                              className={`p-3 rounded-xl text-left transition-all ${isSelected ? 'border-brand-500/60 bg-brand-500/10' : 'hover:bg-white/5'}`}
                              style={{ border: `1px solid ${isSelected ? 'rgba(14,157,232,0.5)' : 'var(--border)'}` }}
                            >
                              <p className={`text-sm font-semibold ${isSelected ? 'text-brand-400' : 'text-[var(--text-primary)]'}`}>
                                {type === 'BS' ? '🇳🇵 Nepali BS' : '🌐 English AD'}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                {type === 'BS' ? 'Bikram Sambat calendar' : 'Gregorian calendar'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      {!isAdmin && <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1"><Lock size={11} /> Only admins can change the calendar system</p>}
                    </div>
                  </div>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                    {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Changes</>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Working Hours */}
            {activeTab === 'Working Hours' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">Working Hours</h3>
                  <p className="text-sm text-[var(--text-muted)]">Set your clinic's operating schedule{activeBranch && <span className="text-brand-400"> · {activeBranch.name}</span>}</p>
                </div>
                <div className="space-y-2">
                  {DAYS.map(day => {
                    const hours = workingHours[day as keyof WorkingHours];
                    const isOpen = !!hours;
                    return (
                      <div key={day} className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <button type="button" onClick={() => toggleDay(day)}
                          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${isOpen ? 'bg-brand-600' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isOpen ? 'left-5' : 'left-0.5'}`} />
                        </button>
                        <span className="w-20 sm:w-24 text-sm font-medium text-[var(--text-primary)] capitalize">{day}</span>
                        {isOpen ? (
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <input type="time" value={(hours as any)?.start || '09:00'} onChange={e => updateHour(day, 'start', e.target.value)} className="input text-sm" style={{ width: '120px' }} />
                            <span className="text-[var(--text-muted)] text-sm">–</span>
                            <input type="time" value={(hours as any)?.end || '18:00'} onChange={e => updateHour(day, 'end', e.target.value)} className="input text-sm" style={{ width: '120px' }} />
                          </div>
                        ) : <span className="text-sm text-[var(--text-muted)] flex-1">Closed</span>}
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => hoursUpdateMutation.mutate()} disabled={hoursUpdateMutation.isPending} className="btn-primary">
                  {hoursUpdateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Hours</>}
                </button>
              </motion.div>
            )}

            {/* VAT Settings */}
            {activeTab === 'VAT Settings' && <VatSettingsTab isAdmin={isAdmin} />}

            {/* Subscription */}
            {activeTab === 'Subscription' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">ClinicKarobar Subscription</h3>
                  <p className="text-sm text-[var(--text-muted)]">Manage your ClinicKarobar platform subscription</p>
                </div>
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                  style={{ background: 'rgba(14,157,232,0.05)', border: '1px solid rgba(14,157,232,0.15)' }}>
                  <Info size={13} className="text-brand-400 shrink-0 mt-0.5" />
                  <p className="text-[var(--text-secondary)]">
                    <span className="font-medium text-brand-400">This subscription</span> is for the ClinicKarobar platform.
                    Patient invoices &amp; billing are in the <span className="text-brand-400 font-medium">Billing</span> section.
                  </p>
                </div>
                <SubscriptionStatusCard isAdmin={isAdmin} />
                <SubscriptionPlansGrid isAdmin={isAdmin} />
              </motion.div>
            )}

            {/* API Access */}
            {activeTab === 'API Access' && (
              <ApiAccessTab isAdmin={isAdmin} clinicPlan={clinic?.plan} />
            )}

            {/* Prescription */}
            {activeTab === 'Billing' && (
              <motion.div
                key="billing-template"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <BillingTemplateTab />
              </motion.div>
            )}

            {activeTab === 'Prescription' && (
              <motion.div
                key="prescription-template"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <PrescriptionTemplateTab />
              </motion.div>
            )}

            {activeTab === 'Sync' && <SyncSettingsTab />}
            {activeTab === 'Photo Sync' && <WatchedFolderSettingsTab />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {upgradingPlan && (
          <UpgradeModal plan={upgradingPlan} onClose={() => setUpgradingPlan(null)} onSuccess={() => setUpgradingPlan(null)} />
        )}
        {requestPlan && (
          <UpgradeModal
            plan={requestPlan.plan}
            onClose={() => setRequestPlan(null)}
            onSuccess={() => setRequestPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}