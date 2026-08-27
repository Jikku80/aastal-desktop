'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorTabs, EditorArrayField, EditorImageUpload } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, ItemHeader, Stack } from './shared';

export function SocialProofEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} />
          <EditorArrayField
            label="Badges / Logos"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Badge"
            defaultItem={{ id: '', image: '', name: 'Certification' }}
            renderItem={(item, update, remove) => (
              <Stack>
                <ItemHeader label={item.name} onRemove={remove} />
                <EditorImageUpload label="Logo / Badge Image" value={item.image} onChange={v => update({ image: v })} />
                <EditorField label="Name / Label" value={item.name} onChange={v => update({ name: v })} />
              </Stack>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'logos'} onChange={v => $set('variant', v)} options={[
            { value: 'logos',          label: '1. Logo Strip' },
            { value: 'award-showcase', label: '2. Award Showcase' },
            { value: 'strip',          label: '3. Scrolling Strip' },
            { value: 'insurance',      label: '4. Insurance Partners' },
            { value: 'dark',           label: '5. Dark Background' },
            { value: 'interactive',    label: '6. Interactive Cards' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}
