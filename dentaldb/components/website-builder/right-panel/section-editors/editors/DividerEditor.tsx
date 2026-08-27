'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorColorPicker, useThemeSwatches } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, PadStack } from './shared';

export function DividerEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  const swatches = useThemeSwatches();
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'line'} onChange={v => $set('variant', v)} options={[
        { value: 'line',     label: '1. Simple Line' },
        { value: 'wave',     label: '2. Wave' },
        { value: 'gradient', label: '3. Gradient Fade' },
        { value: 'dashed',   label: '4. Dashed' },
        { value: 'dotted',   label: '5. Dotted' },
        { value: 'thick',    label: '6. Thick' },
        { value: 'icon',     label: '7. With Icon' },
      ]} />
      <EditorColorPicker swatches={swatches} label="Color" value={s.color ?? '#e5e7eb'} onChange={v => $set('color', v)} />
      <EditorField label={`Thickness: ${s.thickness ?? 1}px`} type="range" min={1} max={8} value={s.thickness ?? 1} onChange={v => $set('thickness', Number(v))} />
    </PadStack>
  );
}
