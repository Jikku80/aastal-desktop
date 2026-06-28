'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import Link from 'next/link';

type State = 'verifying' | 'success' | 'error';

export default function KhaltiSuccessPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [txnId, setTxnId] = useState('');
  const [amount, setAmount] = useState('');
  const [orderName, setOrderName] = useState('');

  useEffect(() => {
    const status = searchParams.get('status');
    const pidx = searchParams.get('pidx');
    const transactionId = searchParams.get('transaction_id') || searchParams.get('tidx') || '';
    const rawAmount = searchParams.get('amount');
    const purchaseOrderId = searchParams.get('purchase_order_id') || '';
    const purchaseOrderName = searchParams.get('purchase_order_name') || '';

    setTxnId(transactionId);
    setOrderName(purchaseOrderName);
    if (rawAmount) {
      // Khalti sends amount in paisa
      setAmount(`NPR ${(Number(rawAmount) / 100).toLocaleString()}`);
    }

    if (status !== 'Completed') {
      setErrorMsg(`Payment not completed. Status: ${status || 'Unknown'}`);
      setState('error');
      return;
    }

    if (!pidx) {
      setErrorMsg('Missing payment reference. Please contact support.');
      setState('error');
      return;
    }

    // Verify with backend — invoiceId is the purchase_order_id
    const invoiceId = purchaseOrderId.startsWith('sub-') ? null : purchaseOrderId;

    if (invoiceId) {
      paymentsApi.verifyKhalti({ invoiceId, pidx })
        .then(() => setState('success'))
        .catch((e: any) => {
          setErrorMsg(e?.response?.data?.message || 'Verification failed. Please contact support.');
          setState('error');
        });
    } else {
      // Subscription — Khalti subscription redirects to settings directly;
      // this page handles invoice payments only, but handle gracefully
      setState('success');
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
                style={{ background: 'rgba(98,0,238,0.08)' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: '#5C2D8E' }} />
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Verifying Payment</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Please wait while we confirm your Khalti payment…
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
                Your Khalti payment has been verified and your account has been updated.
              </p>

              {(txnId || amount || orderName) && (
                <div className="rounded-xl p-4 mb-6 text-left space-y-2"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {orderName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Description</span>
                      <span className="font-medium text-[var(--text-primary)] text-right max-w-[180px] truncate">{orderName}</span>
                    </div>
                  )}
                  {txnId && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Transaction ID</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">{txnId}</span>
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
                    <span className="font-medium" style={{ color: '#5C2D8E' }}>Khalti</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <Link href="/dashboard/billing"
                  className="btn-primary w-full justify-center gap-2 py-3 text-sm">
                  View Billing <ArrowRight size={15} />
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
                If money was deducted, please contact support with your Khalti transaction ID.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link href="/dashboard/billing"
                  className="btn-primary w-full justify-center gap-2 py-3 text-sm">
                  Back to Billing
                </Link>
                <Link href="/dashboard"
                  className="btn-secondary w-full justify-center gap-2 py-2.5 text-sm">
                  <Home size={14} /> Go to Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        {/* Khalti branding */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#5C2D8E' }}>
            <span className="text-white text-[9px] font-bold">K</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Powered by Khalti · Secure Payment Gateway</p>
        </div>
      </motion.div>
    </div>
  );
}
