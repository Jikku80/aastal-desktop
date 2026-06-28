'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BuilderLayout } from '@/components/website-builder/BuilderLayout';
import { useBuilderStore } from '@/components/website-builder/hooks/useBuilderState';
import { websiteApi } from '@/lib/api/websiteApi';
import { useAuthStore } from '@/store/auth.store';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import OnlineOnlyGate from '@/components/system/OnlineOnlyGate';

// ── Loading Screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Initializing workspace…',
    'Loading your pages…',
    'Preparing the editor…',
    'Almost ready…',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #0f0c29 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        padding: '1rem',
      }}
    >
      {/* Ambient blobs */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '15%', left: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          animation: 'pulse1 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '8%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          animation: 'pulse2 5s ease-in-out infinite',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380, width: '100%' }}>
        {/* Logo mark */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 0 0 1px rgba(139,92,246,0.3), 0 20px 40px rgba(99,102,241,0.35)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          {/* Globe / builder icon */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(1.25rem, 4vw, 1.6rem)',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.03em',
          margin: '0 0 8px',
        }}>
          Website Builder
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', margin: '0 0 36px' }}>
          Setting up your workspace
        </p>

        {/* Spinner ring */}
        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 28px' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{ animation: 'spin 1.2s linear infinite' }}>
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="url(#spinGrad)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="60 80" />
            <defs>
              <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Step text */}
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          letterSpacing: '0.01em',
          minHeight: '1.25rem',
          transition: 'opacity 0.3s ease',
        }}>
          {steps[currentStep]}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === currentStep ? 20 : 6,
              height: 6,
              borderRadius: 99,
              background: i <= currentStep
                ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.12)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes float   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pulse1  { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
        @keyframes pulse2  { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(0.9); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ── Error Screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ message }: { message?: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        padding: '1.5rem',
      }}
    >
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 20,
        padding: 'clamp(2rem, 6vw, 3rem) clamp(1.5rem, 5vw, 2.5rem)',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 60px -10px rgba(0,0,0,0.08)',
      }}>
        {/* Error icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          border: '1px solid #fca5a5',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 style={{
          fontSize: '1.25rem', fontWeight: 700, color: '#111827',
          margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Failed to load builder
        </h2>

        <p style={{
          fontSize: '0.875rem', color: '#6b7280',
          margin: '0 0 8px', lineHeight: 1.6,
        }}>
          We couldn't connect to your workspace. This is usually a temporary issue.
        </p>

        {message && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 10, padding: '10px 14px',
            margin: '16px 0 24px',
            fontSize: '0.78125rem', color: '#b91c1c',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            textAlign: 'left', wordBreak: 'break-word',
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: message ? 0 : 24 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%', padding: '12px 20px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff', border: 'none', borderRadius: 12,
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Try Again
          </button>

          <button
            onClick={() => window.history.back()}
            style={{
              width: '100%', padding: '11px 20px',
              background: 'transparent', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: 12,
              fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s ease', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WebsiteBuilderPage() {
  // Use the Zustand auth store directly (persists under key 'dentalos-auth')
  const { clinic, isHydrated } = useAuthStore();
  const clinicId  = clinic?.id       || '';
  const subdomain = (clinic as any)?.subdomain || (clinic as any)?.slug || '';

  const { loadFromApi } = useBuilderStore();
  const { isOnline, isLoading: onlineCheckLoading } = useOnlineStatus();

  const { data, isLoading, isError, error } = useQuery({
    queryKey:  ['website-builder', clinicId],
    queryFn:   () => websiteApi.get(),
    // Wait for auth store to hydrate AND for online status to confirm —
    // website-builder is online-only, so firing this while offline would
    // just hit the backend's online-only-gate 503 and surface as a
    // confusing generic error instead of the clear gate below.
    enabled:   isHydrated && isOnline,
    staleTime: 30_000,
    retry:     2,
  });

  useEffect(() => {
    if (data) {
      loadFromApi({
        pages:          data.pages          || [],
        globalSettings: data.globalSettings || {},
        theme:          data.theme          || {},
        seo:            data.seo            || {},
        isPublished:    data.isPublished    ?? false,
        subdomain:      subdomain || data?.subdomain || '',
        clinicId:       clinicId,
      });
    }
  }, [data, loadFromApi, subdomain, clinicId]);

  if (!isHydrated || onlineCheckLoading) return <LoadingScreen />;

  if (!isOnline) {
    return (
      <div className="p-8">
        <OnlineOnlyGate featureName="Website Builder">{null}</OnlineOnlyGate>
      </div>
    );
  }

  if (isLoading) return <LoadingScreen />;

  if (isError) return <ErrorScreen message={(error as Error)?.message} />;

  return (
    <BuilderLayout
      clinicId={clinicId}
      subdomain={subdomain || data?.subdomain || ''}
      onSave={(snapshot) => websiteApi.update(snapshot)}
    />
  );
}