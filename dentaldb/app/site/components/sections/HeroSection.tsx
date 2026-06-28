'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';
import { resolveImageUrl } from './siteRendererHelpers';

export function HeroSection({ s, theme }: SecProps) {
  const MIN_H_MAP: Record<string, string> = {
    small: '200px', medium: '360px', large: '480px', 'full-screen': '100vh', fullscreen: '100vh',
  };
  const minH = MIN_H_MAP[s.minHeight ?? 'large'] ?? '480px';

  const coverImageUrl = resolveImageUrl(s.coverImage as string | undefined);
  const coverPos  = (s.coverPosition as string) || 'center center';
  const coverSize = (s.coverSize    as string) || 'cover';

  let bg: string;
  if (coverImageUrl) {
    bg = `url(${coverImageUrl}) ${coverPos}/${coverSize} no-repeat`;
  } else if (s.backgroundType === 'gradient') {
    bg = (s.backgroundValue as string) || `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`;
  } else if (s.backgroundType === 'image' && s.backgroundValue) {
    bg = `url(${resolveImageUrl(s.backgroundValue as string)}) center/cover no-repeat`;
  } else {
    bg = (s.backgroundValue as string) || theme.primaryColor;
  }

  const rawOverlay = coverImageUrl
    ? (s.coverOverlay !== undefined && s.coverOverlay !== null ? (s.coverOverlay as number) : 40)
    : ((s.backgroundOverlay as number) ?? 0);
  const overlayOpacity = coverImageUrl && s.forceDarkOverlay
    ? Math.max(rawOverlay, 55) / 100
    : rawOverlay / 100;

  const ALIGN_MAP: Record<string, string> = {
    center: 'items-center text-center',
    left:   'items-start text-left',
    right:  'items-end text-right',
    split:  'items-center',
  };
  const align = ALIGN_MAP[s.layout ?? 'center'] ?? 'items-center text-center';

  const HEADLINE_SIZE_MAP: Record<string, string> = {
    sm: '1.5rem', md: '2rem', xl: '2.5rem', '2xl': '3rem', '3xl': '3.75rem',
  };
  const SUB_SIZE_MAP: Record<string, string> = {
    sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem',
  };
  const headlineSize = HEADLINE_SIZE_MAP[s.headlineFontSize ?? 'xl'] ?? '2.5rem';
  const subSize = SUB_SIZE_MAP[s.subheadlineFontSize ?? 'lg'] ?? '1.25rem';

  const headlineStyle: React.CSSProperties = {
    fontFamily: s.headlineFontFamily || theme.fontHeading,
    fontSize: headlineSize,
    fontWeight: s.headlineFontWeight ?? '700',
    lineHeight: s.headlineLineHeight ? `${s.headlineLineHeight / 10}` : '1.15',
    letterSpacing: s.headlineLetterSpacing ? `${s.headlineLetterSpacing / 100}em` : undefined,
    textShadow: s.headlineTextShadow || undefined,
    ...(s.headlineGradient && s.headlineGradientValue
      ? { background: s.headlineGradientValue, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
      : { color: s.headlineColor ?? '#ffffff' }),
  };

  const RADIUS_MAP: Record<string, string> = {
    none: '0', sm: '6px', md: '10px', lg: '16px', full: '9999px',
  };
  const BTN_PAD_MAP: Record<string, string> = {
    sm: '8px 20px', md: '12px 28px', lg: '14px 36px', xl: '18px 48px',
  };
  const ctaRadius = RADIUS_MAP[s.ctaRadius ?? 'md'] ?? '10px';
  const ctaPad = BTN_PAD_MAP[s.ctaSize ?? 'md'] ?? '12px 28px';

  const buildBtnStyle = (style: string, bg: string, color: string, border: string): React.CSSProperties => {
    if (style === 'glass') return {
      background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
      color, border: '1.5px solid rgba(255,255,255,0.35)',
      borderRadius: ctaRadius, padding: ctaPad, fontWeight: 600,
    };
    if (style === 'outline') return {
      background: 'transparent', color: color || '#ffffff',
      border: `2px solid ${border || '#ffffff'}`,
      borderRadius: ctaRadius, padding: ctaPad, fontWeight: 600,
    };
    if (style === 'ghost') return {
      background: 'transparent', color: color || '#ffffff', border: 'none',
      borderRadius: ctaRadius, padding: ctaPad, fontWeight: 600, textDecoration: 'underline',
    };
    return {
      background: bg || theme.accentColor, color: color || '#ffffff',
      border: border && border !== 'transparent' ? `2px solid ${border}` : 'none',
      borderRadius: ctaRadius, padding: ctaPad, fontWeight: 600,
    };
  };

  const primaryBtnStyle = buildBtnStyle(
    s.ctaStyle ?? 'filled', s.ctaBg ?? theme.accentColor,
    s.ctaColor ?? '#ffffff', s.ctaBorder ?? 'transparent',
  );
  const secondaryBtnStyle = buildBtnStyle(
    s.secondaryCtaStyle ?? 'outline', s.secondaryCtaBg ?? 'transparent',
    s.secondaryCtaColor ?? '#ffffff', s.secondaryCtaBorder ?? '#ffffff',
  );

  const ctaHref = s.ctaAction === 'scroll-to-booking' ? '#booking'
    : s.ctaAction === 'phone' ? `tel:${s.ctaValue ?? ''}`
    : s.ctaAction === 'whatsapp' ? `https://wa.me/${String(s.ctaValue ?? '').replace(/\D/g, '')}`
    : s.ctaAction === 'section' ? (s.ctaValue as string) || '#'
    : (s.ctaValue as string) || '#';

  const secondaryHref = s.secondaryCtaAction === 'scroll-to-booking' ? '#booking'
    : s.secondaryCtaAction === 'phone' ? `tel:${s.secondaryCtaValue ?? ''}`
    : s.secondaryCtaAction === 'whatsapp' ? `https://wa.me/${String(s.secondaryCtaValue ?? '').replace(/\D/g, '')}`
    : s.secondaryCtaAction === 'section' ? (s.secondaryCtaValue as string) || '#'
    : (s.secondaryCtaValue as string) || '#';

  const variant = (s.variant as string) ?? 'classic';
  const p = theme.primaryColor;
  const a = theme.accentColor;
  const hl = (s.headline as string) || '';
  const sub = s.subheadline as string | undefined;

  const PrimaryBtn = () => s.ctaText ? (
    <a href={ctaHref} style={{ ...primaryBtnStyle, display: 'inline-block', textDecoration: 'none', transition: 'opacity 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
      {s.ctaText as string}
    </a>
  ) : null;

  const SecondaryBtn = () => s.secondaryCtaText ? (
    <a href={secondaryHref} style={{ ...secondaryBtnStyle, display: 'inline-block', textDecoration: secondaryBtnStyle.textDecoration || 'none', transition: 'opacity 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
      {s.secondaryCtaText as string}
    </a>
  ) : null;

  const Overlay = () => overlayOpacity > 0 ? <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} /> : null;

  if (variant === 'split-screen') {
    return (
      <div style={{ minHeight: minH, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, background: p, display: 'flex', alignItems: 'center', padding: '60px 48px' }}>
          <div>
            {s.badge && <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>{s.badge as string}</span>}
            <h1 style={{ ...headlineStyle, fontSize: 'clamp(1.5rem,3.5vw,2.5rem)', color: '#fff', marginBottom: 16 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 28, maxWidth: 420 }}>{sub}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
            {s.trustLine && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 20 }}>✓ {s.trustLine as string}</p>}
          </div>
        </div>
        <div style={{ flex: 1, background: coverImageUrl ? bg : `${theme.secondaryColor}22`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </div>
    );
  }

  if (variant === 'appointment-focused') {
    return (
      <div style={{ background: bg, minHeight: minH, position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <Overlay />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1200, margin: '0 auto', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ ...headlineStyle, fontSize: 'clamp(1.7rem,4vw,2.8rem)', marginBottom: 16 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', marginBottom: 24 }}>{sub}</p>}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, padding: '28px 24px', width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', flexShrink: 0 }}>
            <h3 style={{ fontFamily: theme.fontHeading, fontSize: 18, fontWeight: 700, color: theme.textColor, marginBottom: 16 }}>Book Appointment</h3>
            {['Your Name', 'Phone Number'].map(f => (
              <div key={f} style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#9ca3af' }}>{f}</div>
            ))}
            <a href="#booking" style={{ display: 'block', width: '100%', padding: 13, borderRadius: 8, background: p, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
              {(s.ctaText as string) || 'Confirm Booking'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-spotlight') {
    return (
      <div style={{ minHeight: minH, background: `linear-gradient(135deg,${p} 0%,${theme.secondaryColor} 100%)`, display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1200, margin: '0 auto', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 20 }}>⚕️ Expert Medical Care</div>
            <h1 style={{ ...headlineStyle, fontSize: 'clamp(1.7rem,4vw,2.8rem)', color: '#fff', marginBottom: 18 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 28 }}>{sub}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 280, borderRadius: 20, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', padding: 24, textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👨‍⚕️</div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>{(s.doctorName as string) || 'Dr. Expert'}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{(s.doctorTitle as string) || 'Chief Medical Officer'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'luxury-cosmetic') {
    return (
      <div style={{ background: bg, minHeight: minH, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <Overlay />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,0.7) 50%,transparent)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 700, padding: '80px 64px' }}>
          <div style={{ width: 40, height: 2, background: a, marginBottom: 24 }} />
          <p style={{ fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: a, fontWeight: 600, marginBottom: 16 }}>Premium Aesthetic Medicine</p>
          <h1 style={{ ...headlineStyle, fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 300, color: '#fff', marginBottom: 20 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 36 }}>{sub}</p>}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  if (variant === 'gradient-saas') {
    return (
      <div style={{ background: `radial-gradient(ellipse at 70% 50%,${p}22 0%,transparent 60%),linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)`, minHeight: minH, display: 'flex', alignItems: 'center', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)' }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ ...headlineStyle, color: theme.textColor, fontSize: 'clamp(1.8rem,4vw,3rem)', marginBottom: 20 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.2rem', color: '#6b7280', lineHeight: 1.6, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>{sub}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  if (variant === 'emergency-care') {
    return (
      <div style={{ background: '#0f172a', minHeight: minH, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#ef4444' }} />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>24/7 EMERGENCY CARE</span>
            </div>
            <h1 style={{ ...headlineStyle, color: '#fff', fontSize: 'clamp(1.8rem,4vw,3rem)', marginBottom: 18 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 32 }}>{sub}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '28px 24px', textAlign: 'center', minWidth: 200 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚨</div>
            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 22 }}>Call Now</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginTop: 4 }}>{(s.emergencyPhone as string) || '+1-800-CLINIC'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'children-clinic') {
    return (
      <div style={{ background: 'linear-gradient(135deg,#fef9ec 0%,#fce7f3 50%,#eff6ff 100%)', minHeight: minH, display: 'flex', alignItems: 'center', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)' }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👶🏽</div>
            <h1 style={{ ...headlineStyle, color: '#1e293b', fontSize: 'clamp(1.7rem,4vw,2.8rem)', marginBottom: 18 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>{sub}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {[['🩺', 'Pediatric Care'], ['💊', 'Vaccinations'], ['🧸', 'Friendly Doctors'], ['📋', 'Health Checkups']].map(([ic, tx]) => (
              <div key={tx} style={{ background: '#fff', borderRadius: 16, padding: '20px 16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{ic}</div><div style={{ fontSize: 13, fontWeight: 600, color: theme.textColor }}>{tx}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal-premium') {
    return (
      <div style={{ background: '#fafafa', minHeight: minH, display: 'flex', alignItems: 'center', padding: '60px 48px' }}>
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ width: 48, height: 3, background: p, marginBottom: 28 }} />
          <h1 style={{ ...headlineStyle, color: '#0f172a', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, marginBottom: 20 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.2rem', color: '#64748b', lineHeight: 1.7, marginBottom: 36, maxWidth: 560 }}>{sub}</p>}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  if (variant === 'hospital-enterprise') {
    return (
      <div style={{ background: bg, minHeight: minH, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <Overlay />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', padding: '12px 48px', display: 'flex', alignItems: 'center', gap: 24, zIndex: 20 }}>
          {s.phone && <span style={{ color: '#fff', fontSize: 13, opacity: 0.8 }}>📞 {s.phone as string}</span>}
          <span style={{ marginLeft: 'auto', color: '#fff', fontSize: 13, opacity: 0.8 }}>🕐 Emergency 24/7</span>
        </div>
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1100, margin: '0 auto', padding: '80px 32px 60px' }}>
          <h1 style={{ ...headlineStyle, color: '#fff', fontSize: '3.2rem', marginBottom: 18 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>{sub}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  if (variant === 'ai-healthcare') {
    return (
      <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: minH, display: 'flex', alignItems: 'center', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)' }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 999, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', marginBottom: 24 }}>
            <span style={{ fontSize: 14 }}>⚡</span><span style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>AI-Powered Healthcare</span>
          </div>
          <h1 style={{ ...headlineStyle, color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: 20 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 36 }}>{sub}</p>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  if (variant === 'full-screen-premium') {
    return (
      <div style={{ background: bg, minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Overlay />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 32px', maxWidth: 900, width: '100%' }}>
          <h1 style={{ ...headlineStyle, color: '#fff', fontSize: '4rem', fontWeight: 300, marginBottom: 24 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.3rem', color: 'rgba(255,255,255,0.75)', maxWidth: 600, margin: '0 auto 40px' }}>{sub}</p>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  if (variant === 'dental-clinic') {
    return (
      <div style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 100%)', minHeight: minH, display: 'flex', alignItems: 'center', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)' }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(24px,5vw,60px)', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: `${p}15`, marginBottom: 20 }}>
              <span style={{ fontSize: 14 }}>🦷</span><span style={{ fontSize: 12, color: p, fontWeight: 600 }}>Premium Dental Care</span>
            </div>
            <h1 style={{ ...headlineStyle, color: '#0f172a', fontSize: 'clamp(1.7rem,4vw,2.8rem)', marginBottom: 16 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>{sub}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
          </div>
          <div style={{ aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {coverImageUrl ? <img src={coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 80 }}>🦷</span>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'trust-focused') {
    return (
      <div style={{ background: '#f8faff', minHeight: minH, display: 'flex', alignItems: 'center', padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)' }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(24px,5vw,60px)', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              {['⭐ 4.9/5 Rating', '✓ 10K+ Patients', '🏆 Award Winning'].map(t => (
                <span key={t} style={{ background: `${p}10`, color: p, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            <h1 style={{ ...headlineStyle, color: '#0f172a', fontSize: 'clamp(1.7rem,4vw,2.8rem)', marginBottom: 18 }}>{hl}</h1>
            {sub && <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>{sub}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}><PrimaryBtn /><SecondaryBtn /></div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[{ v: '15+', l: 'Specialists' }, { v: '20y', l: 'Experience' }, { v: '98%', l: 'Satisfaction' }].map(st => (
                <div key={st.l}><div style={{ fontWeight: 800, color: p, fontSize: '1.3rem' }}>{st.v}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{st.l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ aspectRatio: '4/3', borderRadius: 24, overflow: 'hidden', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {coverImageUrl ? <img src={coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 80 }}>🏥</span>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'video-background') {
    const videoUrl = (s.videoUrl as string) || '';
    return (
      <div style={{ minHeight: minH, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {videoUrl ? (
          <video autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
            <source src={videoUrl} />
          </video>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})`, zIndex: 0 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 900, margin: '0 auto', padding: 'clamp(40px,6vw,80px) clamp(16px,3vw,32px)', textAlign: 'center' }}>
          <h1 style={{ ...headlineStyle, color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, marginBottom: 20 }}>{hl}</h1>
          {sub && <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 36, maxWidth: 580, margin: '0 auto 36px' }}>{sub}</p>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}><PrimaryBtn /><SecondaryBtn /></div>
        </div>
      </div>
    );
  }

  // Default (classic + image-collage fallback)
  return (
    <div
      style={{ background: bg, minHeight: minH, position: 'relative' }}
      className="flex items-center overflow-hidden w-full"
    >
      {overlayOpacity > 0 && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
      )}
      <div className={`relative z-10 flex flex-col ${align} gap-4 sm:gap-5 px-4 sm:px-6 py-12 sm:py-16 w-full max-w-5xl mx-auto`}>
        <h1 style={headlineStyle}>
          {(s.headline as string) || ''}
        </h1>
        {s.subheadline && (
          <p style={{
            fontSize: subSize,
            fontFamily: s.subheadlineFontFamily || theme.fontBody,
            fontWeight: s.subheadlineFontWeight ?? '400',
            color: s.subheadlineColor ?? 'rgba(255,255,255,0.9)',
            maxWidth: '36rem',
            textShadow: s.subheadlineTextShadow || undefined,
          }}>
            {s.subheadline as string}
          </p>
        )}
        <div className="flex flex-wrap gap-3 sm:gap-4 mt-2" style={{ justifyContent: s.layout === 'center' ? 'center' : s.layout === 'right' ? 'flex-end' : 'flex-start' }}>
          {s.ctaText && (
            <a href={ctaHref} style={{ ...primaryBtnStyle, display: 'inline-block', textDecoration: 'none', transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {s.ctaText as string}
            </a>
          )}
          {s.secondaryCtaText && (
            <a href={secondaryHref} style={{ ...secondaryBtnStyle, display: 'inline-block', textDecoration: secondaryBtnStyle.textDecoration || 'none', transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {s.secondaryCtaText as string}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}