'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, branchesApi } from '@/lib/api';
import { usePermissionsStore } from '@/store/permissions.store';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { setAuth, setBranches }      = useAuthStore();
  const { setPermissions }            = usePermissionsStore();

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: Form) => {
    setServerError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email: data.email, password: data.password });
      const { user, clinic, permissions } = res.data;
      setAuth(user, clinic);
      if (permissions) setPermissions(permissions);
      try {
        const br   = await branchesApi.list();
        const list = Array.isArray(br.data) ? br.data : (br.data?.data ?? []);
        setBranches(list);
      } catch {
        setBranches([]);
      }
      toast.success(`Welcome back, ${user.firstName}!`);
      window.location.href = '/dashboard/profile';
      // NOTE: do NOT setLoading(false) here — we want the spinner to stay
      // while the browser navigates to /dashboard.
    } catch (err: any) {
      // Always stop the spinner on error so the user can try again.
      const msg =
        err.response?.data?.message?.[0] ||
        err.response?.data?.message ||
        'Invalid email or password. Please try again.';
      setServerError(msg);
      setLoading(false);
    }
  };

  const fieldClass = (hasError: boolean) =>
    `input w-full transition-all ${hasError ? 'border-red-500/70 focus:border-red-500 bg-red-500/5' : ''}`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg-base)' }}>
      {/* ── Left panel — branding ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 p-10 xl:p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #082d46 0%, #0b0d14 60%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center">
              <span className="font-display text-white font-bold text-sm">CK</span>
            </div>
            <span className="font-display text-xl text-white font-bold">ClinicKarobar</span>
          </div>
          <h2 className="font-display text-4xl xl:text-5xl text-white leading-tight mb-4">
            Your practice,<br />
            <span className="text-brand-400">elevated.</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-sm">
            All-in-one platform for modern clinics. Appointments, patients,
            billing and your online presence — one place.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-3">
          {[
            { num: '2,400+', label: 'Clinics using ClinicKarobar' },
            { num: '1.2M+',  label: 'Appointments managed' },
            { num: '98%',    label: 'Customer satisfaction' },
            { num: '40%',    label: 'More efficient practices' },
          ].map(({ num, label }) => (
            <div key={label} className="p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-display text-xl text-brand-400">{num}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="font-display text-white font-bold text-xs">CK</span>
            </div>
            <span className="font-display text-lg text-[var(--text-primary)] font-bold">ClinicKarobar</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] mb-1">Sign in</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-7">
            Enter your credentials to access your clinic
          </p>

          {/* Server error banner */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <div className="relative flex items-center">
                <Mail size={15} className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] z-10 shrink-0" />
                <input
                  id="login-email"
                  {...register('email')}
                  type="email"
                  placeholder="doctor@clinic.com"
                  autoComplete="email"
                  className={fieldClass(!!errors.email)}
                  style={{ paddingLeft: '2.5rem' }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} aria-hidden="true" />{errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative flex items-center">
                <Lock size={15} className="pointer-events-none absolute left-3.5 text-[var(--text-muted)] z-10 shrink-0" />
                <input
                  id="login-password"
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={fieldClass(!!errors.password)}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} aria-hidden="true" />{errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-busy={loading}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Signing in…" />
                : <>Sign in <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            New to ClinicKarobar?{' '}
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Start free trial
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}