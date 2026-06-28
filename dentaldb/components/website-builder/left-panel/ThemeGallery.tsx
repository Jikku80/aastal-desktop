'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '../hooks/useBuilderState';
import { TEMPLATE_PRESETS, type TemplatePreset } from '../utils/templatePresets';
import toast from 'react-hot-toast';

// ── Design tokens (matches dark builder UI) ───────────────────────────────────
const dk = {
  bg:      '#111318',
  surface: 'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  text:    '#e2e4ef',
  muted:   '#6b7080',
  label:   '#8b8fa8',
  accent:  '#6366f1',
  green:   '#34d399',
  font:    "'Inter','Geist','Segoe UI',system-ui,sans-serif",
};

// ── Category badges ───────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'dental':      { bg: 'rgba(14,165,233,0.18)', text: '#38bdf8' },
  'family':      { bg: 'rgba(249,115,22,0.18)', text: '#fb923c' },
  'specialist':  { bg: 'rgba(30,58,95,0.4)',    text: '#93c5fd' },
  'pediatric':   { bg: 'rgba(22,163,74,0.18)',  text: '#4ade80' },
  'aesthetic':   { bg: 'rgba(146,64,14,0.25)',  text: '#fbbf24' },
  'community':   { bg: 'rgba(29,78,216,0.2)',   text: '#60a5fa' },
  'multi':       { bg: 'rgba(109,40,217,0.2)',  text: '#c4b5fd' },
  'online':      { bg: 'rgba(5,150,105,0.2)',   text: '#34d399' },
};

// ── Preview color swatches for each template ──────────────────────────────────
interface ThemeMeta {
  category: string;
  tags: string[];
  badge?: string;
}

const META: Record<string, ThemeMeta> = {
  'modern-dental':  { category: 'dental',     tags: ['Dark Mode', 'Gold', 'Luxury'],         badge: '🖤 Dark' },
  'warm-family':    { category: 'family',     tags: ['Coral', 'Rounded', 'Friendly'],        badge: '☀️ Warm' },
  'specialist':     { category: 'specialist', tags: ['Navy', 'Minimal', 'Clinical'],          badge: '🏥 Clinical' },
  'pediatric':      { category: 'pediatric',  tags: ['Green', 'Playful', 'Fun'],              badge: '🌱 Kids' },
  'aesthetic':      { category: 'aesthetic',  tags: ['Noir', 'Gold', 'Cosmetic'],             badge: '✨ Noir' },
  'community':      { category: 'community',  tags: ['Teal', 'Prices', 'Light'],              badge: '💎 Budget' },
  'multi-branch':   { category: 'multi',      tags: ['Purple', 'Dark', 'Network'],            badge: '🗺️ Multi' },
  'telemedicine':   { category: 'online',     tags: ['Emerald', 'Digital', 'Video'],          badge: '📹 Online' },
};

// ── Inline SVG preview thumbnail ──────────────────────────────────────────────
function ThemeThumbnail({ preset }: { preset: TemplatePreset }) {
  const t = preset.theme;
  const isDark = ['#0a0a0f','#111010','#0f0f1a'].includes(t.backgroundColor);
  const bg   = t.backgroundColor || '#fff';
  const pri  = t.primaryColor;
  const acc  = t.accentColor || t.secondaryColor || pri;
  const card = isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6';
  const cardStroke = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const textMuted  = isDark ? 'rgba(255,255,255,0.35)' : '#d1d5db';

  // Pick radius based on theme setting
  const r = t.borderRadius === 'none' ? 0
        : t.borderRadius === 'sm'   ? 3
        : t.borderRadius === 'md'   ? 6
        : t.borderRadius === 'lg'   ? 10
        : t.borderRadius === 'full' ? 999
        : 6;

  return (
    <svg
      viewBox="0 0 240 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={`hero-${preset.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={pri} />
          <stop offset="100%" stopColor={acc} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`bg-${preset.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor={isDark ? '#000' : bg} stopOpacity={isDark ? 0.6 : 1} />
        </linearGradient>
      </defs>

      {/* Page background */}
      <rect width="240" height="160" fill={`url(#bg-${preset.id})`} />

      {/* ── Navbar ── */}
      <rect width="240" height="20" fill={isDark ? 'rgba(0,0,0,0.6)' : pri} />
      {/* Logo pill */}
      <rect x="8" y="6" width="36" height="8" rx="3" fill="rgba(255,255,255,0.8)" />
      {/* Nav links */}
      <rect x="110" y="8" width="22" height="4" rx="1" fill="rgba(255,255,255,0.45)" />
      <rect x="138" y="8" width="22" height="4" rx="1" fill="rgba(255,255,255,0.45)" />
      {/* CTA button */}
      <rect x="166" y="5" width="44" height="10" rx={r}
        fill={isDark ? pri : acc} />
      <rect x="174" y="8" width="28" height="4" rx="1" fill="rgba(255,255,255,0.9)" />

      {/* ── Hero ── */}
      <rect x="0" y="20" width="240" height="60" fill={`url(#hero-${preset.id})`} />
      {/* Hero overlay for dark themes */}
      {isDark && <rect x="0" y="20" width="240" height="60" fill="rgba(0,0,0,0.45)" />}
      {/* Hero headline */}
      <rect x="40" y="32" width="160" height="9" rx="3" fill="rgba(255,255,255,0.95)" />
      <rect x="60" y="45" width="120" height="5" rx="2" fill="rgba(255,255,255,0.6)" />
      {/* Hero CTA */}
      <rect x="80" y="56" width="80" height="14" rx={r}
        fill={acc} />
      <rect x="90" y="60" width="60" height="5" rx="1" fill="rgba(255,255,255,0.9)" />

      {/* ── Stats bar ── */}
      <rect x="0" y="80" width="240" height="20"
        fill={isDark ? 'rgba(255,255,255,0.04)' : `${pri}18`} />
      {[20, 80, 140, 195].map((x, i) => (
        <g key={i}>
          <rect x={x} y="84" width="24" height="6" rx="2" fill={pri} fillOpacity="0.8" />
          <rect x={x} y="93" width="30" height="3" rx="1" fill={textMuted} />
        </g>
      ))}

      {/* ── Content cards ── */}
      <rect x="0" y="100" width="240" height="60" fill={isDark ? 'rgba(255,255,255,0.02)' : bg} />
      {[8, 88, 168].map((x, i) => (
        <g key={i}>
          <rect x={x} y="106" width="64" height="46" rx={r}
            fill={card} stroke={cardStroke} strokeWidth="0.5" />
          {/* Icon circle */}
          <circle cx={x + 32} cy="120" r="8" fill={pri} fillOpacity="0.2" />
          <circle cx={x + 32} cy="120" r="4" fill={pri} fillOpacity="0.7" />
          {/* Card text lines */}
          <rect x={x + 10} y="133" width="44" height="4" rx="1" fill={pri} fillOpacity="0.6" />
          <rect x={x + 14} y="141" width="36" height="3" rx="1" fill={textMuted} />
        </g>
      ))}

      {/* ── Bottom gradient fade ── */}
      <defs>
        <linearGradient id={`fade-${preset.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="70%" stopColor={bg} stopOpacity="0" />
          <stop offset="100%" stopColor={bg} stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect x="0" y="130" width="240" height="30" fill={`url(#fade-${preset.id})`} />
    </svg>
  );
}

// ── Color palette preview ─────────────────────────────────────────────────────
function ColorDots({ theme }: { theme: TemplatePreset['theme'] }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[theme.primaryColor, theme.accentColor || theme.secondaryColor, theme.backgroundColor].map((c, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: c,
          border: '1px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  preset,
  onConfirm,
  onCancel,
}: {
  preset: TemplatePreset;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      fontFamily: dk.font,
    }}>
      <div style={{
        background: '#1a1d27',
        border: `1px solid ${dk.border}`,
        borderRadius: 16,
        padding: 28,
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Preview thumbnail */}
        <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 20, height: 120 }}>
          <ThemeThumbnail preset={preset} />
        </div>

        <h3 style={{ color: dk.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
          Apply "{preset.name}" theme?
        </h3>
        <p style={{ color: dk.muted, fontSize: 13, margin: '0 0 24px', lineHeight: 1.5 }}>
          This will replace your current pages, sections, and theme settings with the template layout.
          <br /><br />
          <strong style={{ color: '#f59e0b' }}>⚠️ Your existing content will be overwritten.</strong>
          <br />
          You can undo with Ctrl+Z immediately after.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 9,
              background: dk.surface, border: `1px solid ${dk.border}`,
              color: dk.text, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: dk.font,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 2, padding: '10px 16px', borderRadius: 9,
              background: 'linear-gradient(135deg,#6366f1,#818cf8)',
              border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: dk.font,
              boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            }}
          >
            ✓ Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ThemeGallery ─────────────────────────────────────────────────────────
export function ThemeGallery({ onSave }: { onSave?: (snap: any) => Promise<void> }) {
  const { setPages, setTheme, setGlobalSettings, pushHistory, getSnapshot, setSaveStatus } = useBuilderStore();
  const [search,      setSearch]      = useState('');
  const [confirmPreset, setConfirmPreset] = useState<TemplatePreset | null>(null);
  const [hoveredId,   setHoveredId]   = useState<string | null>(null);

  const filtered = TEMPLATE_PRESETS.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const m = META[p.id];
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      m?.tags.some(t => t.toLowerCase().includes(q)) ||
      m?.category.includes(q)
    );
  });

  const applyPreset = (preset: TemplatePreset) => {
    pushHistory();
    setPages(preset.pages);
    setTheme(preset.theme);
    setGlobalSettings(preset.globalSettings);

    // Immediately save so the first apply doesn't fail on refresh
    if (onSave) {
      setSaveStatus('saving');
      // Small delay to let state settle after all three setters
      setTimeout(async () => {
        try {
          const snap = useBuilderStore.getState().getSnapshot();
          await onSave(snap);
          useBuilderStore.setState({ isDirty: false });
          setSaveStatus('saved');
          setTimeout(() => {
            if (useBuilderStore.getState().saveStatus === 'saved') setSaveStatus('idle');
          }, 3000);
        } catch {
          setSaveStatus('error');
        }
      }, 200);
    }

    toast.success(`"${preset.name}" theme applied! You can edit any section.`, {
      duration: 3500,
      style: { background: '#1a1d27', color: '#e2e4ef', border: '1px solid rgba(99,102,241,0.4)' },
    });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: dk.bg, fontFamily: dk.font, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>🎨</div>
          <div>
            <div style={{ color: dk.text, fontSize: 13, fontWeight: 700 }}>Theme Gallery</div>
            <div style={{ color: dk.muted, fontSize: 11 }}>Click any theme to apply instantly</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dk.muted}
            strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search themes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${dk.border}`,
              borderRadius: 8, padding: '7px 10px 7px 30px',
              fontSize: 12, color: dk.text, fontFamily: dk.font, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Theme cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 14px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: dk.muted, fontSize: 13 }}>
            No themes match "{search}"
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(preset => {
              const meta = META[preset.id] ?? { category: 'general', tags: [] };
              const catStyle = CATEGORY_COLORS[meta.category] ?? { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' };
              const isHovered = hoveredId === preset.id;

              return (
                <div
                  key={preset.id}
                  onClick={() => setConfirmPreset(preset)}
                  onMouseEnter={() => setHoveredId(preset.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    background: isHovered ? 'rgba(99,102,241,0.08)' : dk.surface,
                    border: `1.5px solid ${isHovered ? 'rgba(99,102,241,0.5)' : dk.border}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    transform: isHovered ? 'translateY(-1px)' : 'none',
                    boxShadow: isHovered ? '0 8px 24px rgba(99,102,241,0.2)' : 'none',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    height: 108, overflow: 'hidden', position: 'relative',
                    background: preset.theme.backgroundColor,
                  }}>
                    <ThemeThumbnail preset={preset} />

                    {/* Badge */}
                    {meta.badge && (
                      <div style={{
                        position: 'absolute', top: 7, right: 7,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(6px)',
                        borderRadius: 6, padding: '3px 7px',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}>
                        {meta.badge}
                      </div>
                    )}

                    {/* Hover overlay */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(99,102,241,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          background: '#6366f1',
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 12, fontWeight: 700, color: '#fff',
                          boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
                        }}>
                          Apply Theme →
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card info */}
                  <div style={{ padding: '10px 12px 11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: dk.text, fontSize: 13, fontWeight: 700 }}>
                        {preset.name}
                      </span>
                      <ColorDots theme={preset.theme} />
                    </div>

                    <p style={{ color: dk.muted, fontSize: 11, margin: '0 0 8px', lineHeight: 1.4 }}>
                      {preset.description}
                    </p>

                    {/* Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 5, fontSize: 10,
                        fontWeight: 600,
                        background: catStyle.bg, color: catStyle.text,
                      }}>
                        {meta.category.charAt(0).toUpperCase() + meta.category.slice(1)}
                      </span>
                      {meta.tags.slice(0, 2).map(tag => (
                        <span key={tag} style={{
                          padding: '2px 7px', borderRadius: 5, fontSize: 10,
                          background: 'rgba(255,255,255,0.05)', color: dk.label,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Font info */}
                    <div style={{
                      marginTop: 7, display: 'flex', alignItems: 'center', gap: 5,
                      color: dk.muted, fontSize: 10,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/>
                        <line x1="12" y1="4" x2="12" y2="20"/>
                      </svg>
                      {preset.theme.fontHeading} / {preset.theme.fontBody}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer tip */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${dk.border}`,
        background: 'rgba(99,102,241,0.05)',
        flexShrink: 0,
      }}>
        <p style={{ color: dk.muted, fontSize: 11, margin: 0, lineHeight: 1.4, textAlign: 'center' }}>
          💡 All themes are fully editable after applying.<br />
          Use the right panel to customize any section.
        </p>
      </div>

      {/* Confirm dialog */}
      {confirmPreset && (
        <ConfirmDialog
          preset={confirmPreset}
          onConfirm={() => {
            applyPreset(confirmPreset);
            setConfirmPreset(null);
          }}
          onCancel={() => setConfirmPreset(null)}
        />
      )}
    </div>
  );
}