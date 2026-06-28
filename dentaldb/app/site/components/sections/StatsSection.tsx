'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function StatsSection({ s, theme, containerClass }: SecProps) {
  const variant = (s.variant as string) ?? 'banner';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[]) || [];

  if (variant === 'floating-cards') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.map((item: any, i: number) => (
              <div key={i} className="rounded-2xl p-6 text-center" style={{ background: '#fff', boxShadow: `0 8px 32px ${p}20`, border: `1px solid ${p}15` }}>
                <div style={{ fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 800, color: p, fontFamily: theme.fontHeading }}>{item.value}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'with-icons') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.map((item: any, i: number) => (
              <div key={i} className="text-center">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${p}12`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{item.icon || '📊'}</div>
                <div style={{ fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 800, color: p, fontFamily: theme.fontHeading }}>{item.value}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark-premium') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={{ ...theme, textColor: '#fff' }} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.map((item: any, i: number) => (
              <div key={i} className="text-center rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 800, color: p, fontFamily: theme.fontHeading }}>{item.value}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {items.slice(0, 4).map((item: any, i: number) => (
              <div key={i} style={{ borderRadius: 20, padding: 28, textAlign: 'center', background: i === 0 ? `linear-gradient(135deg,${p},${theme.secondaryColor || p})` : '#f8faff', color: i === 0 ? '#fff' : theme.textColor, gridColumn: i === 0 ? 'span 2' : undefined, boxShadow: i === 0 ? `0 8px 32px ${p}30` : '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: i === 0 ? '3rem' : '2.2rem', fontWeight: 800, fontFamily: theme.fontHeading }}>{item.value}</div>
                <div style={{ fontSize: 13, opacity: i === 0 ? 0.85 : 0.6, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'gradient-bg') {
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})` }}>
        <div className={containerClass}>
          {s.title && <h2 style={{ textAlign: 'center', fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: '#fff', marginBottom: 32 }}>{s.title as string}</h2>}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1 }}>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ textAlign: 'center', padding: '28px 20px', borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                <div style={{ fontSize: 'clamp(1.5rem,3.5vw,2.5rem)', fontWeight: 800, color: '#fff', fontFamily: theme.fontHeading }}>{item.value}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {items.map((item: any, i: number) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 110, height: 110, borderRadius: '50%', border: `8px solid ${p}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: `${p}06` }}>
                  <div style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 800, color: p, fontFamily: theme.fontHeading }}>{item.value}</div>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: '#f1f5f9', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              {items.slice(0, 4).map((item: any, i: number) => (
                <div key={i} style={{ padding: '20px 16px', background: 'white', textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 800, color: p, marginBottom: 4, fontFamily: theme.fontHeading }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: `${p}20` }}>
                    <div style={{ height: '100%', borderRadius: 2, background: p, width: `${60 + i * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
              {[['🏆', 'Award Winning'], ['✓', 'Accredited'], ['🌟', 'Top Rated']].map(([ic, lb]) => (
                <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                  <span>{ic}</span><span>{lb}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline-stats') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={(s.title as string) || 'Our Growth'} subtitle={s.subtitle as string} theme={theme} />}
          <div style={{ position: 'relative', padding: '0 32px' }}>
            <div style={{ position: 'absolute', top: 24, left: 32, right: 32, height: 2, background: `${p}20` }} />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 16, position: 'relative', zIndex: 1 }}>
              {items.map((item: any, i: number) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: i === 0 ? p : `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: i === 0 ? `0 4px 16px ${p}40` : 'none', border: i !== 0 ? `2px solid ${p}30` : 'none' }}>
                    <span style={{ fontWeight: 800, color: i === 0 ? '#fff' : p, fontSize: 12 }}>{i + 1}</span>
                  </div>
                  <div style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 800, color: p, marginBottom: 4, fontFamily: theme.fontHeading }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'banner' || variant === 'classic') {
    return (
      <div className="py-12 sm:py-16" style={{ background: p }}>
        <div className={containerClass}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.map((item: any, i: number) => (
              <div key={i} style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: 'clamp(1.5rem,3.5vw,2.5rem)', fontWeight: 800, fontFamily: theme.fontHeading }}>{item.value}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default: banner gradient
  return (
    <div className="py-12 sm:py-16" style={{ background: `linear-gradient(135deg, ${p} 0%, ${theme.secondaryColor || p}cc 100%)` }}>
      <div className={containerClass}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className="text-center rounded-2xl py-6 px-4" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <div className="text-3xl sm:text-4xl font-bold mb-1 text-white" style={{ fontFamily: theme.fontHeading }}>{item.value}</div>
              <div className="text-xs sm:text-sm text-white/75 font-medium tracking-wide">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}