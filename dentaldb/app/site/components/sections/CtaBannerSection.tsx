'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';

export function CtaBannerSection({ s, theme }: SecProps) {
  const variant = (s.variant as string) ?? 'horizontal';
  const p = theme.primaryColor;
  const href = s.ctaAction === 'scroll-to-booking' ? '#booking'
    : s.ctaAction === 'phone' ? `tel:${s.ctaValue || ''}`
    : (s.ctaValue as string) || '#';

  if (variant === 'centered') {
    return (
      <div className="py-16 sm:py-20 px-4 text-center" style={{ background: (s.background as string) || p }}>
        <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: theme.fontHeading }}>{s.title as string}</h2>
        {s.subtitle && <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">{s.subtitle as string}</p>}
        {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '14px 40px', borderRadius: 12, background: '#fff', color: p, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>{s.ctaText as string}</a>}
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div className="py-12 sm:py-16 px-4 sm:px-8" style={{ background: '#0f172a' }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: theme.fontHeading }}>{s.title as string}</h2>
            {s.subtitle && <p className="mt-2 text-white/60">{s.subtitle as string}</p>}
          </div>
          {s.ctaText && <a href={href} style={{ display: 'inline-block', flexShrink: 0, padding: '12px 32px', borderRadius: 12, background: p, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div className="py-10 px-4 sm:px-8" style={{ background: '#ef4444' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 36 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: theme.fontHeading }}>{(s.title as string) || '24/7 Emergency Care'}</div>
              {s.subtitle && <div style={{ opacity: 0.9 }}>{s.subtitle as string}</div>}
            </div>
          </div>
          {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 12, background: '#fff', color: '#ef4444', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>{s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="py-10 px-4 sm:px-8 border-t border-b" style={{ borderColor: `${p}20`, background: `${p}06` }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: '1.1rem' }}>{s.title as string}</h3>
            {s.subtitle && <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{s.subtitle as string}</p>}
          </div>
          {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 10, background: p, color: '#fff', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>{s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  if (variant === 'gradient-card') {
    return (
      <div className="py-14 sm:py-20 px-4" style={{ background: '#f8faff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <div style={{ background: `linear-gradient(135deg,${p},${theme.accentColor || theme.secondaryColor || p})`, borderRadius: 24, padding: 'clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, boxShadow: `0 20px 60px ${p}30` }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 800, color: '#fff', fontFamily: theme.fontHeading, marginBottom: 8 }}>{(s.title as string) || 'Ready to Get Started?'}</h2>
              {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 400 }}>{s.subtitle as string}</p>}
            </div>
            {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 12, background: '#fff', color: p, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>{s.ctaText as string}</a>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'split-color') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', minHeight: 160 }}>
        <div style={{ background: p, padding: 'clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 800, color: '#fff', fontFamily: theme.fontHeading }}>{(s.title as string) || 'Book Appointment'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 6, fontSize: 14 }}>{s.subtitle as string}</p>}
          </div>
        </div>
        <div style={{ background: `${p}12`, padding: 'clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 10, background: p, color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: `0 6px 20px ${p}40` }}>{s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  if (variant === 'download-brochure') {
    return (
      <div className="py-14 sm:py-20 px-4" style={{ background: '#f8faff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', background: 'white', borderRadius: 20, padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${p}15`, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${p}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 28 }}>📋</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 18, marginBottom: 6 }}>{(s.title as string) || 'Download Our Services Brochure'}</h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>{(s.subtitle as string) || 'Get a complete overview of our services, doctors, and packages.'}</p>
          </div>
          {s.ctaText && <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, background: p, color: '#fff', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>↓ {s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  if (variant === 'insurance-verify') {
    return (
      <div className="py-14 sm:py-20 px-4" style={{ background: '#eff6ff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={20} color={p} /><span style={{ fontSize: 13, fontWeight: 700, color: p }}>Insurance Verification</span>
            </div>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2.2vw,1.6rem)', fontWeight: 700, color: theme.textColor, marginBottom: 8 }}>{(s.title as string) || 'Check Your Insurance Coverage'}</h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>{(s.subtitle as string) || 'We accept most major insurance plans.'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealth'].map(ins => (
                <span key={ins} style={{ padding: '4px 12px', borderRadius: 999, background: 'white', border: `1px solid ${p}25`, fontSize: 12, color: theme.textColor, fontWeight: 600 }}>{ins}</span>
              ))}
            </div>
          </div>
          {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 10, background: p, color: '#fff', fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>{s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  if (variant === 'health-checkup') {
    return (
      <div className="py-14 sm:py-20 px-4" style={{ background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>{(s.title as string) || 'Book a Health Checkup'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 24 }}>{(s.subtitle as string) || 'Comprehensive health screenings at affordable prices.'}</p>
            {s.ctaText && <a href={href} style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 10, background: '#fff', color: p, fontWeight: 700, textDecoration: 'none' }}>{s.ctaText as string}</a>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {[['🩸', 'Blood Tests'], ['❤️', 'Cardiac Check'], ['👁️', 'Eye Exam'], ['🦷', 'Dental Screen']].map(([ic, lb]) => (
              <div key={lb} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{ic}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{lb}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'whatsapp') {
    const waNum = String((s.ctaValue as string) || (s.phone as string) || '').replace(/\D/g, '');
    const waHref = waNum ? `https://wa.me/${waNum}` : '#';
    return (
      <div className="py-10 px-4 sm:px-8" style={{ background: '#dcfce7' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-5 flex-wrap">
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 700, color: '#166534', fontSize: 16 }}>{(s.title as string) || 'Chat with us on WhatsApp'}</h3>
            {s.subtitle && <p style={{ fontSize: 13, color: '#16a34a' }}>{s.subtitle as string}</p>}
          </div>
          {s.ctaText && <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '12px 28px', background: '#25D366', color: '#fff', fontWeight: 700, borderRadius: 10, textDecoration: 'none', flexShrink: 0 }}>{s.ctaText as string}</a>}
        </div>
      </div>
    );
  }

  // default: horizontal
  return (
    <div className="py-12 sm:py-16 px-4 sm:px-8" style={{ background: (s.background as string) || p }}>
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-white text-center md:text-left">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ fontFamily: theme.fontHeading }}>{s.title as string}</h2>
          {s.subtitle && <p className="mt-2 text-white/80">{s.subtitle as string}</p>}
        </div>
        {s.ctaText && (
          <a href={href} className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold flex-shrink-0 transition-opacity hover:opacity-90 whitespace-nowrap" style={{ background: 'white', color: p, textDecoration: 'none' }}>
            {s.ctaText as string}
          </a>
        )}
      </div>
    </div>
  );
}