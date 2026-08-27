'use client';

import React from 'react';
import { useBuilderStore } from '../hooks/useBuilderState';
import { EditorColorPicker } from './section-editors/EditorComponents';
import { tokens } from './design-tokens';

const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Nunito', 'Raleway', 'DM Sans', 'Sora', 'Playfair Display',
  'Lora', 'Merriweather', 'Cormorant Garamond', 'Source Sans Pro',
];

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: tokens.label,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  marginBottom: 12, fontFamily: tokens.font,
};

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: tokens.muted,
  marginBottom: 5, fontFamily: tokens.font,
};

const selectSt: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.35)',
  border: `1px solid ${tokens.border}`, borderRadius: 7,
  padding: '7px 10px', fontSize: 12, color: tokens.text,
  fontFamily: tokens.font, outline: 'none', boxSizing: 'border-box',
};

const pillBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 2px', fontSize: 11, fontWeight: 500,
  borderRadius: 6, cursor: 'pointer', border: 'none',
  fontFamily: tokens.font, transition: 'all 0.15s',
  background: active ? 'rgba(99,102,241,0.2)' : tokens.surface,
  color:  active ? '#818cf8' : tokens.muted,
  outline: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
});

export function ThemeEditor() {
  const { theme, setTheme } = useBuilderStore();
  const set = (key: string, val: any) => setTheme({ [key]: val } as any);

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24, background: tokens.bg, minHeight: '100%', fontFamily: tokens.font }}>
      {/* Colors */}
      <div>
        <div style={sectionLabel}>Colors</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <EditorColorPicker label="Primary Color"    value={theme.primaryColor}    onChange={v => set('primaryColor', v)} />
          <EditorColorPicker label="Secondary Color"  value={theme.secondaryColor}  onChange={v => set('secondaryColor', v)} />
          <EditorColorPicker label="Accent Color"     value={theme.accentColor}     onChange={v => set('accentColor', v)} />
          <EditorColorPicker label="Background Color" value={theme.backgroundColor} onChange={v => set('backgroundColor', v)} />
          <EditorColorPicker label="Text Color"       value={theme.textColor}       onChange={v => set('textColor', v)} />
        </div>
      </div>

      {/* Typography */}
      <div>
        <div style={sectionLabel}>Typography</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabel}>Heading Font</label>
            <select value={theme.fontHeading} onChange={e => set('fontHeading', e.target.value)}
              style={{ ...selectSt, fontFamily: theme.fontHeading }}>
              {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f, background: '#111318', color: '#e2e4ef' }}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Body Font</label>
            <select value={theme.fontBody} onChange={e => set('fontBody', e.target.value)}
              style={{ ...selectSt, fontFamily: theme.fontBody }}>
              {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f, background: '#111318', color: '#e2e4ef' }}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Shape & Layout */}
      <div>
        <div style={sectionLabel}>Shape &amp; Layout</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Border Radius</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['none','sm','md','lg','full'] as const).map(r => (
                <button key={r} onClick={() => set('borderRadius', r)} style={pillBtn(theme.borderRadius === r)}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Button Style</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['filled','outlined','ghost'] as const).map(s => (
                <button key={s} onClick={() => set('buttonStyle', s)} style={{ ...pillBtn(theme.buttonStyle === s), textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ ...fieldLabel, marginBottom: 8 }}>Spacing</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['compact','normal','spacious'] as const).map(s => (
                <button key={s} onClick={() => set('spacing', s)} style={{ ...pillBtn(theme.spacing === s), textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div style={sectionLabel}>Preview</div>
        <div style={{ border: `1px solid ${tokens.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: theme.primaryColor, padding: 16, color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: theme.fontHeading }}>Heading — {theme.fontHeading}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, fontFamily: theme.fontBody }}>Body text in {theme.fontBody}.</div>
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 8, background: tokens.surface }}>
            <button style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: theme.buttonStyle === 'filled' ? theme.primaryColor : 'transparent',
              border: `2px solid ${theme.primaryColor}`,
              color: theme.buttonStyle === 'filled' ? 'white' : theme.primaryColor,
              borderRadius: ({ none: 0, sm: 4, md: 8, lg: 12, full: 999 } as any)[theme.borderRadius],
            }}>Book Now</button>
            <span style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: theme.accentColor }}>Accent text</span>
          </div>
        </div>
      </div>
    </div>
  );
}