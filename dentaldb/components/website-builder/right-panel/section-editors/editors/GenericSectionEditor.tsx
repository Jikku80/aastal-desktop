'use client';

import React from 'react';
import type { Props } from './shared';
import { safe, font, PadStack } from './shared';

export function GenericSectionEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  return (
    <PadStack>
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, fontFamily: font }}>Raw settings editor</p>
      <textarea
        value={JSON.stringify(s, null, 2)}
        onChange={e => {
          try { onChange(JSON.parse(e.target.value)); } catch {}
        }}
        rows={20}
        style={{
          width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
          padding: '8px 10px', fontSize: 11,
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          background: 'rgba(0,0,0,0.3)', color: '#c9ccd8', outline: 'none', resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </PadStack>
  );
}
