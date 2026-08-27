'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorTabs, EditorArrayField } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, ItemHeader, Stack } from './shared';

export function BranchesEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorSelect label="Data Source" value={s.dataSource} onChange={v => $set('dataSource', v)} options={[
            { value: 'live-api', label: 'Auto-sync from Branches' },
            { value: 'manual',   label: 'Manual Entry' },
          ]} />
          {s.dataSource === 'manual' && (
            <EditorArrayField
              label="Locations"
              items={s.items || []}
              onChange={items => $set('items', items)}
              addLabel="Add Branch"
              defaultItem={{ id: '', name: 'Branch Name', address: '', phone: '', email: '' }}
              renderItem={(item, update, remove) => (
                <Stack>
                  <ItemHeader label={item.name} onRemove={remove} />
                  <EditorField label="Name"    value={item.name}    onChange={v => update({ name: v })} />
                  <EditorField label="Address" value={item.address} onChange={v => update({ address: v })} multiline rows={2} />
                  <EditorField label="Phone"   value={item.phone}   onChange={v => update({ phone: v })} />
                  <EditorField label="Email"   value={item.email}   onChange={v => update({ email: v })} />
                </Stack>
              )}
            />
          )}
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',              label: '1. Cards' },
            { value: 'map-first',          label: '2. Map First' },
            { value: 'premium',            label: '3. Premium' },
            { value: 'city-grid',          label: '4. City Grid' },
            { value: 'hospital-network',   label: '5. Hospital Network' },
            { value: 'carousel',           label: '6. Carousel' },
            { value: 'regional-directory', label: '7. Regional Directory' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'cards', label: 'Cards' }, { value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' },
          ]} />
          <EditorToggle label="Show Map per Branch" checked={s.showMap === true} onChange={v => $set('showMap', v)} />
        </Stack>
      )},
    ]} />
  );
}
