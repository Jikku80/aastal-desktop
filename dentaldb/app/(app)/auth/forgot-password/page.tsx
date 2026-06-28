'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [sentTo,   setSentTo]   = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setApiError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSentTo(data.email);
      setSent(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send reset email. Please try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }} className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <span className="font-display text-white font-bold">D</span>
          </div>
          <span className="font-display text-lg text-[var(--text-primary)] font-bold">ClinicKarobar</span>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/12 flex items-center justify-center mx-auto ring-1 ring-emerald-500/25">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="font-display text-2xl text-[var(--text-primary)]">Check your inbox</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                We sent a password reset link to<br />
                <span className="font-medium text-[var(--text-primary)]">{sentTo}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Didn't receive it? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                  try again
                </button>.
              </p>
              <Link href="/auth/login"
                className="flex items-center justify-center gap-2 mt-4 text-sm text-brand-400 hover:text-brand-300">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] mb-1">Reset password</h1>
              <p className="text-[var(--text-secondary)] text-sm mb-7">
                Enter your email and we'll send you a reset link.
              </p>

              <AnimatePresence>
                {apiError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl mb-5 text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <span className="text-red-400">{apiError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative flex items-center">
                    <Mail size={15} className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] z-10" />
                    <input {...register('email')} type="email" autoComplete="email"
                      placeholder="doctor@clinic.com"
                      className="input w-full" style={{ paddingLeft: '2.5rem' }}
                      onChange={() => setApiError(null)} />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Send reset link <ArrowRight size={14} /></>
                  }
                </button>
              </form>

              <Link href="/auth/login"
                className="flex items-center justify-center gap-2 mt-5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}