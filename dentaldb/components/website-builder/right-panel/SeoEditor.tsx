'use client';

/**
 * components/website-builder/right-panel/SeoEditor.tsx
 *
 * Four-tab SEO editor embedded in the website builder right panel.
 * Uses inline styles to match the rest of the builder (no Tailwind dependency).
 *
 * DEFENSIVE: All array fields are normalised before use — the DB can return
 * keywords as a comma string or null; aggregateRating as null or wrong shape.
 * Any of those would crash .join()/.map() without this guard.
 */

import React, { useState } from 'react';
import type { SeoConfig } from '../hooks/useBuilderState';
import { EditorImageUpload } from './section-editors/EditorComponents';
import { tokens } from './design-tokens';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely coerce keywords to string[] regardless of what's in the DB */
function normaliseKeywords(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

/** Safely coerce aggregateRating to the expected shape */
function normaliseRating(raw: unknown): { ratingValue?: number; reviewCount?: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  return {
    ratingValue: typeof r.ratingValue === 'number' ? r.ratingValue
      : typeof r.ratingValue === 'string' ? parseFloat(r.ratingValue) || undefined
      : undefined,
    reviewCount: typeof r.reviewCount === 'number' ? r.reviewCount
      : typeof r.reviewCount === 'string' ? parseInt(r.reviewCount, 10) || undefined
      : undefined,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeoEditorProps {
  seo:      SeoConfig;
  onChange: (updated: SeoConfig) => void;
}

type Tab = 'meta' | 'analytics' | 'local' | 'advanced';

const CLINIC_TYPES = [
  'MedicalClinic', 'Dentist', 'Optician', 'Pharmacy', 'Physiotherapist',
] as const;

const TABS: { id: Tab; label: string }[] = [
  { id: 'meta',      label: 'Meta'      },
  { id: 'analytics', label: 'Analytics' },
  { id: 'local',     label: 'Local'     },
  { id: 'advanced',  label: 'Advanced'  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function SeoEditor({ seo, onChange }: SeoEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('meta');

  // Normalise potentially-bad DB values once, before any .join() or .map()
  if (!seo) return null;

  const keywords = normaliseKeywords(seo.keywords);
  const rating   = normaliseRating(seo.aggregateRating);

  const set = <K extends keyof SeoConfig>(key: K, value: SeoConfig[K]) =>
    onChange({ ...seo, [key]: value });

  const setKeywords = (raw: string) =>
    set('keywords', raw.split(',').map(k => k.trim()).filter(Boolean));

  const setRating = (field: 'ratingValue' | 'reviewCount', raw: string) => {
    const num = field === 'ratingValue' ? parseFloat(raw) : parseInt(raw, 10);
    set('aggregateRating', { ...rating, [field]: isNaN(num) ? undefined : num });
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const wrap:      React.CSSProperties = { padding: 12, fontFamily: tokens.font, color: tokens.text, fontSize: 12 };
  const heading:   React.CSSProperties = { fontSize: 10, fontWeight: 700, color: tokens.label, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 };
  const tabBar:    React.CSSProperties = { display: 'flex', gap: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 3, marginBottom: 12 };
  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '5px 4px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
    fontWeight: active ? 600 : 400, fontFamily: tokens.font,
    background: active ? tokens.accent : 'transparent',
    color:      active ? '#fff'     : tokens.muted,
    transition: 'all .12s',
  });
  const section:   React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };
  const divider:   React.CSSProperties = { borderTop: `1px solid ${tokens.border}`, paddingTop: 10, marginTop: 2 };
  const grid2:     React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
  const infoBox:   React.CSSProperties = {
    background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 8,
    padding: 10, fontSize: 11, color: tokens.muted, lineHeight: 1.6,
  };
  const linkBtn = (color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none',
    background: color, color: '#fff', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none', fontFamily: tokens.font,
    transition: 'opacity .12s',
  });

  return (
    <div style={wrap}>
      <p style={heading}>SEO Settings</p>

      {/* Tab bar */}
      <div style={tabBar}>
        {TABS.map(t => (
          <button key={t.id} type="button" style={tabBtn(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Meta ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'meta' && (
        <div style={section}>
          <Field label="Site Title" hint="60 chars max" value={seo.title ?? ''} onChange={v => set('title', v || undefined)} maxLength={60} />
          <Field label="Meta Description" hint="150–160 chars" value={seo.description ?? ''} onChange={v => set('description', v || undefined)} multiline maxLength={160} />
          <Field label="Keywords" hint="comma-separated" value={keywords.join(', ')} onChange={setKeywords} />
          <Field label="OG Image URL" hint="1200×630px recommended" value={seo.ogImage ?? ''} onChange={v => set('ogImage', v || undefined)} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: tokens.label, marginBottom: 6 }}>Favicon</div>
            <div style={{ fontSize: 10, color: tokens.muted, marginBottom: 8 }}>Shown in browser tabs. PNG/ICO/SVG recommended (32×32 or 64×64px)</div>
            <EditorImageUpload
              label="Favicon"
              value={seo.favicon ?? ''}
              onChange={v => set('favicon', v || undefined)}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!seo.noindex}
              onChange={e => set('noindex', e.target.checked || undefined)}
              style={{ width: 13, height: 13, accentColor: tokens.accent }}
            />
            <span style={{ fontSize: 11, color: tokens.label }}>Noindex (hide from Google)</span>
          </label>
        </div>
      )}

      {/* ── Analytics ────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={section}>
          <Field label="Google Analytics ID" hint="G-XXXXXXXXXX" value={seo.googleAnalyticsId ?? ''} onChange={v => set('googleAnalyticsId', v || undefined)} />
          <Field label="Google Tag Manager ID" hint="GTM-XXXXXXX" value={seo.googleTagManagerId ?? ''} onChange={v => set('googleTagManagerId', v || undefined)} />
          <Field label="Facebook Pixel ID" value={seo.facebookPixelId ?? ''} onChange={v => set('facebookPixelId', v || undefined)} />
          <div style={divider}>
            <p style={{ ...heading, marginBottom: 8 }}>Search Console Verification</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Field label="Google Search Console" hint="HTML meta content= value" value={seo.googleSiteVerification ?? ''} onChange={v => set('googleSiteVerification', v || undefined)} />
              <Field label="Bing Webmaster Tools" hint="msvalidate.01 content value" value={seo.bingSiteVerification ?? ''} onChange={v => set('bingSiteVerification', v || undefined)} />
              <Field label="Yandex Verification" value={seo.yandexVerification ?? ''} onChange={v => set('yandexVerification', v || undefined)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Local ────────────────────────────────────────────────────────────── */}
      {activeTab === 'local' && (
        <div style={section}>
          <div style={grid2}>
            <Field label="City" hint="e.g. Kathmandu" value={seo.city ?? ''} onChange={v => set('city', v || undefined)} />
            <Field label="Country" hint="ISO e.g. NP" value={seo.country ?? ''} onChange={v => set('country', v || undefined)} />
            <Field label="Latitude" value={String(seo.latitude ?? '')} onChange={v => set('latitude', v ? parseFloat(v) : undefined)} />
            <Field label="Longitude" value={String(seo.longitude ?? '')} onChange={v => set('longitude', v ? parseFloat(v) : undefined)} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: tokens.label, marginBottom: 4 }}>Clinic Schema Type</p>
            <select
              value={seo.clinicType ?? 'MedicalClinic'}
              onChange={e => set('clinicType', e.target.value)}
              style={{ width: '100%', background: tokens.surfaceDeep, border: `1px solid ${tokens.border}`, borderRadius: 6, padding: '6px 8px', fontSize: 11, color: tokens.text, fontFamily: tokens.font, outline: 'none' }}
            >
              {CLINIC_TYPES.map(t => <option key={t} value={t} style={{ background: '#1a1d24' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: tokens.label, marginBottom: 6 }}>Aggregate Rating</p>
            <div style={grid2}>
              <Field label="Rating (1–5)" value={String(rating.ratingValue ?? '')} onChange={v => setRating('ratingValue', v)} />
              <Field label="Review Count" value={String(rating.reviewCount ?? '')} onChange={v => setRating('reviewCount', v)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced ─────────────────────────────────────────────────────────── */}
      {activeTab === 'advanced' && (
        <div style={section}>
          <Field
            label="Canonical Domain Override"
            hint="Without https:// — e.g. www.myclinic.com"
            value={seo.canonicalDomain ?? ''}
            onChange={v => set('canonicalDomain', v || undefined)}
          />
          <div style={infoBox}>
            <p style={{ fontWeight: 700, color: tokens.text, marginBottom: 6 }}>Auto-generated for every site:</p>
            {[
              ['sitemap.xml', 'all pages, doctors, blog posts, categories'],
              ['robots.txt', 'env-aware, blocks admin routes'],
              ['JSON-LD', 'MedicalClinic + LocalBusiness + FAQPage + Breadcrumb'],
              ['Open Graph', 'Twitter cards on every page'],
              ['Canonical URLs', 'trailing-slash normalisation'],
              ['manifest.webmanifest', 'PWA / favicon support'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                <span style={{ color: tokens.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
                <span style={{ color: tokens.muted }}>— {v}</span>
              </div>
            ))}
          </div>
          <a href="/dashboard/seo" target="_blank" rel="noopener noreferrer" style={linkBtn(tokens.accent)}>
            <span>🔍 Full SEO Dashboard</span>
            <span style={{ opacity: 0.7 }}>↗</span>
          </a>
          <a href="/dashboard/seo" target="_blank" rel="noopener noreferrer" style={linkBtn('#059669')}>
            <span>✍️ Manage Blog Posts</span>
            <span style={{ opacity: 0.7 }}>↗</span>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({
  label, hint, value, onChange, multiline, maxLength,
}: {
  label:      string;
  hint?:      string;
  value:      string;
  onChange:   (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  const over = maxLength !== undefined && value.length > maxLength;

  const inputSt: React.CSSProperties = {
    width: '100%', fontSize: 11, fontFamily: "'Inter','Geist',system-ui,sans-serif",
    color: '#e2e4ef', background: 'rgba(0,0,0,0.25)',
    border: `1px solid ${over ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 6, padding: '6px 8px', outline: 'none',
    boxSizing: 'border-box', resize: multiline ? 'vertical' : undefined,
    transition: 'border-color .12s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8' }}>{label}</span>
        {maxLength !== undefined && (
          <span style={{ fontSize: 10, color: over ? '#ef4444' : '#4b5060' }}>{value.length}/{maxLength}</span>
        )}
      </div>
      {hint && <span style={{ fontSize: 10, color: '#4b5060' }}>{hint}</span>}
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={inputSt} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} style={inputSt} />
      )}
    </div>
  );
}