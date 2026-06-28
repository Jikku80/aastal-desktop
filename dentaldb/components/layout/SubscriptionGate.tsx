'use client';
import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CreditCard, RefreshCw, AlertTriangle, Calendar, Zap, X, Upload, Phone, QrCode, Landmark, Loader2, Check, Minus, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { subscriptionsApi, adminApi, paymentsApi, api } from '@/lib/api';
import toast from 'react-hot-toast';

const LOCK_MESSAGES: Record<string, { title: string; desc: string; icon: any; color: string }> = {
  trial_expired: {
    title: 'Free Trial Expired',
    desc:  'Your 14-day free trial has ended. Choose a plan to continue using ClinicKarobar.',
    icon:  Calendar,
    color: 'text-amber-400',
  },
  subscription_expired: {
    title: 'Subscription Expired',
    desc:  'Your subscription period has ended. Please renew to restore full access.',
    icon:  RefreshCw,
    color: 'text-red-400',
  },
  cancelled: {
    title: 'Subscription Cancelled',
    desc:  'Your subscription has been cancelled. Reactivate to continue using ClinicKarobar.',
    icon:  AlertTriangle,
    color: 'text-orange-400',
  },
  no_sub: {
    title: 'No Active Subscription',
    desc:  'No subscription found for your account. Please choose a plan to continue.',
    icon:  Lock,
    color: 'text-red-400',
  },
};

const PLANS = [
  { id: 'pro',        name: 'Pro',        priceMonthly: 1500,  priceYearly: 16500  },
  { id: 'enterprise', name: 'Enterprise', priceMonthly: 2500, priceYearly: 27500 },
];

const PRO_BASE = 1500;  const PRO_PER = 500;
const ENT_BASE = 2500; const ENT_PER = 500;

function calcMonthlyTotal(planId: string, nb: number): number {
  if (planId === 'pro')        return PRO_BASE + (Math.max(1, nb) - 1) * PRO_PER;
  if (planId === 'enterprise') return ENT_BASE + (Math.max(1, nb) - 1) * ENT_PER;
  return 0;
}

// ── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, subData }: { onClose: () => void; subData?: any }) {
  // Pre-populate plan + branch count from the existing subscription
  const existingPlan = PLANS.find(p => p.id === subData?.plan) ?? PLANS[0];
  const existingBranches: number =
    subData?.plan === 'pro'        ? (subData?.proPricing?.numBranches        ?? 1) :
    subData?.plan === 'enterprise' ? (subData?.enterprisePricing?.numBranches ?? 1) : 1;

  const [selectedPlan, setSelectedPlan] = useState(existingPlan);
  const [cycle,        setCycle]        = useState<'monthly'|'yearly'>(subData?.billingCycle ?? 'monthly');
  const [numBranches,  setNumBranches]  = useState<number>(existingBranches);
  const [gateway,      setGateway]      = useState<'esewa'|'khalti'|'manual'>('manual');
  const [loading,      setLoading]      = useState(false);
  const [contactNo,    setContactNo]    = useState('');
  const [proofFile,    setProofFile]    = useState<File|null>(null);
  const [proofPreview, setProofPreview] = useState<string|null>(null);
  const [uploading,    setUploading]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const isBranchPricedPlan = selectedPlan.id === 'pro' || selectedPlan.id === 'enterprise';
  const monthlyTotal = calcMonthlyTotal(selectedPlan.id, isBranchPricedPlan ? numBranches : 1);
  const price = cycle === 'yearly' ? Math.round(monthlyTotal * 11) : monthlyTotal;

  // Reset numBranches to at least 1 when switching plans
  const handlePlanChange = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    if (numBranches < 1) setNumBranches(1);
  };

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
        requestedPlan:   selectedPlan.id,
        billingCycle:    cycle,
        type:            'activation',
        paymentMethod:   gateway,
        contactNumber:   extra?.contactNumber,
        paymentProofUrl: extra?.paymentProofUrl,
        numBranches:     isBranchPricedPlan ? numBranches : undefined,
      }),
    onSuccess: () => {
      toast.success('Request submitted! Admin will review shortly.');
      qc.invalidateQueries({ queryKey: ['my-sub-requests'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Request failed'),
  });

  const handlePay = async () => {
    if (gateway === 'esewa') {
      setLoading(true);
      try {
        const r = await paymentsApi.initEsewa({
          amount: price,
          purpose: 'subscription',
          planId: selectedPlan.id,
          billingCycle: cycle,
          numBranches: isBranchPricedPlan ? numBranches : undefined,
        });
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
        const r = await paymentsApi.initKhalti({
          amount: price * 100,
          purpose: 'subscription',
          planId: selectedPlan.id,
          billingCycle: cycle,
          productName: `ClinicKarobar ${selectedPlan.name}`,
          numBranches: isBranchPricedPlan ? numBranches : undefined,
        });
        window.location.href = r.data.payment_url;
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Khalti initiation failed');
        setLoading(false);
      }
      return;
    }
    if (gateway === 'manual') {
      if (!contactNo.trim()) { toast.error('Please enter your contact number'); return; }
      if (!proofFile)         { toast.error('Please upload your payment screenshot'); return; }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', proofFile);
        const uploadRes = await api.post('/files/payment-proof', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const proofUrl  = uploadRes.data?.url || uploadRes.data?.path || '';
        requestMut.mutate({ contactNumber: contactNo.trim(), paymentProofUrl: proofUrl });
      } catch {
        requestMut.mutate({ contactNumber: contactNo.trim() });
      } finally {
        setUploading(false);
      }
    }
  };

  const busy = loading || uploading || requestMut.isPending;

  return (
    <motion.div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '92vh' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Choose a Plan</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Select a plan and payment method to activate</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={15}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Plan selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Plan</p>
            {PLANS.map(plan => (
              <button key={plan.id} onClick={() => handlePlanChange(plan)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectedPlan.id === plan.id
                    ? 'bg-brand-600/15 border border-brand-600/40'
                    : 'border border-transparent hover:bg-white/5'
                }`} style={{ border: selectedPlan.id === plan.id ? undefined : '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan.id === plan.id ? 'border-brand-400' : 'border-[var(--border)]'}`}>
                    {selectedPlan.id === plan.id && <div className="w-2 h-2 rounded-full bg-brand-400"/>}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{plan.name}</span>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  NPR {calcMonthlyTotal(plan.id, numBranches).toLocaleString()}
                  <span className="text-xs text-[var(--text-muted)] font-normal">/mo</span>
                </span>
              </button>
            ))}
          </div>

          {/* Branch count selector — shown for pro and enterprise */}
          {isBranchPricedPlan && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Number of Branches</p>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setNumBranches(n => Math.max(1, n - 1))}
                  disabled={numBranches <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:bg-white/10"
                  style={{ border: '1px solid var(--border)' }}>
                  <Minus size={14} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-xl font-bold text-[var(--text-primary)]">{numBranches}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-1.5">branch{numBranches !== 1 ? 'es' : ''}</span>
                </div>
                <button
                  onClick={() => setNumBranches(n => Math.min(50, n + 1))}
                  disabled={numBranches >= 50}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:bg-white/10"
                  style={{ border: '1px solid var(--border)' }}>
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                1 branch included · each extra +NPR {selectedPlan.id === 'enterprise' ? ENT_PER.toLocaleString() : PRO_PER.toLocaleString()}/mo
              </p>
            </div>
          )}

          {/* Billing cycle */}
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {(['monthly','yearly'] as const).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${cycle === c ? 'bg-brand-600 text-white' : 'text-[var(--text-muted)]'}`}>
                {c}{c === 'yearly' && <span className="ml-1 text-[10px] text-emerald-400">(1 mo free)</span>}
              </button>
            ))}
          </div>

          {/* Gateway */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'esewa',  label: 'eSewa',   icon: QrCode },
                { id: 'khalti', label: 'Khalti',  icon: Landmark },
                { id: 'manual', label: 'Manual',  icon: Upload },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setGateway(id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all ${
                    gateway === id ? 'bg-brand-600/15 text-brand-400' : 'text-[var(--text-muted)] hover:bg-white/5'
                  }`} style={{ border: gateway === id ? '1px solid rgba(14,157,232,.35)' : '1px solid var(--border)' }}>
                  <Icon size={18}/>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual payment fields */}
          {gateway === 'manual' && (
            <div className="mt-4 space-y-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <QrCode size={14} className="text-brand-400" /> Manual Payment Instructions
              </p>

              {/* QR code placeholder */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-36 h-36 rounded-xl flex items-center justify-center"
                  style={{ border: '2px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <div className="text-center">
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

          {/* Price summary */}
          <div className="p-3 rounded-xl space-y-1.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{selectedPlan.name} · {numBranches} branch{numBranches !== 1 ? 'es' : ''} · {cycle}</span>
              <span className="text-base font-bold text-[var(--text-primary)]">NPR {price.toLocaleString()}</span>
            </div>
            {cycle === 'yearly' && (
              <p className="text-[11px] text-emerald-400">
                Saves NPR {(monthlyTotal * 12 - price).toLocaleString()} vs monthly
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handlePay} disabled={busy}
            className="btn-primary w-full justify-center gap-2 py-3">
            {busy
              ? <Loader2 size={16} className="animate-spin"/>
              : gateway === 'manual'
                ? <><Check size={15}/> Submit Payment Request</>
                : <><CreditCard size={15}/> Pay NPR {price.toLocaleString()}</>
            }
          </button>
          <p className="text-[10px] text-center text-[var(--text-muted)] mt-2">
            {gateway === 'manual' ? 'Admin will verify and activate your plan within 24 hours.' : 'You will be redirected to complete payment.'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export default function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuthStore();
  if (user?.role === 'super_admin') return <>{children}</>;
  return <GateChecker>{children}</GateChecker>;
}

function GateChecker({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status', user?.clinicId],
    queryFn:  () => subscriptionsApi.getCurrent().then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <>{children}</>;

  const isLocked   = data?.isLocked;
  const lockReason = data?.lockReason || 'trial_expired';
  const isOwner    = user?.role === 'owner';

  if (!isLocked) return <>{children}</>;

  const info = LOCK_MESSAGES[lockReason] || LOCK_MESSAGES.trial_expired;
  const Icon = info.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'var(--bg-base)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-full max-w-md text-center"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">ClinicKarobar</span>
          </div>

          {/* Lock card */}
          <div className="card p-8 mb-4" style={{ border: '1px solid var(--border)' }}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
              lockReason === 'trial_expired' ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              <Icon size={28} className={info.color} />
            </div>

            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">{info.title}</h1>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">{info.desc}</p>

            {data?.currentPeriodEnd && lockReason !== 'trial_expired' && (
              <div className="mb-5 px-4 py-2.5 rounded-xl text-xs text-amber-400 bg-amber-500/10">
                Expired: {new Date(data.currentPeriodEnd).toLocaleDateString('en', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
            )}
            {data?.trialEndsAt && lockReason === 'trial_expired' && (
              <div className="mb-5 px-4 py-2.5 rounded-xl text-xs text-amber-400 bg-amber-500/10">
                Trial ended: {new Date(data.trialEndsAt).toLocaleDateString('en', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
            )}

            {isOwner ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="btn-primary w-full justify-center gap-2 py-3 text-sm"
                >
                  <CreditCard size={15} />
                  {lockReason === 'subscription_expired' ? 'Renew Subscription' : 'Choose a Plan'}
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                  Pro NPR 1,499/mo · Enterprise NPR 10,000/mo
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="px-4 py-3 rounded-xl text-sm text-[var(--text-secondary)] bg-white/5">
                  <p>Please contact your clinic administrator</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">to renew the subscription</p>
                </div>
              </div>
            )}
          </div>

          {/* Plans preview */}
          {isOwner && (
            <div className="grid grid-cols-2 gap-2 text-left">
              {[
                { name: 'Pro',        price: '1,499',  color: 'text-brand-400' },
                { name: 'Enterprise', price: '10,000', color: 'text-amber-400' },
                { name: 'Yearly',     price: '1 mo free', color: 'text-emerald-400' },
              ].map(p => (
                <div key={p.name} className="card p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={10} className={p.color} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{p.name}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">NPR {p.price}{p.name !== 'Yearly' ? '/mo' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upgrade modal — pass subData so it can pre-populate plan + branch count */}
        <AnimatePresence>
          {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} subData={data} />}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}