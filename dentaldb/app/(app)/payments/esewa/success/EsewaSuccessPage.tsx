'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { paymentsApi, subscriptionsApi, clinicsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

type State = 'verifying' | 'success' | 'error';

export default function EsewaSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setClinic } = useAuthStore();

  const [state, setState] = useState<State>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [txnCode, setTxnCode] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      setErrorMsg('No payment data received from eSewa.');
      setState('error');
      return;
    }

    // Decode the base64 data from eSewa
    let decoded: any;
    try {
      decoded = JSON.parse(atob(data));
    } catch {
      setErrorMsg('Invalid payment data from eSewa.');
      setState('error');
      return;
    }

    if (decoded.status !== 'COMPLETE') {
      setErrorMsg(`Payment not completed. Status: ${decoded.status}`);
      setState('error');
      return;
    }

    // Extract transaction info for display
    setTxnCode(decoded.transaction_code || '');
    setAmount(decoded.total_amount ? `NPR ${Number(decoded.total_amount).toLocaleString()}` : '');

    // Check if this is a subscription payment (transaction_uuid contains 'sub-')
    const txnUuid: string = decoded.transaction_uuid || '';
    const isSubscription = txnUuid.startsWith('sub-');

    if (isSubscription) {
      // Parse planId and billingCycle from transaction_uuid: sub-{clinicId}-{planId}-{cycle}-{ts}
      // The subscription was already stored server-side; just refresh clinic data
      clinicsApi.getCurrent()
        .then(r => { setClinic(r.data); setState('success'); })
        .catch(() => setState('success'));
    } else {
      // Invoice payment — verify with backend
      const invoiceId = txnUuid.split('-')[0];
      paymentsApi.verifyEsewa({ invoiceId, data })
        .then(() => setState('success'))
        .catch((e: any) => {
          setErrorMsg(e?.response?.data?.message || 'Verification failed. Please contact support.');
          setState('error');
        });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
              <path d="M32 8C22 8 15 14 15 22c0 5 2 9 2.5 14C18 41 17.5 48 20 52c1.5 3 4 4.5 6.5 3.5C29 54.5 29.5 50 31.5 46c.5-1.5 1-1.5 1-1.5s.5 0 1 1.5C35.5 50 36 54.5 38.5 55.5 41 56.5 43.5 55 45 52c2.5-4 2-11 2.5-16 .5-5 2.5-9 2.5-14C50 14 42 8 32 8Z" fill="white"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">ClinicKarobar</span>
        </div>

        <div className="card p-8 text-center" style={{ border: '1px solid var(--border)' }}>
          {state === 'verifying' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(14,157,232,0.08)' }}>
                <Loader2 size={36} className="text-brand-400 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Verifying Payment</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Please wait while we confirm your eSewa payment…
              </p>
            </motion.div>
          )}

          {state === 'success' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Successful!</h1>
              <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                Your eSewa payment has been verified and your account has been updated.
              </p>

              {(txnCode || amount) && (
                <div className="rounded-xl p-4 mb-6 text-left space-y-2"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {txnCode && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Transaction Code</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">{txnCode}</span>
                    </div>
                  )}
                  {amount && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Amount Paid</span>
                      <span className="font-semibold text-emerald-400">{amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Payment Method</span>
                    <span className="font-medium text-[var(--text-primary)]">eSewa</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <Link href="/dashboard/settings?tab=Subscription"
                  className="btn-primary w-full justify-center gap-2 py-3 text-sm">
                  View Subscription <ArrowRight size={15} />
                </Link>
                <Link href="/dashboard"
                  className="btn-secondary w-full justify-center gap-2 py-2.5 text-sm">
                  <Home size={14} /> Go to Dashboard
                </Link>
              </div>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(239,68,68,0.08)' }}>
                <XCircle size={40} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Failed</h1>
              <p className="text-sm text-[var(--text-muted)] mb-3 leading-relaxed">
                {errorMsg || 'Something went wrong verifying your payment.'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                If money was deducted, please contact support with your eSewa transaction reference.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link href="/dashboard/settings?tab=Subscription"
                  className="btn-primary w-full justify-center gap-2 py-3 text-sm">
                  Try Again
                </Link>
                <Link href="/dashboard"
                  className="btn-secondary w-full justify-center gap-2 py-2.5 text-sm">
                  <Home size={14} /> Go to Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          Powered by eSewa · Secure Payment Gateway
        </p>
      </motion.div>
    </div>
  );
}
