'use client';

import { sanitizeImageUrl } from '@/lib/sanitizeImageUrl';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { tokens } from '../design-tokens';
import { useBuilderStore } from '../../hooks/useBuilderState';

// ── useThemeSwatches ──────────────────────────────────────────────────────────
// Pulls the site's current theme colors so color pickers can lead with a
// curated swatch row instead of defaulting straight to a raw hex field.
export interface ThemeSwatch { label: string; value: string }

export function useThemeSwatches(): ThemeSwatch[] {
  const { theme } = useBuilderStore();
  return [
    { label: 'Primary',    value: theme?.primaryColor    ?? '#1e40af' },
    { label: 'Secondary',  value: theme?.secondaryColor  ?? '#0ea5e9' },
    { label: 'Accent',     value: theme?.accentColor     ?? '#f59e0b' },
    { label: 'Text',       value: theme?.textColor       ?? '#111827' },
    { label: 'Background', value: theme?.backgroundColor ?? '#ffffff' },
  ];
}

// ── FieldHint ─────────────────────────────────────────────────────────────────
// Shared plain-language hint text, shown under a field label.
export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, color: tokens.muted, marginTop: -2, marginBottom: 5, fontFamily: tokens.font, lineHeight: 1.4 }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.3)',
  border: `1px solid ${tokens.border}`,
  borderRadius: 7,
  padding: '7px 10px',
  fontSize: 12,
  color: tokens.text,
  fontFamily: tokens.font,
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

// ── EditorTabs ────────────────────────────────────────────────────────────────

export function EditorTabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${tokens.border}`,
        background: 'rgba(0,0,0,0.2)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: active === i ? '#818cf8' : tokens.muted,
              fontSize: 11.5, fontWeight: active === i ? 600 : 500,
              fontFamily: tokens.font,
              borderBottom: active === i ? `2px solid #6366f1` : '2px solid transparent',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (active !== i) e.currentTarget.style.color = tokens.label; }}
            onMouseLeave={e => { if (active !== i) e.currentTarget.style.color = tokens.muted; }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '14px 14px' }}>{tabs[active].content}</div>
    </div>
  );
}

// ── EditorSection ─────────────────────────────────────────────────────────────

export function EditorSection({ title, children, collapsible = false, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  /** Initial open/closed state when collapsible. Ignored when collapsible is false. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, width: '100%',
          background: 'none', border: 'none', padding: '0 0 7px 0',
          cursor: collapsible ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        {collapsible && (
          <span style={{ color: tokens.muted }}>
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        )}
        <span style={{
          fontSize: 10, fontWeight: 700, color: tokens.muted,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: tokens.font,
        }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: tokens.border, marginLeft: 6 }} />
      </button>
      {(!collapsible || open) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
      )}
    </div>
  );
}

// ── EditorField ───────────────────────────────────────────────────────────────

interface FieldProps {
  label:       string;
  value?:      any;
  onChange:    (val: any) => void;
  placeholder?: string;
  multiline?:  boolean;
  type?:       string;
  min?:        number;
  max?:        number;
  rows?:       number;
  /** Short plain-language explanation shown under the label. */
  hint?:       string;
}

export function EditorField({ label, value, onChange, placeholder, multiline, type = 'text', min, max, rows = 3, hint }: FieldProps) {
  const [localVal, setLocalVal] = useState(value ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserTyping = useRef(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!isUserTyping.current) setLocalVal(value ?? '');
  }, [value]);

  const handleChange = (newVal: string | number) => {
    isUserTyping.current = true;
    setLocalVal(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newVal);
      setTimeout(() => { isUserTyping.current = false; }, 100);
    }, 300);
  };

  const handleBlur = (newVal: string | number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isUserTyping.current = false;
    setFocused(false);
    onChange(newVal);
  };

  const activeInput: React.CSSProperties = {
    ...inputStyle,
    borderColor: focused ? tokens.borderFocus : tokens.border,
    boxShadow: focused ? `0 0 0 3px rgba(99,102,241,0.12)` : 'none',
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: tokens.label, marginBottom: hint ? 2 : 5, fontFamily: tokens.font }}>
        {label}
      </label>
      {hint && <FieldHint>{hint}</FieldHint>}
      {type === 'range' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range" min={min} max={max}
            value={localVal}
            onChange={e => { setLocalVal(e.target.value); onChange(Number(e.target.value)); }}
            style={{ flex: 1, accentColor: '#6366f1', height: 4 }}
          />
          <span style={{ fontSize: 11, color: tokens.muted, minWidth: 28, textAlign: 'right', fontFamily: tokens.fontMono }}>{localVal}</span>
        </div>
      ) : multiline ? (
        <textarea
          value={localVal}
          onChange={e => handleChange(e.target.value)}
          onBlur={e => handleBlur(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          rows={rows}
          style={{ ...activeInput, resize: 'vertical', lineHeight: 1.55 }}
        />
      ) : (
        <input
          type={type}
          value={localVal}
          onChange={e => handleChange(e.target.value)}
          onBlur={e => handleBlur(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          style={activeInput}
        />
      )}
    </div>
  );
}

// ── EditorSelect ──────────────────────────────────────────────────────────────

export function EditorSelect({ label, value, onChange, options, hint }: {
  label:   string;
  value:   any;
  onChange: (val: string) => void;
  options: { value: string; label: string; description?: string }[];
  /** Short plain-language explanation shown under the label. */
  hint?:   string;
}) {
  const selected = options.find(o => o.value === value);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: tokens.label, marginBottom: hint ? 2 : 5, fontFamily: tokens.font }}>
        {label}
      </label>
      {hint && <FieldHint>{hint}</FieldHint>}
      <div style={{ position: 'relative' }}>
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{
            ...inputStyle,
            appearance: 'none', cursor: 'pointer',
            paddingRight: 28,
          }}
        >
          {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1a1c23' }}>{o.label}</option>)}
        </select>
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: tokens.muted,
        }}>
          <ChevronDown size={12} />
        </div>
      </div>
      {selected?.description && <FieldHint><span style={{ marginTop: 4, display: 'block' }}>{selected.description}</span></FieldHint>}
    </div>
  );
}

// ── EditorToggle ──────────────────────────────────────────────────────────────

export function EditorToggle({ label, checked, onChange, description }: {
  label:       string;
  checked:     boolean;
  onChange:    (v: boolean) => void;
  description?: string;
}) {
  const isChecked = checked === true;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: tokens.text, fontFamily: tokens.font }}>{label}</div>
        {description && <div style={{ fontSize: 10.5, color: tokens.muted, marginTop: 2, fontFamily: tokens.font }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!isChecked)}
        style={{
          position: 'relative', display: 'inline-flex',
          height: 20, width: 36, flexShrink: 0, borderRadius: 10,
          background: isChecked ? '#6366f1' : 'rgba(255,255,255,0.1)',
          border: isChecked ? '1px solid rgba(99,102,241,0.5)' : `1px solid ${tokens.border}`,
          cursor: 'pointer', transition: 'all 0.2s',
          outline: 'none', boxShadow: isChecked ? '0 0 8px rgba(99,102,241,0.3)' : 'none',
        }}
        role="switch"
        aria-checked={isChecked}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: isChecked ? 'calc(100% - 18px)' : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

// ── EditorColorPicker ─────────────────────────────────────────────────────────

export function EditorColorPicker({ label, value, onChange, swatches }: {
  label:   string;
  value:   string;
  onChange: (v: string) => void;
  /** Curated theme swatches (from useThemeSwatches()) shown before the raw hex input. */
  swatches?: ThemeSwatch[];
}) {
  const [localVal, setLocalVal] = useState(value || '#000000');
  const matchesSwatch = !!swatches?.some(s => s.value.toLowerCase() === (value || '').toLowerCase());
  const [customOpen, setCustomOpen] = useState(!swatches || !matchesSwatch);

  useEffect(() => { setLocalVal(value || '#000000'); }, [value]);
  useEffect(() => {
    if (swatches && matchesSwatch) setCustomOpen(false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const customInputs = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: swatches ? 8 : 0 }}>
      <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 7, overflow: 'hidden', border: `1px solid ${tokens.border}`, flexShrink: 0 }}>
        <input
          type="color"
          value={localVal}
          onChange={e => { setLocalVal(e.target.value); onChange(e.target.value); }}
          style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', cursor: 'pointer', border: 'none', padding: 0 }}
        />
      </div>
      <input
        type="text"
        value={localVal}
        onChange={e => { setLocalVal(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
        onBlur={e => onChange(e.target.value)}
        placeholder="#000000"
        style={{ ...inputStyle, flex: 1, fontFamily: tokens.fontMono, fontSize: 11.5 }}
      />
    </div>
  );

  if (!swatches || swatches.length === 0) {
    return (
      <div>
        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: tokens.label, marginBottom: 5, fontFamily: tokens.font }}>
          {label}
        </label>
        {customInputs}
      </div>
    );
  }

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: tokens.label, marginBottom: 5, fontFamily: tokens.font }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {swatches.map(sw => {
          const active = sw.value.toLowerCase() === (value || '').toLowerCase();
          return (
            <button
              key={sw.label}
              type="button"
              title={sw.label}
              onClick={() => { setCustomOpen(false); onChange(sw.value); }}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: sw.value, cursor: 'pointer',
                border: active ? `2px solid ${tokens.accent}` : `1px solid ${tokens.border}`,
                boxShadow: active ? `0 0 0 2px ${tokens.accentLight}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {active && <Check size={13} color={/^#(fff|ffffff)/i.test(sw.value) ? '#111827' : '#fff'} strokeWidth={3} />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen(o => !o)}
          style={{
            height: 28, padding: '0 10px', borderRadius: 14,
            border: customOpen ? `2px solid ${tokens.accent}` : `1px solid ${tokens.border}`,
            background: customOpen ? tokens.accentLight : tokens.surface,
            color: customOpen ? tokens.accent : tokens.muted,
            fontSize: 11, fontWeight: 500, fontFamily: tokens.font, cursor: 'pointer',
          }}
        >
          Custom
        </button>
      </div>
      {customOpen && customInputs}
    </div>
  );
}

// ── EditorImageUpload ─────────────────────────────────────────────────────────

export function EditorImageUpload({ label, value, onChange }: {
  label:   string;
  value?:  string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const [dragging, setDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => { setUrlInput(value || ''); }, [value]);

  const doUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const { websiteApi: wApi } = await import('@/lib/api/websiteApi');
      const result = await wApi.uploadImage(file);
      const rawUrl = result.url || '';
      const { BASE_URL: apiOrigin } = await import('@/lib/api'); // Electron-aware, not a raw env read
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${apiOrigin}${rawUrl}`;
      onChange(fullUrl);
      setUrlInput(fullUrl);
    } catch (err) { console.error('Image upload failed', err); }
    setUploading(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 500, color: tokens.label, fontFamily: tokens.font }}>
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setUrlInput(''); setShowUrlInput(false); }}
            style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: tokens.font }}
          >
            Remove
          </button>
        )}
      </div>

      {value ? (
        /* Preview with action buttons */
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${tokens.border}`, marginBottom: 8, position: 'relative' }}>
          <img
            src={value}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
          />
          {/* Overlay actions */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: 0, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; }}
          >
            <label style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.95)', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: '#111827', fontFamily: tokens.font }}>
              {uploading ? 'Uploading…' : '↑ Replace'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
            </label>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <label
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '20px 8px',
            border: `2px dashed ${dragging ? tokens.accent : tokens.border}`,
            borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: 12, color: dragging ? tokens.accent : tokens.muted,
            transition: 'all 0.15s', fontFamily: tokens.font,
            background: dragging ? `${tokens.accent}10` : 'rgba(255,255,255,0.02)',
            boxSizing: 'border-box',
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span style={{ fontSize: 22 }}>{uploading ? '⏳' : '🖼️'}</span>
          <span style={{ fontWeight: 500 }}>
            {uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Click or drag image here'}
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>PNG, JPG, WEBP, SVG</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
        </label>
      )}

      {/* URL input toggle */}
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          onClick={() => setShowUrlInput(v => !v)}
          style={{ fontSize: 10.5, color: tokens.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: tokens.font, padding: 0 }}
        >
          {showUrlInput ? '▲ Hide URL input' : '🔗 Use URL instead'}
        </button>
        {showUrlInput && (
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onBlur={e => {
              const raw = e.target.value.trim();
              if (raw === value) return;
              if (!raw) { onChange(''); return; }
              const safe = sanitizeImageUrl(raw);
              if (safe) {
                onChange(safe);
              } else {
                setUrlInput(value || '');
                alert('Invalid or unsafe image URL. Only https:// URLs from public websites are allowed.');
              }
            }}
            placeholder="https://..."
            style={{ ...inputStyle, marginTop: 6 }}
          />
        )}
      </div>
    </div>
  );
}

// ── EditorArrayField ──────────────────────────────────────────────────────────

export function EditorArrayField<T extends { id?: string }>({
  label, items, onChange, renderItem, defaultItem, addLabel = 'Add Item', bare = false,
}: {
  label:       string;
  items:       T[];
  onChange:    (items: T[]) => void;
  renderItem:  (item: T, update: (updates: Partial<T>) => void, remove: () => void, index: number) => React.ReactNode;
  defaultItem: T;
  addLabel?:   string;
  /** Skip the default card wrapper — use when renderItem already renders its own
   *  container (e.g. EditorListItem), so items don't get double-wrapped. */
  bare?:       boolean;
}) {
  const add    = () => onChange([...items, { ...defaultItem, id: Math.random().toString(36).slice(2) } as T]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, updates: Partial<T>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...updates } : item));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: tokens.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: tokens.font }}>{label}</span>
        <button
          type="button"
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#818cf8', fontWeight: 500, fontFamily: tokens.font,
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
            borderRadius: 5, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = tokens.accentLight}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Plus size={11} /> {addLabel}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          bare ? (
            <React.Fragment key={(item as any).id || i}>
              {renderItem(item, updates => update(i, updates), () => remove(i), i)}
            </React.Fragment>
          ) : (
            <div key={(item as any).id || i} style={{
              border: `1px solid ${tokens.border}`, borderRadius: 9,
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.25)',
            }}>
              {renderItem(item, updates => update(i, updates), () => remove(i), i)}
            </div>
          )
        ))}
        {items.length === 0 && (
          <div style={{
            fontSize: 11.5, color: tokens.muted, textAlign: 'center', padding: '14px',
            border: `1px dashed ${tokens.border}`, borderRadius: 8, fontFamily: tokens.font,
          }}>
            No items yet — click "{addLabel}" above
          </div>
        )}
      </div>
    </div>
  );
}

// ── EditorRating ──────────────────────────────────────────────────────────────

export function EditorRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{
            fontSize: 18, cursor: 'pointer', background: 'none', border: 'none', padding: 0,
            color: star <= value ? '#fbbf24' : 'rgba(255,255,255,0.15)',
            transition: 'color 0.1s',
          }}
        >★</button>
      ))}
    </div>
  );
}