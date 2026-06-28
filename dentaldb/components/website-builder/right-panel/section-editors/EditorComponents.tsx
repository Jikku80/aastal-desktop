'use client';

import { sanitizeImageUrl } from '@/lib/sanitizeImageUrl';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from 'lucide-react';

// ── Design tokens (dark premium) ─────────────────────────────────────────────
const t = {
  bg:          '#111318',
  surface:     'rgba(255,255,255,0.04)',
  surfaceHov:  'rgba(255,255,255,0.07)',
  border:      'rgba(255,255,255,0.08)',
  borderFocus: '#6366f1',
  text:        '#e2e4ef',
  textMuted:   '#6b7080',
  textLabel:   '#8b8fa8',
  accent:      '#6366f1',
  accentLight: 'rgba(99,102,241,0.15)',
  danger:      '#f87171',
  dangerLight: 'rgba(248,113,113,0.1)',
  success:     '#4ade80',
  font:        "'Inter','Geist','Segoe UI',system-ui,sans-serif",
  fontMono:    "'JetBrains Mono','Fira Code',monospace",
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.3)',
  border: `1px solid ${t.border}`,
  borderRadius: 7,
  padding: '7px 10px',
  fontSize: 12,
  color: t.text,
  fontFamily: t.font,
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
        borderBottom: `1px solid ${t.border}`,
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
              color: active === i ? '#818cf8' : t.textMuted,
              fontSize: 11.5, fontWeight: active === i ? 600 : 500,
              fontFamily: t.font,
              borderBottom: active === i ? `2px solid #6366f1` : '2px solid transparent',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (active !== i) e.currentTarget.style.color = t.textLabel; }}
            onMouseLeave={e => { if (active !== i) e.currentTarget.style.color = t.textMuted; }}
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

export function EditorSection({ title, children, collapsible = false }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
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
          <span style={{ color: t.textMuted }}>
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        )}
        <span style={{
          fontSize: 10, fontWeight: 700, color: t.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: t.font,
        }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: t.border, marginLeft: 6 }} />
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
}

export function EditorField({ label, value, onChange, placeholder, multiline, type = 'text', min, max, rows = 3 }: FieldProps) {
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
    borderColor: focused ? t.borderFocus : t.border,
    boxShadow: focused ? `0 0 0 3px rgba(99,102,241,0.12)` : 'none',
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: t.textLabel, marginBottom: 5, fontFamily: t.font }}>
        {label}
      </label>
      {type === 'range' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range" min={min} max={max}
            value={localVal}
            onChange={e => { setLocalVal(e.target.value); onChange(Number(e.target.value)); }}
            style={{ flex: 1, accentColor: '#6366f1', height: 4 }}
          />
          <span style={{ fontSize: 11, color: t.textMuted, minWidth: 28, textAlign: 'right', fontFamily: t.fontMono }}>{localVal}</span>
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

export function EditorSelect({ label, value, onChange, options }: {
  label:   string;
  value:   any;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: t.textLabel, marginBottom: 5, fontFamily: t.font }}>
        {label}
      </label>
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
          pointerEvents: 'none', color: t.textMuted,
        }}>
          <ChevronDown size={12} />
        </div>
      </div>
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
        <div style={{ fontSize: 12, fontWeight: 500, color: t.text, fontFamily: t.font }}>{label}</div>
        {description && <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2, fontFamily: t.font }}>{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!isChecked)}
        style={{
          position: 'relative', display: 'inline-flex',
          height: 20, width: 36, flexShrink: 0, borderRadius: 10,
          background: isChecked ? '#6366f1' : 'rgba(255,255,255,0.1)',
          border: isChecked ? '1px solid rgba(99,102,241,0.5)' : `1px solid ${t.border}`,
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

export function EditorColorPicker({ label, value, onChange }: {
  label:   string;
  value:   string;
  onChange: (v: string) => void;
}) {
  const [localVal, setLocalVal] = useState(value || '#000000');

  useEffect(() => { setLocalVal(value || '#000000'); }, [value]);

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: t.textLabel, marginBottom: 5, fontFamily: t.font }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 7, overflow: 'hidden', border: `1px solid ${t.border}`, flexShrink: 0 }}>
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
          style={{ ...inputStyle, flex: 1, fontFamily: t.fontMono, fontSize: 11.5 }}
        />
      </div>
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
      const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
        .replace(/\/api\/v1\/?$/, '');
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
        <label style={{ fontSize: 11.5, fontWeight: 500, color: t.textLabel, fontFamily: t.font }}>
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setUrlInput(''); setShowUrlInput(false); }}
            style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: t.font }}
          >
            Remove
          </button>
        )}
      </div>

      {value ? (
        /* Preview with action buttons */
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}`, marginBottom: 8, position: 'relative' }}>
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
            <label style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.95)', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: '#111827', fontFamily: t.font }}>
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
            border: `2px dashed ${dragging ? t.accent : t.border}`,
            borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: 12, color: dragging ? t.accent : t.textMuted,
            transition: 'all 0.15s', fontFamily: t.font,
            background: dragging ? `${t.accent}10` : 'rgba(255,255,255,0.02)',
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
          style={{ fontSize: 10.5, color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: t.font, padding: 0 }}
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
  label, items, onChange, renderItem, defaultItem, addLabel = 'Add Item',
}: {
  label:       string;
  items:       T[];
  onChange:    (items: T[]) => void;
  renderItem:  (item: T, update: (updates: Partial<T>) => void, remove: () => void, index: number) => React.ReactNode;
  defaultItem: T;
  addLabel?:   string;
}) {
  const add    = () => onChange([...items, { ...defaultItem, id: Math.random().toString(36).slice(2) } as T]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, updates: Partial<T>) => onChange(items.map((item, idx) => idx === i ? { ...item, ...updates } : item));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: t.font }}>{label}</span>
        <button
          type="button"
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#818cf8', fontWeight: 500, fontFamily: t.font,
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
            borderRadius: 5, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = t.accentLight}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Plus size={11} /> {addLabel}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={(item as any).id || i} style={{
            border: `1px solid ${t.border}`, borderRadius: 9,
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.25)',
          }}>
            {renderItem(item, updates => update(i, updates), () => remove(i), i)}
          </div>
        ))}
        {items.length === 0 && (
          <div style={{
            fontSize: 11.5, color: t.textMuted, textAlign: 'center', padding: '14px',
            border: `1px dashed ${t.border}`, borderRadius: 8, fontFamily: t.font,
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