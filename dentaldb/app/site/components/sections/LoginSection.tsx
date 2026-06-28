'use client';

/**
 * LoginSection — Patient OTP login section rendered on the public clinic website.
 *
 * Flow:
 *  1. Patient enters phone or email → POST /patient-auth/otp/send
 *  2. Patient enters 6-digit OTP    → POST /patient-auth/otp/verify
 *     Backend sets an httpOnly cookie (patient_token) scoped to the API domain.
 *  3. On success → window.location redirects to the user-frontend patient portal.
 *     The portal's own API calls (withCredentials) will carry the cookie set in step 2,
 *     because both admin-frontend public site and user-frontend call the SAME API origin.
 */

import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, Smartphone, Mail, KeyRound, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, themeColors } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

// Axios instance that sends/receives cookies — required for the httpOnly patient_token cookie.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

const patientAuthApi = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Where to send the patient after successful login
const USER_PORTAL_URL =
  process.env.NEXT_PUBLIC_USER_FRONTEND_URL ||
  'https://app.clinickarobar.com';

type Step = 'identifier' | 'otp' | 'success';

export function LoginSection({ s, theme, containerClass, isPreview }: SecProps) {
  const [step, setStep]           = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [account, setAccount]     = useState<any>(null);

  const tc = themeColors(theme);
  const p  = theme.primaryColor || '#0ea5e9';

  const isPhone = (v: string) => /^\+?\d{7,15}$/.test(v.trim().replace(/[\s\-()]/g, ''));

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    setError('');
    const val = identifier.trim();
    if (!val) { setError('Please enter your phone number or email.'); return; }
    setLoading(true);
    try {
      await patientAuthApi.post('/patient-auth/otp/send', { identifier: val });
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    setError('');
    if (otp.length < 4) { setError('Please enter the OTP sent to you.'); return; }
    setLoading(true);
    try {
      const res = await patientAuthApi.post('/patient-auth/otp/verify', {
        identifier: identifier.trim(),
        otp: otp.trim(),
      });
      setAccount(res.data?.account);
      setStep('success');
      // Small delay so the patient sees the success state, then redirect to portal
      setTimeout(() => {
        window.location.href = `${USER_PORTAL_URL}/portal`;
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${tc.inputBorder}`,
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    background: tc.inputBg,
    color: tc.inputText,
  };

  const btnStyle: React.CSSProperties = {
    background: p,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '13px 24px',
    fontSize: 14,
    fontWeight: 700,
    width: '100%',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const cardStyle: React.CSSProperties = {
    background: tc.cardBg,
    border: `1px solid ${tc.cardBorder}`,
    boxShadow: tc.cardShadow,
    borderRadius: 18,
    padding: '32px 28px',
    maxWidth: 440,
    width: '100%',
    margin: '0 auto',
  };

  const variant = (s.variant as string) || 'card';

  return (
    <div className={`py-14 sm:py-20 ${containerClass}`}>
      <SectionTitle
        title={(s.title as string) || 'Patient Portal Login'}
        subtitle={(s.subtitle as string) || 'Access your appointments, records, and prescriptions'}
        theme={theme}
      />

      <div style={variant === 'minimal' ? { maxWidth: 440, margin: '0 auto', width: '100%' } : cardStyle}>
        {/* Step 1 — Identifier */}
        {step === 'identifier' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogIn size={18} color={p} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: tc.headingColor }}>Sign in</div>
                <div style={{ fontSize: 12, color: tc.bodyColor }}>Enter your phone or email to receive an OTP</div>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              {isPhone(identifier)
                ? <Smartphone size={16} color={tc.mutedColor} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                : <Mail size={16} color={tc.mutedColor} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              }
              <input
                type="text"
                placeholder="Phone number or Email address"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 40 }}
                autoComplete="username"
                disabled={loading}
              />
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}

            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={16} />}
              {loading ? 'Sending…' : ((s.ctaText as string) || 'Send OTP')}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: tc.mutedColor, margin: 0 }}>
              New patients are registered automatically on first login.
            </p>
          </form>
        )}

        {/* Step 2 — OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyRound size={18} color={p} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: tc.headingColor }}>Enter OTP</div>
                <div style={{ fontSize: 12, color: tc.bodyColor }}>Code sent to <strong>{identifier}</strong></div>
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...inputStyle, letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: 700 }}
              autoComplete="one-time-code"
              disabled={loading}
            />

            {error && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}

            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
              {loading ? 'Verifying…' : ((s.verifyText as string) || 'Verify & Login')}
            </button>

            <button
              type="button"
              onClick={() => { setStep('identifier'); setOtp(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: p, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Use a different phone / email
            </button>
          </form>
        )}

        {/* Step 3 — Success */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <CheckCircle size={48} color="#22c55e" />
            <div style={{ fontWeight: 700, fontSize: 18, color: tc.headingColor }}>
              Welcome{account?.firstName ? `, ${account.firstName}` : ''}!
            </div>
            <div style={{ fontSize: 13, color: tc.bodyColor }}>
              Login successful. Redirecting to your patient portal…
            </div>
            <div style={{ width: 32, height: 32 }}>
              <Loader2 size={24} color={p} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}