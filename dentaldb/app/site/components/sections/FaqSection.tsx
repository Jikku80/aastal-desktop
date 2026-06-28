'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function FaqSection({ s, theme, containerClass }: SecProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const isDark     = isColorDark(theme.backgroundColor);
  const itemBorder = isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';
  const hoverBg    = isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb';
  const qColor     = isDark ? 'rgba(255,255,255,0.9)'  : '#111827';
  const aColor     = isDark ? 'rgba(255,255,255,0.6)'  : '#4b5563';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[]) || [];
  const variant = (s.variant as string) ?? 'accordion';

  if (variant === 'modern-cards') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid sm:grid-cols-2 gap-4">
            {items.map((item: any, i: number) => (
              <div key={i} style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.08)' : 'white', borderRadius: 16, padding: 24, boxShadow: isColorDark(theme.backgroundColor) ? 'none' : '0 2px 12px rgba(0,0,0,0.06)', borderLeft: `4px solid ${p}` }}>
                <h4 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 10, fontSize: 14 }}>{item.question}</h4>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.answer || 'Our team is ready to help.'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'two-column') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,3vw,40px)', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{(s.title as string) || 'FAQ'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 24, fontSize: 14 }}>{(s.subtitle as string) || 'Common questions answered.'}</p>
              <a href="#booking" style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 8, background: p, color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Contact Us</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item: any, i: number) => (
                <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                  <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: openIdx === i ? 8 : 0 }}>
                    <span style={{ fontWeight: 600, color: theme.textColor, fontSize: 14 }}>{item.question}</span>
                    <ChevronDown size={16} color={p} style={{ flexShrink: 0, transform: openIdx === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {openIdx === i && <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.answer}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p}06,${p}12)` }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '18px 28px', background: openIdx === i ? `${p}06` : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, color: openIdx === i ? p : theme.textColor, fontSize: 14 }}>{item.question}</span>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: openIdx === i ? p : `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: openIdx === i ? '#fff' : p, fontSize: 16, lineHeight: 1 }}>{openIdx === i ? '−' : '+'}</span>
                  </div>
                </button>
                {openIdx === i && <div style={{ padding: '0 28px 18px', fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>{item.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category') {
    const cats = [{ label: 'Appointments', icon: '📅', items: items.slice(0, 2) }, { label: 'Services', icon: '🏥', items: items.slice(2, 4) }, { label: 'Insurance', icon: '🛡️', items: items.slice(1, 3) }];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Help Center'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid sm:grid-cols-3 gap-6">
            {cats.map((cat, ci) => (
              <div key={ci} style={{ background: '#f8faff', borderRadius: 20, padding: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{cat.icon}</div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 16, fontSize: 15 }}>{cat.label}</h3>
                {cat.items.map((item: any, i: number) => (
                  <div key={i} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 10, marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: theme.textColor, fontWeight: 500 }}>{item.question}</span>
                      <ChevronDown size={14} color={p} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{(s.title as string) || 'Frequently Asked Questions'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.5)' }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, color: openIdx === i ? p : 'rgba(255,255,255,0.8)', fontSize: 14 }}>{item.question}</span>
                  <ChevronDown size={16} color={openIdx === i ? p : 'rgba(255,255,255,0.4)'} style={{ transform: openIdx === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                {openIdx === i && <div style={{ padding: '0 20px 14px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default: accordion
  return (
    <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="max-w-2xl mx-auto space-y-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${itemBorder}` }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex justify-between items-center px-5 sm:px-6 py-4 text-left transition-colors"
                style={{ background: openIdx === i ? `${theme.primaryColor}15` : 'transparent' }}
                onMouseEnter={e => { if (openIdx !== i) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (openIdx !== i) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="font-semibold text-sm sm:text-base pr-4" style={{ color: qColor }}>{item.question}</span>
                {openIdx === i
                  ? <ChevronUp size={18} style={{ color: theme.primaryColor, flexShrink: 0 }} />
                  : <ChevronDown size={18} style={{ color: theme.primaryColor, flexShrink: 0 }} />
                }
              </button>
              {openIdx === i && (
                <div className="px-5 sm:px-6 pb-5 leading-relaxed text-sm sm:text-base" style={{ borderTop: `1px solid ${itemBorder}`, color: aColor }}>
                  <p className="pt-3">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}