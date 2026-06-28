'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

const schema = z.object({
  password:        z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type Form = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const [showPw,   setShowPw]   = useState(false);
  const [showPw2,  setShowPw2]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [token,    setToken]    = useState('');
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setApiError('Invalid or missing reset token. Please request a new reset link.');
    } else {
      setToken(t);
    }
  }, [searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: Form) => {
    if (!token) return;
    setLoading(true);
    setApiError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Reset failed. The link may have expired.';
      setApiError(typeof msg === 'string' ? msg : 'Reset failed. Please try again.');
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
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/12 flex items-center justify-center mx-auto ring-1 ring-emerald-500/25">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="font-display text-2xl text-[var(--text-primary)]">Password updated!</h2>
              <p className="text-sm text-[var(--text-secondary)]">Redirecting you to sign in…</p>
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] mb-1">New password</h1>
              <p className="text-[var(--text-secondary)] text-sm mb-7">Choose a strong password for your account.</p>

              <AnimatePresence>
                {apiError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl mb-5 text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-red-400">{apiError}</span>
                      {apiError.includes('expired') && (
                        <div className="mt-2">
                          <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300 text-xs underline">
                            Request a new link →
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="label">New Password</label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] z-10" />
                    <input {...register('password')} type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters" autoComplete="new-password"
                      className="input w-full" style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" tabIndex={-1}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="label">Confirm Password</label>
                  <div className="relative flex items-center">
                    <Lock size={15} className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] z-10" />
                    <input {...register('confirmPassword')} type={showPw2 ? 'text' : 'password'}
                      placeholder="Repeat password" autoComplete="new-password"
                      className="input w-full" style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }} />
                    <button type="button" onClick={() => setShowPw2(v => !v)}
                      className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" tabIndex={-1}>
                      {showPw2 ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={loading || !token} className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Set new password <ArrowRight size={14} /></>
                  }
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}