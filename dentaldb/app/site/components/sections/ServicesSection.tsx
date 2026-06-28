'use client';

import React from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

// ── ServiceIcon — renders an image, emoji, or primary-color fallback ──────────
function ServiceIcon({
  item, size = 32, containerSize = 52, primaryColor, rounded = 'rounded-xl',
}: {
  item: any; size?: number; containerSize?: number; primaryColor: string; rounded?: string;
}) {
  const imgUrl = resolveImageUrl(item.image || item.imageUrl || item.icon_url || '');
  const icon   = item.icon as string | undefined;
  const hasImg = !!imgUrl;
  // An emoji is a string that starts with a non-ASCII character or is a known emoji pattern
  const isEmoji = !hasImg && !!icon && /\p{Emoji}/u.test(icon) && icon.length <= 4;
  const isText  = !hasImg && !!icon && !isEmoji; // Lucide icon name or plain text label

  return (
    <div style={{
      width: containerSize, height: containerSize, borderRadius: rounded === 'full' ? '50%' : 12,
      background: hasImg ? 'transparent' : `${primaryColor}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {hasImg ? (
        <Image
          src={imgUrl} alt={item.title || ''} width={containerSize} height={containerSize}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          unoptimized
        />
      ) : isEmoji ? (
        <span style={{ fontSize: size }}>{icon}</span>
      ) : isText ? (
        <span style={{ fontSize: Math.round(size * 0.6), fontWeight: 800, color: primaryColor, letterSpacing: '-0.02em' }}>
          {icon.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <span style={{ fontSize: size, color: primaryColor }}>+</span>
      )}
    </div>
  );
}

export function ServicesSection({ s, theme, subdomain, containerClass }: SecProps) {
  const { data: liveServices } = useQuery<any[]>({
    queryKey:  ['services', subdomain],
    queryFn:   () => websitePublicApi.getServices(subdomain),
    // Auto-pull unless explicitly set to 'manual' — undefined/live-api both auto-pull
    enabled:   s.dataSource !== 'manual',
    staleTime: 300_000,
  });

  const p = theme.primaryColor;
  // Normalize variant — 'classic' was an old alias for 'cards'
  const rawVariant = (s.variant as string) ?? 'cards';
  const variant    = rawVariant === 'classic' ? 'cards' : rawVariant;
  const cols = (s.columns as number) || 3;

  const hasManualItems = Array.isArray(s.items) && (s.items as any[]).length > 0;
  // Priority: live API data (when not manual) → manual items → empty
  const displayItems: any[] = (liveServices?.length && s.dataSource !== 'manual')
    ? liveServices.map(svc => ({
        title:       svc.name,
        description: svc.description || '',
        price:       svc.price ? `NPR ${Number(svc.price).toLocaleString()}` : null,
        icon:        svc.icon || '🩺',
        duration:    svc.duration ? `${svc.duration} min` : null,
      }))
    : hasManualItems ? (s.items as any[]) : [];

  const colStyle = { gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 4 ? '200px' : cols === 2 ? '320px' : '260px'}, 1fr))` };

  if (variant === 'premium-cards') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-6" style={colStyle}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${p}15` }}>
                <div style={{ height: 6, background: `linear-gradient(90deg,${p},${theme.accentColor || p})` }} />
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon || '🏥'}</div>
                  <h3 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: theme.textColor, fontSize: 16, marginBottom: 10 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>{item.description}</p>
                  {s.showPrices !== false && item.price && <div style={{ fontWeight: 700, color: p }}>{item.price}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento-grid') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {displayItems.slice(0, 6).map((item: any, i: number) => (
              <div key={i} style={{ borderRadius: 20, padding: 28, background: i === 0 ? `linear-gradient(135deg,${p},${theme.secondaryColor || p})` : i === 3 ? p : 'white', color: i === 0 || i === 3 ? '#fff' : theme.textColor, boxShadow: i === 0 || i === 3 ? `0 8px 32px ${p}40` : '0 2px 12px rgba(0,0,0,0.06)', gridColumn: i === 0 ? 'span 2' : undefined }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon || '🏥'}</div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 13, opacity: i === 0 || i === 3 ? 0.85 : 0.6, lineHeight: 1.5 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'icon-based') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-8" style={colStyle}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${p}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `2px solid ${p}20` }}>
                  <span style={{ fontSize: 30 }}>{item.icon || '🏥'}</span>
                </div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{item.description}</p>
                {s.showPrices !== false && item.price && <div style={{ marginTop: 8, fontWeight: 700, color: p, fontSize: 13 }}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'accordion') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="max-w-2xl mx-auto space-y-3">
            {displayItems.map((item: any, i: number) => (
              <details key={i} style={{ borderRadius: 12, border: `1px solid ${p}20`, overflow: 'hidden' }}>
                <summary style={{ padding: '16px 20px', fontWeight: 600, color: theme.textColor, cursor: 'pointer', background: `${p}06`, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{item.icon && `${item.icon} `}{item.title}</span>
                  {s.showPrices !== false && item.price && <span style={{ color: p, fontWeight: 700 }}>{item.price}</span>}
                </summary>
                <div style={{ padding: '14px 20px', color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>{item.description}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'tabs') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, justifyContent: 'center' }}>
            {displayItems.slice(0, 5).map((item: any, i: number) => (
              <button key={i} style={{ padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: i === 0 ? p : 'white', color: i === 0 ? '#fff' : theme.textColor, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{item.title || `Service ${i + 1}`}</button>
            ))}
          </div>
          {displayItems[0] && (
            <div style={{ background: 'white', borderRadius: 20, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 40, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}><span style={{ fontSize: 64 }}>{displayItems[0].icon || '🏥'}</span></div>
              <div>
                <h3 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{displayItems[0].title}</h3>
                <p style={{ color: '#6b7280', lineHeight: 1.7 }}>{displayItems[0].description || 'Comprehensive care for all your needs.'}</p>
                {s.showPrices !== false && displayItems[0].price && <div style={{ marginTop: 12, fontWeight: 700, color: p }}>{displayItems[0].price}</div>}
                <a href="#booking" style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', borderRadius: 8, background: p, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Book This Service</a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'image-first') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-5" style={colStyle}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
                <div style={{ height: 160, background: `linear-gradient(135deg,${p}${20 + i * 10},${theme.secondaryColor || p}${30 + i * 8})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 48 }}>{item.icon || '🏥'}</span>
                </div>
                <div style={{ padding: '18px 20px', background: 'white' }}>
                  <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 6 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{item.description}</p>
                  {s.showPrices !== false && item.price && <div style={{ marginTop: 8, fontWeight: 700, color: p }}>{item.price}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'treatment-pathway') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: p, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>{i + 1}</div>
                  {i < displayItems.length - 1 && <div style={{ width: 2, flex: 1, background: `${p}30`, marginTop: 4, minHeight: 24 }} />}
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', flex: 1, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{item.icon || '🏥'}</span>
                    <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15 }}>{item.title}</h3>
                    {s.showPrices !== false && item.price && <span style={{ marginLeft: 'auto', fontWeight: 700, color: p }}>{item.price}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal-scroll') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ minWidth: 240, background: '#f8faff', borderRadius: 20, padding: 24, border: `1px solid ${p}12`, flexShrink: 0 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{item.icon || '🏥'}</div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 8, fontSize: 15 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{item.description}</p>
                {s.showPrices !== false && item.price && <div style={{ marginTop: 10, fontWeight: 700, color: p }}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category-groups') {
    const cats: any[] = (s.categories as any[]) || [{ name: 'General', items: displayItems.slice(0, 3) }, { name: 'Specialist', items: displayItems.slice(3, 6) }];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          {cats.map((cat: any, ci: number) => (
            <div key={ci} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <h3 style={{ fontFamily: theme.fontHeading, fontSize: '1.1rem', fontWeight: 700, color: theme.textColor }}>{cat.name}</h3>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {(cat.items || displayItems.slice(0, 3)).map((item: any, i: number) => (
                  <div key={i} style={{ background: '#f8faff', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'flex-start', border: `1px solid ${p}10` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 18 }}>{item.icon || '🏥'}</span>
                    </div>
                    <div><div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 4 }}>{item.title}</div><div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{item.description}</div></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'department-showcase') {
    return (
      <div className="py-14 sm:py-20" style={{ background: p }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{(s.title as string) || 'Our Departments'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.7)' }}>{s.subtitle as string}</p>}
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{item.icon || '🏥'}</div>
                <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{item.description}</p>
                {s.showPrices !== false && item.price && <div style={{ marginTop: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'interactive-hover') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `1px solid ${p}10` }}>
                <div style={{ height: 180, background: `linear-gradient(135deg,${p}${18 + i * 8},${theme.secondaryColor || p}${25 + i * 6})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 52 }}>{item.icon || '🏥'}</span>
                </div>
                <div style={{ padding: '20px 22px', background: 'white' }}>
                  <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 6, fontSize: 15 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{item.description}</p>
                  {s.showPrices !== false && item.price && <div style={{ marginTop: 8, fontWeight: 700, color: p }}>{item.price}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'specialist-grid') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Medical Specialties'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: '20px 16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${p}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span style={{ fontSize: 26 }}>{item.icon || '🩺'}</span>
                </div>
                <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{item.description}</div>
                {s.showPrices !== false && item.price && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: p }}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'masonry-grid') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ columns: cols, gap: 16 }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 16, borderRadius: 16, overflow: 'hidden', background: '#f8faff', border: `1px solid ${p}10` }}>
                <div style={{ height: i % 3 === 0 ? 180 : i % 3 === 1 ? 140 : 120, background: `linear-gradient(135deg,${p}${15 + i * 6},${theme.secondaryColor || p}${20 + i * 5})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: i % 3 === 0 ? 48 : 36 }}>{item.icon || '🏥'}</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 4 }}>{item.title}</h3>
                  <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'cards' || variant === 'classic') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f9fafb' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {displayItems.map((item: any, i: number) => (
              <div key={i} style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.08)' : 'white', borderRadius: 16, padding: 24, boxShadow: isColorDark(theme.backgroundColor) ? 'none' : '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${p}10` }}>
                {s.showIcons !== false && (
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 24 }}>{item.icon || '🩺'}</span>
                  </div>
                )}
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 8, fontSize: 15 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.description}</p>
                {s.showPrices !== false && item.price && <div style={{ marginTop: 12, fontWeight: 700, color: p }}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default
  const isDark = isColorDark(theme.backgroundColor);
  return (
    <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="grid gap-4 sm:gap-6" style={colStyle}>
          {displayItems.map((item: any, i: number) => (
            <div key={i} className="rounded-2xl p-5 sm:p-7 transition-all hover:scale-[1.02]" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}`, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.05)' }}>
              {s.showIcons !== false && item.icon && (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl" style={{ background: `${p}15` }}>
                  <span>{item.icon}</span>
                </div>
              )}
              <h3 className="font-bold text-base sm:text-lg mb-2" style={{ fontFamily: theme.fontHeading, color: isDark ? 'rgba(255,255,255,0.95)' : '#111827' }}>{item.title}</h3>
              <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280', fontSize: 14, lineHeight: 1.6 }}>{item.description}</p>
              {s.showPrices !== false && item.price && <div style={{ marginTop: 10, fontWeight: 700, color: p }}>{item.price}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}