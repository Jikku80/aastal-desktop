'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useBuilderStore } from '../hooks/useBuilderState';
import type { GlobalSettings, NavVariant, FooterVariant } from '../hooks/useBuilderState';
import { EditorField, EditorToggle, EditorImageUpload, EditorSection, EditorColorPicker } from './section-editors/EditorComponents';

type NavSettings    = GlobalSettings['nav'];
type FooterSettings = GlobalSettings['footer'];
type FooterColumn   = FooterSettings['columns'][number];
type FooterLink     = FooterColumn['links'][number];
type NavLink        = NavSettings['links'][number];

const dk = {
  bg:      '#111318',
  border:  'rgba(255,255,255,0.08)',
  surface: 'rgba(255,255,255,0.04)',
  text:    '#e2e4ef',
  muted:   '#6b7080',
  label:   '#8b8fa8',
  accent:  '#6366f1',
  font:    "'Inter','Geist','Segoe UI',system-ui,sans-serif",
};

const inputCls: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)',
  border: `1px solid ${dk.border}`, borderRadius: 7,
  padding: '6px 10px', fontSize: 12, color: dk.text,
  fontFamily: dk.font, outline: 'none', boxSizing: 'border-box',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: dk.label,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  marginBottom: 10, fontFamily: dk.font,
};

// ── Variant card picker ────────────────────────────────────────────────────────
function VariantPicker<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; preview: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div style={sectionLabel}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: 0, border: `2px solid ${value === opt.value ? '#6366f1' : dk.border}`,
              borderRadius: 10, cursor: 'pointer', background: value === opt.value ? 'rgba(99,102,241,0.1)' : dk.surface,
              overflow: 'hidden', transition: 'all 0.15s', outline: 'none',
            }}
          >
            <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${dk.border}` }}>
              {opt.preview}
            </div>
            <div style={{ fontSize: 10, color: value === opt.value ? '#818cf8' : dk.muted, padding: '5px 6px', fontFamily: dk.font, fontWeight: value === opt.value ? 600 : 400 }}>
              {opt.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Mini nav previews ─────────────────────────────────────────────────────────
const NavPreviewClassic = () => (
  <div style={{ width: '100%', height: '100%', background: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
    <div style={{ width: 28, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.9)' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 14, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }} />)}
    </div>
    <div style={{ padding: '3px 8px', borderRadius: 4, background: '#f59e0b', fontSize: 8, color: '#fff', fontWeight: 700 }}>CTA</div>
  </div>
);

const NavPreviewCentered = () => (
  <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e5e7eb' }}>
    <div style={{ width: 28, height: 7, borderRadius: 3, background: '#1e40af', marginBottom: 6 }} />
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 12, height: 4, borderRadius: 3, background: '#9ca3af' }} />)}
    </div>
  </div>
);

const NavPreviewMinimal = () => (
  <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', borderBottom: '1px solid #f3f4f6' }}>
    <div style={{ width: 24, height: 7, borderRadius: 3, background: '#111827' }} />
    <div style={{ display: 'flex', gap: 5 }}>
      {[1,2].map(i => <div key={i} style={{ width: 12, height: 4, borderRadius: 3, background: '#9ca3af' }} />)}
    </div>
    <div style={{ fontSize: 8, color: '#6366f1', fontWeight: 700 }}>Go →</div>
  </div>
);

const NavPreviewDark = () => (
  <div style={{ width: '100%', height: '100%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
    <div style={{ width: 26, height: 7, borderRadius: 3, background: 'rgba(255,255,255,0.9)' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 12, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.4)' }} />)}
    </div>
    <div style={{ padding: '3px 7px', borderRadius: 4, background: '#6366f1', fontSize: 8, color: '#fff', fontWeight: 700 }}>CTA</div>
  </div>
);

const NavPreviewTransparent = () => (
  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', position: 'relative' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }} />
    <div style={{ width: 26, height: 7, borderRadius: 3, background: 'rgba(255,255,255,0.9)', position: 'relative' }} />
    <div style={{ display: 'flex', gap: 5, position: 'relative' }}>
      {[1,2].map(i => <div key={i} style={{ width: 12, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.7)' }} />)}
    </div>
  </div>
);

// ── Mini footer previews ──────────────────────────────────────────────────────
const FooterPreviewClassic = () => (
  <div style={{ width: '100%', height: '100%', background: '#111827', display: 'flex', alignItems: 'flex-start', padding: '8px 10px', gap: 10 }}>
    <div style={{ flex: 1 }}>
      <div style={{ width: 22, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.8)', marginBottom: 4 }} />
      {[1,2].map(i => <div key={i} style={{ width: 30, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)', marginBottom: 3 }} />)}
    </div>
    {[1,2].map(col => (
      <div key={col} style={{ flex: 1 }}>
        {[1,2,3].map(i => <div key={i} style={{ width: 24, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)', marginBottom: 3 }} />)}
      </div>
    ))}
  </div>
);

const FooterPreviewMinimal = () => (
  <div style={{ width: '100%', height: '100%', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
    <div style={{ width: 22, height: 5, borderRadius: 2, background: '#374151' }} />
    <div style={{ display: 'flex', gap: 5 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 12, height: 3, borderRadius: 2, background: '#9ca3af' }} />)}
    </div>
    <div style={{ width: 24, height: 3, borderRadius: 2, background: '#d1d5db' }} />
  </div>
);

const FooterPreviewDark = () => (
  <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
    <div style={{ width: 22, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.8)' }} />
    <div style={{ display: 'flex', gap: 8 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />)}
    </div>
    <div style={{ width: 28, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
  </div>
);

const FooterPreviewCentered = () => (
  <div style={{ width: '100%', height: '100%', background: '#1e40af', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
    <div style={{ width: 24, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.9)' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 12, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />)}
    </div>
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />)}
    </div>
  </div>
);

const FooterPreviewColumnsOnly = () => (
  <div style={{ width: '100%', height: '100%', background: '#1f2937', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '8px 10px', alignItems: 'start' }}>
    {[1,2,3].map(col => (
      <div key={col}>
        <div style={{ width: 20, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.8)', marginBottom: 5 }} />
        {[1,2,3].map(i => <div key={i} style={{ width: 24, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)', marginBottom: 3 }} />)}
      </div>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export function GlobalSettingsEditor() {
  const { globalSettings, setGlobalSettings, pages } = useBuilderStore();
  const [activeTab, setActiveTab] = useState<'nav' | 'footer'>('nav');

  const nav:    NavSettings    = globalSettings.nav;
  const footer: FooterSettings = globalSettings.footer;

  const setNav    = (updates: Partial<NavSettings>)    => setGlobalSettings({ nav:    { ...nav,    ...updates } });
  const setFooter = (updates: Partial<FooterSettings>) => setGlobalSettings({ footer: { ...footer, ...updates } });

  const setFooterSocials = (updates: Partial<NonNullable<FooterSettings['socials']>>) =>
    setFooter({ socials: { ...(footer.socials ?? {}), ...updates } });

  const updateNavLink = (i: number, patch: Partial<NavLink>) =>
    setNav({ links: nav.links.map((l, idx) => idx === i ? { ...l, ...patch } : l) });
  const removeNavLink = (i: number) =>
    setNav({ links: nav.links.filter((_, idx) => idx !== i) });
  const addNavLink = () =>
    setNav({ links: [...nav.links, { label: 'New Link', pageId: pages[0]?.id ?? '' }] });

  const updateColumn = (i: number, patch: Partial<FooterColumn>) =>
    setFooter({ columns: footer.columns.map((c, ci) => ci === i ? { ...c, ...patch } : c) });
  const removeColumn = (i: number) =>
    setFooter({ columns: footer.columns.filter((_, ci) => ci !== i) });
  const addColumn = () =>
    setFooter({ columns: [...footer.columns, { heading: 'Column', links: [] }] });

  const updateColLink = (colIdx: number, linkIdx: number, patch: Partial<FooterLink>) =>
    setFooter({
      columns: footer.columns.map((c, ci) =>
        ci !== colIdx ? c : { ...c, links: c.links.map((l, li) => li !== linkIdx ? l : { ...l, ...patch }) }
      ),
    });
  const removeColLink = (colIdx: number, linkIdx: number) =>
    setFooter({
      columns: footer.columns.map((c, ci) =>
        ci !== colIdx ? c : { ...c, links: c.links.filter((_, li) => li !== linkIdx) }
      ),
    });
  const addColLink = (colIdx: number) =>
    setFooter({
      columns: footer.columns.map((c, ci) =>
        ci !== colIdx ? c : { ...c, links: [...c.links, { label: '', href: '' }] }
      ),
    });

  return (
    <div style={{ background: dk.bg, minHeight: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${dk.border}`,
        background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {(['nav', 'footer'] as const).map(tab => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: active ? '#818cf8' : dk.muted,
                fontSize: 11, fontWeight: active ? 600 : 400,
                fontFamily: dk.font,
                borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.15s', textTransform: 'capitalize', letterSpacing: '0.02em',
              }}
            >
              {tab === 'nav' ? '🧭 Navigation' : '🦶 Footer'}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── NAV TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === 'nav' && (
          <>
            {/* Variant picker */}
            <VariantPicker<NavVariant>
              label="Navigation Style"
              value={nav.variant ?? 'classic'}
              onChange={v => setNav({ variant: v })}
              options={[
                { value: 'classic',           label: 'Classic',        preview: <NavPreviewClassic /> },
                { value: 'centered',          label: 'Centered',       preview: <NavPreviewCentered /> },
                { value: 'minimal',           label: 'Minimal',        preview: <NavPreviewMinimal /> },
                { value: 'dark',              label: 'Dark',           preview: <NavPreviewDark /> },
                { value: 'transparent-light', label: 'Transparent',    preview: <NavPreviewTransparent /> },
                { value: 'transparent-dark',  label: 'Trans. Dark',    preview: <NavPreviewDark /> },
                { value: 'gradient',          label: 'Gradient',       preview: <NavPreviewClassic /> },
                { value: 'glass',             label: 'Glass',          preview: <NavPreviewTransparent /> },
                { value: 'colored',           label: 'Colored',        preview: <NavPreviewClassic /> },
                { value: 'white-shadow',      label: 'White Shadow',   preview: <NavPreviewMinimal /> },
              ]}
            />

            <EditorSection title="Logo">
              <EditorImageUpload
                label="Logo Image"
                value={nav.logo}
                onChange={v => setNav({ logo: v })}
              />
              <EditorField
                label="Logo Text (fallback)"
                value={nav.logoText}
                onChange={v => setNav({ logoText: v })}
                placeholder="Clinic Name"
              />
              {/* Logo alignment */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: dk.muted, marginBottom: 5, fontFamily: dk.font }}>Logo Alignment</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setNav({ logoAlign: a } as any)}
                      style={{
                        flex: 1, padding: '6px 4px', borderRadius: 6, border: '1px solid', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, fontFamily: dk.font,
                        borderColor: ((nav as any).logoAlign ?? 'left') === a ? dk.accent : dk.border,
                        background:  ((nav as any).logoAlign ?? 'left') === a ? `${dk.accent}18` : dk.surface,
                        color:       ((nav as any).logoAlign ?? 'left') === a ? dk.accent : dk.muted,
                      }}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Logo size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: dk.muted, marginBottom: 5, fontFamily: dk.font }}>Height (px)</label>
                  <input
                    type="number" min={20} max={120}
                    value={(nav as any).logoHeight ?? 36}
                    onChange={e => setNav({ logoHeight: Number(e.target.value) } as any)}
                    style={inputCls}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: dk.muted, marginBottom: 5, fontFamily: dk.font }}>Width (px, optional)</label>
                  <input
                    type="number" min={0} max={400}
                    value={(nav as any).logoWidth ?? ''}
                    placeholder="auto"
                    onChange={e => setNav({ logoWidth: e.target.value ? Number(e.target.value) : undefined } as any)}
                    style={inputCls}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: dk.muted, marginBottom: 5, fontFamily: dk.font }}>Text Logo Font Size (px)</label>
                <input
                  type="number" min={10} max={48}
                  value={(nav as any).logoFontSize ?? 18}
                  onChange={e => setNav({ logoFontSize: Number(e.target.value) } as any)}
                  style={inputCls}
                />
              </div>
            </EditorSection>

            <EditorSection title="Behaviour">
              <EditorToggle
                label="Sticky Navbar"
                checked={nav.sticky !== false}
                onChange={v => setNav({ sticky: v })}
                description="Stick to top when scrolling"
              />
              <EditorToggle
                label="Transparent on Hero"
                checked={nav.transparent !== false}
                onChange={v => setNav({ transparent: v })}
                description="Transparent over hero section"
              />
            </EditorSection>

            <EditorSection title="Colors">
              <EditorColorPicker
                label="Custom Background Color"
                value={nav.bgColor ?? ''}
                onChange={v => setNav({ bgColor: v || undefined } as any)}
              />
              <EditorColorPicker
                label="Link / Text Color"
                value={nav.textColor ?? ''}
                onChange={v => setNav({ textColor: v || undefined } as any)}
              />
            </EditorSection>

            <EditorSection title="CTA Button">
              <EditorField
                label="Button Text"
                value={nav.ctaButton?.text}
                onChange={v => setNav({ ctaButton: { ...nav.ctaButton, text: v, action: nav.ctaButton?.action ?? 'book' } })}
                placeholder="Book Appointment"
              />
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: dk.muted, marginBottom: 5, fontFamily: dk.font }}>Action</label>
                <select
                  value={nav.ctaButton?.action ?? 'book'}
                  onChange={e => setNav({
                    ctaButton: { ...nav.ctaButton, text: nav.ctaButton?.text ?? 'Book Appointment', action: e.target.value as 'book' | 'call' | 'link' },
                  })}
                  style={inputCls}
                >
                  <option value="book">Scroll to Booking</option>
                  <option value="call">Call Phone</option>
                  <option value="link">Link to URL</option>
                </select>
              </div>
              {(nav.ctaButton?.action === 'call' || nav.ctaButton?.action === 'link') && (
                <EditorField
                  label={nav.ctaButton?.action === 'call' ? 'Phone Number' : 'URL'}
                  value={nav.ctaButton?.value}
                  onChange={v => setNav({ ctaButton: { text: nav.ctaButton?.text ?? '', action: nav.ctaButton?.action ?? 'link', value: v } })}
                  placeholder={nav.ctaButton?.action === 'call' ? '+1 234 567 8900' : 'https://...'}
                />
              )}
            </EditorSection>

            <EditorSection title="Navigation Links">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nav.links.map((link, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={link.label}
                      onChange={e => updateNavLink(i, { label: e.target.value })}
                      placeholder="Label"
                      style={{ ...inputCls, flex: 1 }}
                    />
                    <select
                      value={link.pageId}
                      onChange={e => updateNavLink(i, { pageId: e.target.value })}
                      style={{ ...inputCls, flex: 1 }}
                    >
                      {pages.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                    <button onClick={() => removeNavLink(i)} style={{ color: dk.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addNavLink}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  <Plus size={12} /> Add Link
                </button>
              </div>
            </EditorSection>
          </>
        )}

        {/* ── FOOTER TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'footer' && (
          <>
            {/* Variant picker */}
            <VariantPicker<FooterVariant>
              label="Footer Style"
              value={footer.variant ?? 'classic'}
              onChange={v => setFooter({ variant: v })}
              options={[
                { value: 'classic',      label: 'Classic',      preview: <FooterPreviewClassic /> },
                { value: 'minimal',      label: 'Minimal',      preview: <FooterPreviewMinimal /> },
                { value: 'dark',         label: 'Dark',         preview: <FooterPreviewDark /> },
                { value: 'centered',     label: 'Centered',     preview: <FooterPreviewCentered /> },
                { value: 'columns-only', label: 'Columns',      preview: <FooterPreviewColumnsOnly /> },
              ]}
            />

            <EditorSection title="Content">
              <EditorField
                label="Tagline"
                value={footer.tagline}
                onChange={v => setFooter({ tagline: v })}
                placeholder="Quality healthcare for everyone."
              />
              <EditorField
                label="Copyright Text"
                value={footer.copyrightText}
                onChange={v => setFooter({ copyrightText: v })}
                placeholder={`© ${new Date().getFullYear()} Clinic Name`}
              />
              <EditorColorPicker
                label="Background Color"
                value={footer.bgColor ?? ''}
                onChange={v => setFooter({ bgColor: v || undefined } as any)}
              />
              <EditorToggle
                label="Show 'Powered by' link"
                checked={footer.showPoweredBy !== false}
                onChange={v => setFooter({ showPoweredBy: v })}
              />
            </EditorSection>

            <EditorSection title="Social Links">
              <EditorToggle
                label="Show Social Icons"
                checked={footer.showSocials !== false}
                onChange={v => setFooter({ showSocials: v })}
              />
              {footer.showSocials !== false && (
                <>
                  <EditorField label="Facebook URL"  value={footer.socials?.facebook}  onChange={v => setFooterSocials({ facebook: v })}  placeholder="https://facebook.com/..." />
                  <EditorField label="Instagram URL" value={footer.socials?.instagram} onChange={v => setFooterSocials({ instagram: v })} placeholder="https://instagram.com/..." />
                  <EditorField label="Twitter URL"   value={footer.socials?.twitter}   onChange={v => setFooterSocials({ twitter: v })}   placeholder="https://twitter.com/..." />
                  <EditorField label="YouTube URL"   value={footer.socials?.youtube}   onChange={v => setFooterSocials({ youtube: v })}   placeholder="https://youtube.com/..." />
                  <EditorField label="TikTok URL"    value={footer.socials?.tiktok}    onChange={v => setFooterSocials({ tiktok: v })}    placeholder="https://tiktok.com/@..." />
                </>
              )}
            </EditorSection>

            <EditorSection title="Footer Columns">
              {footer.columns.map((col, i) => (
                <div key={i} style={{ border: `1px solid ${dk.border}`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <input
                      value={col.heading}
                      onChange={e => updateColumn(i, { heading: e.target.value })}
                      placeholder="Column Heading"
                      style={{ ...inputCls, fontWeight: 600, flex: 1 }}
                    />
                    <button onClick={() => removeColumn(i)} style={{ marginLeft: 8, color: dk.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {col.links.map((link, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input value={link.label} onChange={e => updateColLink(i, j, { label: e.target.value })} placeholder="Label" style={{ ...inputCls, flex: 1 }} />
                      <input value={link.href}  onChange={e => updateColLink(i, j, { href: e.target.value })}  placeholder="/page or https://..." style={{ ...inputCls, flex: 1 }} />
                      <button onClick={() => removeColLink(i, j)} style={{ color: dk.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addColLink(i)} style={{ fontSize: 12, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={10} /> Add Link
                  </button>
                </div>
              ))}
              <button
                onClick={addColumn}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                <Plus size={12} /> Add Column
              </button>
            </EditorSection>
          </>
        )}
      </div>
    </div>
  );
}