'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';

const WaIcon = ({ color = '#fff', size = 26 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export function WhatsAppButtonSection({ s }: SecProps) {
  const [bannerVisible, setBannerVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent       = (s.accentColor as string) || '#25D366';
  const phone        = ((s.phoneNumber as string) || '').replace(/\D/g, '');
  const welcomeMsg   = (s.welcomeMessage as string) || 'Hello! I have a question about your clinic.';
  const bannerText   = (s.bannerText    as string) || 'How can I help you?';
  const bannerSub    = (s.bannerSubText as string) || 'Chat with us on WhatsApp';
  const position     = (s.position as string) || 'bottom-right';
  const delaySeconds = typeof s.showAfterSeconds === 'number' ? s.showAfterSeconds : 2;

  React.useEffect(() => {
    timerRef.current = setTimeout(() => setBannerVisible(true), delaySeconds * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [delaySeconds]);

  const openWhatsApp = () => {
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(welcomeMsg)}`, '_blank', 'noopener,noreferrer');
  };

  const posStyle: React.CSSProperties =
    position === 'bottom-left'
      ? { position: 'fixed', bottom: 24, left: 24, zIndex: 9999 }
      : { position: 'fixed', bottom: 24, right: 24, zIndex: 9999 };

  const bannerStyle: React.CSSProperties = {
    position:   'absolute',
    bottom:     70,
    ...(position === 'bottom-left' ? { left: 0 } : { right: 0 }),
    width:      240,
    maxWidth:   'calc(100vw - 48px)',
    background: '#fff',
    borderRadius: 14,
    padding:    '14px 16px',
    boxShadow:  '0 8px 28px rgba(0,0,0,0.15)',
    border:     `1px solid ${accent}33`,
    animation:  bannerVisible ? 'wa-slide-in 0.3s ease-out' : 'none',
    display:    bannerVisible ? 'block' : 'none',
  };

  const variant = (s.variant as string) ?? 'floating';

  // ── Variant: bottom-bar ─────────────────────────────────────────────────
  if (variant === 'bottom-bar') {
    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: '#25D366', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WaIcon size={22} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{bannerText}</span>
        </div>
        <button onClick={openWhatsApp} disabled={!phone} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, padding: '7px 20px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Chat Now</button>
      </div>
    );
  }

  // ── Variant: floating-pill ───────────────────────────────────────────────
  if (variant === 'floating-pill') {
    return (
      <div style={posStyle}>
        <button onClick={openWhatsApp} disabled={!phone} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 999, background: accent, border: 'none', cursor: phone ? 'pointer' : 'default', boxShadow: `0 6px 20px ${accent}55`, color: '#fff', fontWeight: 700, fontSize: 14 }}>
          <WaIcon size={20} />
          {bannerText}
        </button>
      </div>
    );
  }

  // ── Variant: floating-circle ─────────────────────────────────────────────
  if (variant === 'floating-circle') {
    return (
      <div style={posStyle}>
        <button onClick={openWhatsApp} disabled={!phone} style={{ width: 60, height: 60, borderRadius: '50%', background: accent, border: 'none', cursor: phone ? 'pointer' : 'default', boxShadow: `0 6px 20px ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WaIcon size={28} />
        </button>
      </div>
    );
  }

  // ── Variant: doctor-avatar ───────────────────────────────────────────────
  if (variant === 'doctor-avatar') {
    return (
      <div style={posStyle}>
        <button onClick={() => setBannerVisible(v => !v)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: accent, border: '3px solid white', boxShadow: `0 4px 16px ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>👨‍⚕️</div>
          <div style={{ background: accent, color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Chat</div>
        </button>
        {bannerVisible && (
          <div style={{ ...bannerStyle, display: 'block' }}>
            <button onClick={() => setBannerVisible(false)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, padding: 0 }}>×</button>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', marginBottom: 10 }}>{bannerText}</p>
            <button onClick={openWhatsApp} disabled={!phone} style={{ width: '100%', padding: '9px', background: phone ? accent : '#d1d5db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: phone ? 'pointer' : 'default' }}>Chat on WhatsApp</button>
          </div>
        )}
      </div>
    );
  }

  // ── Default: floating popup widget ──────────────────────────────────────
  return (
    <div style={posStyle}>
      {/* Banner popup */}
      <div style={bannerStyle}>
        <button
          onClick={() => setBannerVisible(false)}
          style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0 }}
          aria-label="Close"
        >×</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WaIcon size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', lineHeight: 1.3 }}>{bannerText}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{bannerSub}</div>
          </div>
        </div>

        <button
          onClick={openWhatsApp}
          disabled={!phone}
          style={{ width: '100%', padding: '9px 12px', background: phone ? accent : '#d1d5db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: phone ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'opacity 0.2s' }}
          onMouseEnter={e => { if (phone) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          <WaIcon size={15} />
          Chat on WhatsApp
        </button>

        {!phone && (
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>
            Configure phone number in builder
          </p>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setBannerVisible(v => !v)}
        style={{ width: 56, height: 56, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${accent}55`, transition: 'transform 0.2s, box-shadow 0.2s', animation: 'wa-pulse 2.5s ease-in-out infinite' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        aria-label="Open WhatsApp chat"
      >
        <WaIcon size={30} />
      </button>

      <style>{`
        @keyframes wa-pulse {
          0%, 100% { box-shadow: 0 6px 20px ${accent}55; }
          50%       { box-shadow: 0 6px 28px ${accent}99; }
        }
        @keyframes wa-slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}