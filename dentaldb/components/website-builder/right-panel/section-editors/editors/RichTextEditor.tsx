'use client';

import React from 'react';
import { EditorSelect } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, font, PadStack } from './shared';

export function RichTextEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <div>
        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#8b8fa8', marginBottom: 5, fontFamily: font }}>
          Content (HTML supported)
        </label>
        <textarea
          value={s.content || ''}
          onChange={e => $set('content', e.target.value)}
          rows={10}
          style={{
            width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
            padding: '8px 10px', fontSize: 11.5, fontFamily: "'JetBrains Mono','Fira Code',monospace",
            background: 'rgba(0,0,0,0.3)', color: '#c9ccd8', outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', lineHeight: 1.6,
          }}
          placeholder="<p>Your content here...</p>"
        />
      </div>
      <EditorSelect label="Design Variant" value={s.variant ?? 'article'} onChange={v => $set('variant', v)} options={[
        { value: 'article',      label: '1. Article' },
        { value: 'two-column',   label: '2. Two Column' },
        { value: 'editorial',    label: '3. Editorial' },
        { value: 'medical-guide',label: '4. Medical Guide' },
        { value: 'highlight',    label: '5. Highlight' },
      ]} />
      <EditorSelect label="Alignment" value={s.alignment} onChange={v => $set('alignment', v)} options={[
        { value: 'left',   label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right',  label: 'Right' },
      ]} />
    </PadStack>
  );
}
