'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

// ── Password rules (must mirror register.dto.ts) ──────────────────────────
const PW_CHECKS = [
  { id: 'len',   label: 'At least 8 characters',          test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)',      test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter (a–z)',      test: (v: string) => /[a-z]/.test(v) },
  { id: 'digit', label: 'One number (0–9)',                test: (v: string) => /\d/.test(v) },
  { id: 'spec',  label: 'One special character (!@#$%…)', test: (v: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(v) },
];

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,72}$/;

const PASSWORD_MESSAGE =
  'Password must be 8–72 characters and include at least one uppercase letter, ' +
  'one lowercase letter, one number, and one special character.';

const schema = z.object({
  firstName:  z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName:   z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email:      z.string().email('Enter a valid email address'),
  password:   z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
  clinicName: z.string().min(3, 'Clinic name must be at least 3 characters').max(100),
  phone:      z.string().optional(),
});
type RegisterForm = z.infer<typeof schema>;

const STEPS        = ['Your info', 'Clinic details', 'Done'];
const STEP_FIELDS: (keyof RegisterForm)[][] = [
  ['firstName', 'lastName', 'email', 'password'],
  ['clinicName'],
];

// ── Password strength indicator ───────────────────────────────────────────
function PasswordStrength({ value }: { value: string }) {
  const results = useMemo(() => PW_CHECKS.map(c => ({ ...c, passed: c.test(value) })), [value]);
  const passed  = results.filter(r => r.passed).length;
  const pct     = (passed / PW_CHECKS.length) * 100;
  const color   = pct <= 40 ? '#ef4444' : pct <= 80 ? '#f59e0b' : '#10b981';

  if (!value) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="h-1 w-full rounded-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {/* Rule checklist */}
      <ul className="space-y-0.5">
        {results.map(r => (
          <li key={r.id} className="flex items-center gap-1.5 text-[11px]"
            style={{ color: r.passed ? '#10b981' : 'var(--text-muted)' }}>
            {r.passed
              ? <Check size={10} strokeWidth={3} />
              : <X size={10} strokeWidth={3} />}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step, setStep]               = useState(0);
  const [loading, setLoad]            = useState(false);
  const [done, setDone]               = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { setAuth }                   = useAuthStore();

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { firstName: '', lastName: '', email: '', password: '', clinicName: '', phone: '' },
  });

  const passwordValue = watch('password');

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep(s => s + 1);
  };

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    const valid = await trigger(STEP_FIELDS[step] ?? []);
    if (!valid) return;
    setLoad(true);
    try {
      const res = await authApi.register(data);
      const { user, clinic } = res.data;
      setAuth(user, clinic);
      setDone(true);
      setTimeout(() => { window.location.href = '/dashboard/profile'; }, 2000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.[0] ||
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      setServerError(msg);
      if (err.response?.status === 409 || /email|already/i.test(msg)) setStep(0);
    } finally {
      setLoad(false);
    }
  };

  const fieldCls = (name: keyof RegisterForm) =>
    `input w-full transition-all ${errors[name] ? 'border-red-500/70 focus:border-red-500 bg-red-500/5' : ''}`;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 p-8">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto ring-1 ring-emerald-500/30">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="font-display text-3xl text-[var(--text-primary)]">Welcome aboard!</h2>
          <p className="text-[var(--text-secondary)]">Setting up your clinic dashboard…</p>
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg-base)' }}>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 p-10 xl:p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #082d46 0%, #0b0d14 60%)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center">
              <span className="font-display text-white font-bold text-lg">D</span>
            </div>
            <span className="font-display text-xl text-white font-bold">ClinicKarobar</span>
          </div>
          <h2 className="font-display text-4xl xl:text-5xl text-white leading-tight mb-4">
            Start your free<br /><span className="text-brand-400">14-day trial.</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-sm">
            No credit card required. Full access to all features. Cancel anytime.
          </p>
        </div>
        <div className="relative space-y-3">
          {[
            { emoji: '✅', text: 'Unlimited appointments' },
            { emoji: '✅', text: 'Patient management & billing' },
            { emoji: '✅', text: 'Custom clinic website' },
            { emoji: '✅', text: 'SMS & email reminders' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span>{emoji}</span>
              <span className="text-sm text-[var(--text-secondary)]">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }} className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="font-display text-white font-bold">D</span>
            </div>
            <span className="font-display text-lg text-[var(--text-primary)] font-bold">ClinicKarobar</span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-brand-600 text-white' :
                  i === step ? 'bg-brand-600/20 text-brand-400 border border-brand-600/40' :
                  'bg-white/5 text-[var(--text-muted)]'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className="w-6 h-px" style={{ background: i < step ? '#027cc6' : 'var(--border)' }} />
                )}
              </div>
            ))}
          </div>

          {/* Server error banner */}
          <AnimatePresence>
            {serverError && (
              <motion.div key="server-err"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                role="alert" aria-live="assertive">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <AnimatePresence mode="wait">

              {/* Step 0 */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--text-primary)] mb-1">Create your account</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-5">No credit card needed.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">First name</label>
                      <input {...register('firstName')} className={fieldCls('firstName')} placeholder="John" autoFocus />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle size={11} />{errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="label">Last name</label>
                      <input {...register('lastName')} className={fieldCls('lastName')} placeholder="Doe" />
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle size={11} />{errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input {...register('email')} type="email" className={fieldCls('email')}
                      placeholder="you@clinic.com" autoComplete="email" />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={11} />{errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label">Password</label>
                    <div className="relative flex items-center">
                      <input {...register('password')} type={showPw ? 'text' : 'password'}
                        className={fieldCls('password')} placeholder="Min. 8 characters"
                        autoComplete="new-password" style={{ paddingRight: '2.75rem' }} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {/* Live strength indicator — shown while typing, replaced by error on blur */}
                    {errors.password ? (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={11} />{errors.password.message}
                      </p>
                    ) : (
                      <PasswordStrength value={passwordValue} />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 1 */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--text-primary)] mb-1">Your clinic</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-5">Tell us about your practice.</p>
                  </div>

                  <div>
                    <label className="label">Clinic Name</label>
                    <input {...register('clinicName')} className={fieldCls('clinicName')}
                      placeholder="Smile Dental Clinic" autoFocus />
                    {errors.clinicName && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={11} />{errors.clinicName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      Phone <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                    </label>
                    <input {...register('phone')} type="tel" className="input w-full" placeholder="+977 98XXXXXXXX" />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button type="button" onClick={() => { setServerError(null); setStep(s => s - 1); }}
                  className="btn-secondary">
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              {step < 1 ? (
                <button type="button" onClick={nextStep} className="btn-primary flex-1 justify-center py-3">
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="btn-primary flex-1 justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-busy={loading}>
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Creating account…" />
                    : <>Create account <ArrowRight size={14} /></>
                  }
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}