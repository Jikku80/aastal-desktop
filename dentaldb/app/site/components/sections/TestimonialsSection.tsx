'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function TestimonialsSection({ s, theme, containerClass }: SecProps) {
  const variant = (s.variant as string) ?? 'cards';
  const isDark = isColorDark(theme.backgroundColor);
  const p = theme.primaryColor;
  const cardBg    = isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';
  const cardBorder= isDark ? 'rgba(255,255,255,0.1)'  : '#f0f0f0';
  const quoteColor= isDark ? 'rgba(255,255,255,0.75)' : '#374151';
  const nameColor = isDark ? 'rgba(255,255,255,0.95)' : '#111827';
  const roleColor = isDark ? 'rgba(255,255,255,0.45)' : '#9ca3af';
  const items: any[] = (s.items as any[]) || [];

  const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: size * 0.35, flexShrink: 0 }}>
      {name?.[0] || 'P'}
    </div>
  );
  const Stars = ({ rating = 5 }: { rating?: number }) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array(rating).fill(0).map((_, j) => <Star key={j} size={14} fill={p} color={p} />)}
    </div>
  );

  if (variant === 'large-quote') {
    const [active, setActive] = useState(0);
    const t = items[active] || items[0];
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : `${p}06` }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          {t && (
            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: 72, color: p, lineHeight: 1, marginBottom: 16, opacity: 0.3 }}>&ldquo;</div>
              <p style={{ fontSize: '1.25rem', color: quoteColor, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 24 }}>{t.text}</p>
              <Stars rating={t.rating} />
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Avatar name={t.name} />
                <div style={{ textAlign: 'left' }}><div style={{ fontWeight: 700, color: nameColor }}>{t.name}</div>{t.role && <div style={{ fontSize: 12, color: roleColor }}>{t.role}</div>}</div>
              </div>
              {items.length > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
                  {items.map((_: any, i: number) => (
                    <button key={i} onClick={() => setActive(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === active ? p : `${p}40` }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'google-style') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 800, color: theme.textColor, lineHeight: 1 }}>4.9</div>
              <Stars rating={5} />
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Based on {items.length} reviews</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {[5,4,3].map(star => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', width: 8 }}>{star}</span>
                  <Star size={12} fill={p} color={p} />
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: star === 5 ? '85%' : star === 4 ? '12%' : '3%', background: p, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((t: any, i: number) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 16, padding: '18px 20px', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar name={t.name} size={36} />
                  <div><div style={{ fontWeight: 600, fontSize: 14, color: nameColor }}>{t.name}</div><Stars rating={t.rating} /></div>
                </div>
                <p style={{ fontSize: 13, color: quoteColor, lineHeight: 1.6 }}>&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 28 }}>
            {items.map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: 28, borderBottom: i < items.length - 1 ? `1px solid ${cardBorder}` : 'none' }}>
                <Avatar name={t.name} />
                <div>
                  <Stars rating={t.rating} />
                  <p style={{ fontSize: 14, color: quoteColor, lineHeight: 1.6, margin: '8px 0' }}>&ldquo;{t.text}&rdquo;</p>
                  <div style={{ fontSize: 13, fontWeight: 600, color: nameColor }}>{t.name}{t.role && <span style={{ fontWeight: 400, color: roleColor }}> · {t.role}</span>}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento-reviews') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {items.slice(0, 6).map((t: any, i: number) => (
              <div key={i} style={{ borderRadius: 20, padding: 24, background: i === 0 ? p : 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gridColumn: i === 0 ? 'span 2' : undefined }}>
                <Stars rating={t.rating} />
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: '12px 0', fontStyle: 'italic', color: i === 0 ? 'rgba(255,255,255,0.9)' : quoteColor }}>&ldquo;{t.text}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <Avatar name={t.name} size={32} />
                  <div style={{ fontWeight: 600, fontSize: 13, color: i === 0 ? 'rgba(255,255,255,0.9)' : nameColor }}>{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'trust-wall') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ columns: 3, gap: 16 }}>
            {items.map((t: any, i: number) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 16, borderRadius: 16, padding: '18px 20px', background: cardBg, border: `1px solid ${cardBorder}` }}>
                <Stars rating={t.rating} />
                <p style={{ fontSize: 13, color: quoteColor, lineHeight: 1.6, margin: '10px 0', fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Avatar name={t.name} size={30} />
                  <div style={{ fontWeight: 600, fontSize: 12, color: nameColor }}>{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured-story') {
    const [fsActive, setFsActive] = useState(0);
    const ft = items[fsActive] || items[0];
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p}06,${p}12)` }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          {ft && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 48, alignItems: 'center', maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Avatar name={ft.name} size={100} />
                <h3 style={{ fontWeight: 700, color: nameColor, marginTop: 16, fontSize: 18 }}>{ft.name}</h3>
                {ft.role && <p style={{ color: roleColor, fontSize: 13, marginTop: 4 }}>{ft.role}</p>}
                <Stars rating={ft.rating} />
              </div>
              <div>
                <div style={{ fontSize: 64, color: `${p}25`, lineHeight: 0.8, marginBottom: 12, fontFamily: 'Georgia,serif' }}>&ldquo;</div>
                <p style={{ fontSize: '1.1rem', color: quoteColor, lineHeight: 1.8, fontStyle: 'italic' }}>{ft.text}</p>
              </div>
            </div>
          )}
          {items.length > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }}>
              {items.map((_: any, i: number) => (
                <button key={i} onClick={() => setFsActive(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === fsActive ? p : `${p}40` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    const [carIdx, setCarIdx] = useState(0);
    const perPage = 3;
    const maxIdx = Math.max(0, items.length - perPage);
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 20, transition: 'transform 0.4s ease', transform: `translateX(calc(-${carIdx * (100 / perPage)}% - ${carIdx * 7}px))` }}>
              {items.map((t: any, i: number) => (
                <div key={i} style={{ minWidth: `calc(${100 / perPage}% - 14px)`, borderRadius: 20, padding: 24, background: cardBg, border: `1px solid ${cardBorder}`, flexShrink: 0 }}>
                  <Stars rating={t.rating} />
                  <p style={{ fontSize: 14, color: quoteColor, lineHeight: 1.7, margin: '12px 0', fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={t.name} size={36} />
                    <div><div style={{ fontWeight: 600, fontSize: 13, color: nameColor }}>{t.name}</div>{t.role && <div style={{ fontSize: 11, color: roleColor }}>{t.role}</div>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {items.length > perPage && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
              {Array.from({ length: maxIdx + 1 }).map((_, i) => (
                <button key={i} onClick={() => setCarIdx(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === carIdx ? p : `${p}40` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'stats-reviews') {
    const totalRating = items.reduce((a: number, t: any) => a + (t.rating || 5), 0);
    const avg = items.length > 0 ? (totalRating / items.length).toFixed(1) : '5.0';
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : `${p}06` }}>
        <div className={containerClass}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 48, alignItems: 'center', marginBottom: 40 }}>
            <div style={{ textAlign: 'center', padding: 32, borderRadius: 24, background: p }}>
              <div style={{ fontSize: '4rem', fontWeight: 800, color: '#fff', fontFamily: theme.fontHeading }}>{avg}</div>
              <Stars rating={5} />
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8 }}>Based on {items.length} reviews</div>
            </div>
            <div>
              {[5, 4, 3].map(star => {
                const count = items.filter((t: any) => (t.rating || 5) === star).length;
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', width: 12 }}>{star}</span>
                    <Star size={12} fill={p} color={p} />
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${items.length ? (count / items.length) * 100 : 0}%`, background: p, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#9ca3af', width: 24 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((t: any, i: number) => (
              <div key={i} style={{ background: cardBg, borderRadius: 16, padding: '18px 20px', border: `1px solid ${cardBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar name={t.name} size={36} />
                  <div><div style={{ fontWeight: 600, fontSize: 14, color: nameColor }}>{t.name}</div><Stars rating={t.rating} /></div>
                </div>
                <p style={{ fontSize: 13, color: quoteColor, lineHeight: 1.6 }}>&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'department-reviews') {
    const depts = [...new Set(items.map((t: any) => t.department || t.role || 'General'))].slice(0, 4);
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          {depts.map((dept: any, di: number) => (
            <div key={di} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: p, background: `${p}14`, padding: '3px 12px', borderRadius: 999 }}>{dept}</span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {items.filter((t: any) => (t.department || t.role || 'General') === dept).slice(0, 3).map((t: any, i: number) => (
                  <div key={i} style={{ background: cardBg, borderRadius: 16, padding: '18px 20px', border: `1px solid ${cardBorder}` }}>
                    <Stars rating={t.rating} />
                    <p style={{ fontSize: 13, color: quoteColor, lineHeight: 1.6, margin: '10px 0', fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={t.name} size={32} /><div style={{ fontWeight: 600, fontSize: 13, color: nameColor }}>{t.name}</div></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'doctor-specific') {
    const doctors = [...new Set(items.map((t: any) => t.doctorName || t.doctor || ''))].filter(Boolean).slice(0, 3);
    return (
      <div className="py-14 sm:py-20" style={{ background: `${p}06` }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid sm:grid-cols-3 gap-6">
            {doctors.map((doc: any, di: number) => {
              const docItems = items.filter((t: any) => (t.doctorName || t.doctor) === doc);
              return (
                <div key={di} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                  <div style={{ background: `linear-gradient(135deg,${p}15,${p}25)`, padding: '20px 20px', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: p, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 22 }}>👨‍⚕️</div>
                    <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14 }}>{doc}</div>
                    <Stars rating={5} />
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {docItems.slice(0, 2).map((t: any, i: number) => (
                      <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < docItems.length - 1 ? `1px solid ${cardBorder}` : 'none' }}>
                        <p style={{ fontSize: 12, color: quoteColor, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>&ldquo;{t.text}&rdquo;</p>
                        <div style={{ fontSize: 11, fontWeight: 600, color: nameColor }}>— {t.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // default: cards
  return (
    <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : `${p}08` }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {items.map((t: any, i: number) => (
            <div key={i} className="rounded-2xl p-5 sm:p-7 flex flex-col gap-4" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.05)' }}>
              <Stars rating={t.rating} />
              <p className="italic leading-relaxed flex-1" style={{ color: quoteColor }}>&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <Avatar name={t.name} />
                <div>
                  <div className="font-semibold text-sm" style={{ color: nameColor }}>{t.name}</div>
                  {t.role && <div className="text-xs mt-0.5" style={{ color: roleColor }}>{t.role}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}