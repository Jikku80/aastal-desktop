'use client';

import React from 'react';
import { EditorField } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, font, PadStack } from './shared';

export function SpacerEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorField
        label={`Height: ${s.height ?? 80}px`}
        type="range" min={16} max={320}
        value={s.height ?? 80}
        onChange={v => $set('height', Number(v))}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[16, 32, 48, 64, 80, 120, 160].map(h => (
          <button
            key={h}
            onClick={() => $set('height', h)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: s.height === h ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: s.height === h ? '#818cf8' : '#6b7080',
              fontSize: 11, cursor: 'pointer', fontFamily: font, fontWeight: 500,
              transition: 'all 0.12s',
            }}
          >{h}px</button>
        ))}
      </div>
    </PadStack>
  );
}