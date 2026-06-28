'use client';
import { motion } from 'framer-motion';
import { XCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function EsewaFailurePage() {
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
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(239,68,68,0.08)' }}>
            <XCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Cancelled</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
            Your eSewa payment was cancelled or could not be completed. No amount has been deducted.
          </p>

          <div className="flex flex-col gap-2.5">
            <Link href="/dashboard/settings?tab=Subscription"
              className="btn-primary w-full justify-center gap-2 py-3 text-sm">
              <RefreshCw size={14} /> Try Again
            </Link>
            <Link href="/dashboard"
              className="btn-secondary w-full justify-center gap-2 py-2.5 text-sm">
              <Home size={14} /> Go to Dashboard
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          Powered by eSewa · Secure Payment Gateway
        </p>
      </motion.div>
    </div>
  );
}
