'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorTabs, EditorArrayField } from '../EditorComponents';
import { EditorListItem } from '../EditorListItem';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function ServicesEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorArrayField
            label="Services"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Service"
            defaultItem={{ id: '', title: 'New Service', icon: '🩺', description: '', price: '' }}
            bare
            renderItem={(item, update, remove) => (
              <EditorListItem summary={item.title || 'Untitled service'} onRemove={remove}>
                <EditorField label="Title" value={item.title} onChange={v => update({ title: v })} />
                <EditorField label="Icon" value={item.icon} onChange={v => update({ icon: v })} placeholder="e.g. ♥ or leave blank" />
                <EditorField label="Description" value={item.description} onChange={v => update({ description: v })} multiline rows={2} />
                <EditorField label="Price (optional)" value={item.price} onChange={v => update({ price: v })} placeholder="NPR 500" />
              </EditorListItem>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',               label: '1. Cards' },
            { value: 'premium-cards',       label: '2. Premium Cards' },
            { value: 'bento-grid',          label: '3. Bento Grid' },
            { value: 'icon-based',          label: '4. Icon Based' },
            { value: 'tabs',                label: '5. Tabs' },
            { value: 'image-first',         label: '6. Image First' },
            { value: 'treatment-pathway',   label: '7. Treatment Pathway' },
            { value: 'accordion',           label: '8. Accordion' },
            { value: 'horizontal-scroll',   label: '9. Horizontal Scroll' },
            { value: 'category-groups',     label: '10. Category Groups' },
            { value: 'department-showcase', label: '11. Department Showcase' },
            { value: 'interactive-hover',   label: '12. Interactive Hover' },
            { value: 'specialist-grid',     label: '13. Specialist Grid' },
            { value: 'masonry-grid',        label: '14. Masonry Grid' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns)} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
          ]} />
          <EditorToggle label="Show Icons"  checked={s.showIcons  !== false} onChange={v => $set('showIcons',  v)} />
          <EditorToggle label="Show Prices" checked={s.showPrices === true}  onChange={v => $set('showPrices', v)} />
        </Stack>
      )},
    ]} />
  );
}
