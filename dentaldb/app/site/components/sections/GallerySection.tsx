'use client';

import React from 'react';
import Image from 'next/image';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function GallerySection({ s, theme, containerClass }: SecProps) {
  const cols = (s.columns as number) || 3;
  const p = theme.primaryColor;
  const variant = (s.variant as string) ?? 'grid';
  const items: any[] = (s.items as any[]) || [];

  const Box = ({ i, style = {} }: { i: number; style?: React.CSSProperties }) => {
    const item = items[i];
    const imgUrl = item?.url ? resolveImageUrl(item.url) : '';
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', background: `${p}${12 + (i % 4) * 8}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', ...style }}>
        {imgUrl ? <img src={imgUrl} alt={item?.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, opacity: 0.4 }}>🖼</span>}
      </div>
    );
  };

  if (variant === 'masonry') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f9fafb' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ columns: cols, gap: 12 }}>
            {(items.length ? items : Array(9).fill({})).map((_: any, i: number) => (
              <div key={i} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                <Box i={i} style={{ height: i % 3 === 0 ? 200 : i % 3 === 1 ? 140 : 160 }} />
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
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gridTemplateRows: '200px 160px', gap: 12 }}>
            <Box i={0} style={{ gridColumn: 'span 2', gridRow: 'span 2' }} />
            <Box i={1} /><Box i={2} /><Box i={3} /><Box i={4} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'before-after') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Before & After'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  <div>
                    <div style={{ height: 160, background: '#94a3b820', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 20, opacity: 0.5 }}>🖼</span></div>
                    <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#6b7280' }}>BEFORE</div>
                  </div>
                  <div>
                    <div style={{ height: 160, background: `${p}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 20, opacity: 0.5 }}>🖼</span></div>
                    <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 600, background: `${p}15`, color: p }}>AFTER</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'clinic-tour') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Clinic Tour'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '240px 180px', gap: 12 }}>
            <Box i={0} style={{ gridRow: 'span 2' }} />
            <Box i={1} /><Box i={2} /><Box i={3} /><Box i={4} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'lightbox') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{(s.title as string) || 'Gallery'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.5)' }}>{s.subtitle as string}</p>}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
            {(items.length ? items : Array(9).fill({})).map((_: any, i: number) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: `${p}${15 + i * 6}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {items[i]?.url ? <img src={resolveImageUrl(items[i].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24, opacity: 0.3 }}>🖼</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'luxury') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fafaf9' }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 40, height: 1, background: theme.accentColor || p, margin: '0 auto 16px' }} />
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 300, color: theme.textColor, letterSpacing: '-0.02em', marginBottom: 8 }}>{(s.title as string) || 'Our Gallery'}</h2>
            {s.subtitle && <p style={{ color: '#9ca3af', fontSize: 14 }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Box i={0} style={{ aspectRatio: '16/9' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              {[1, 2, 3, 4].map(i => <Box key={i} i={i} style={{ aspectRatio: '1' }} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'equipment') {
    const equipmentNames = ['MRI Scanner', 'X-Ray', 'Ultrasound', 'ECG', 'Endoscope', 'Lab Analyzer'];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Equipment'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
            {equipmentNames.map((name, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <div style={{ height: 140, background: `${p}${12 + i * 7}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {items[i]?.url ? <img src={resolveImageUrl(items[i].url)} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 36, opacity: 0.5 }}>🔬</span>}
                </div>
                <div style={{ padding: '12px 16px', background: 'white' }}>
                  <div style={{ fontWeight: 600, color: theme.textColor, fontSize: 13 }}>{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'carousel-gallery') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {(items.length ? items : Array(8).fill({})).map((_: any, i: number) => (
              <div key={i} style={{ minWidth: 240, flexShrink: 0, borderRadius: 16, overflow: 'hidden' }}>
                <Box i={i} style={{ height: 180 }} />
                {items[i]?.caption && <div style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{items[i].caption}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'department-gallery') {
    const depts = [{ name: 'Reception', icon: '🏥' }, { name: 'Consultation', icon: '🩺' }, { name: 'Lab', icon: '🔬' }, { name: 'Equipment', icon: '💊' }];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Facilities'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
            {depts.map((d, i) => (
              <button key={i} style={{ padding: '7px 16px', borderRadius: 999, border: `1.5px solid ${i === 0 ? p : '#e5e7eb'}`, background: i === 0 ? p : 'white', color: i === 0 ? '#fff' : theme.textColor, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{d.icon}</span>{d.name}
              </button>
            ))}
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
            {(items.length ? items : Array(9).fill({})).map((_: any, i: number) => <Box key={i} i={i} style={{ aspectRatio: '4/3' }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stacked-modern') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Box i={0} style={{ height: 280, borderRadius: 16 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                <Box i={1} style={{ height: 140, borderRadius: 14 }} />
                <Box i={2} style={{ height: 140, borderRadius: 14 }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                <Box i={3} style={{ height: 140, borderRadius: 14 }} />
                <Box i={4} style={{ height: 140, borderRadius: 14 }} />
              </div>
              <Box i={5} style={{ height: 280, borderRadius: 16 }} />
            </div>
          </div>
          {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: theme.textColor, textAlign: 'center', marginTop: 24 }}>{s.title as string}</h2>}
        </div>
      </div>
    );
  }

  // default: grid
  return (
    <div className="py-14 sm:py-20" style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(100 / cols) - 2}%, 1fr))` }}>
          {items.map((item: any, i: number) => (
            <div key={i} className="aspect-video rounded-xl overflow-hidden relative bg-gray-200">
              {item.url && (
                <Image src={resolveImageUrl(item.url)} alt={(item.caption as string) || ''} fill className="object-cover hover:scale-105 transition-transform duration-300" unoptimized />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}