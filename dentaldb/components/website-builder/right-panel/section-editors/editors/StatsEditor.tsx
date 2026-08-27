'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorArrayField } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, ItemHeader, Stack, PadStack } from './shared';

export function StatsEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'banner'} onChange={v => $set('variant', v)} options={[
        { value: 'banner', label: '1. Banner' },
        { value: 'floating-cards', label: '2. Floating Cards' },
        { value: 'bento', label: '3. Bento' },
        { value: 'with-icons', label: '4. With Icons' },
        { value: 'dark-premium', label: '5. Dark Premium' },
        { value: 'gradient-bg', label: '6. Gradient' },
        { value: 'circular', label: '7. Circular' },
        { value: 'dashboard', label: '8. Dashboard Style' },
        { value: 'timeline-stats', label: '9. Timeline Stats' },
      ]} />
      
      <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} placeholder="Optional title" />
      <EditorArrayField
        label="Statistics"
        items={s.items || []}
        onChange={items => $set('items', items)}
        addLabel="Add Stat"
        defaultItem={{ id: '', value: '100+', label: 'Patients' }}
        renderItem={(item, update, remove) => (
          <Stack>
            <ItemHeader label={`${item.value} ${item.label}`} onRemove={remove} />
            <EditorField label="Value" value={item.value} onChange={v => update({ value: v })} placeholder="100+" />
            <EditorField label="Label" value={item.label} onChange={v => update({ label: v })} placeholder="Happy Patients" />
          </Stack>
        )}
      />
    </PadStack>
  );
}
