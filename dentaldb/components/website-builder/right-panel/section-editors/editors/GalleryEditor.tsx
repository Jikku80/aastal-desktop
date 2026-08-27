'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorTabs, EditorArrayField, EditorImageUpload } from '../EditorComponents';
import { EditorListItem } from '../EditorListItem';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function GalleryEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorArrayField
            label="Images"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Image"
            defaultItem={{ id: '', url: '', caption: '' }}
            bare
            renderItem={(item, update, remove, index) => (
              <EditorListItem summary={item.caption || `Image ${index + 1}`} onRemove={remove}>
                <EditorImageUpload label="Photo" value={item.url} onChange={v => update({ url: v })} />
                <EditorField label="Caption" value={item.caption} onChange={v => update({ caption: v })} />
              </EditorListItem>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'grid'} onChange={v => $set('variant', v)} options={[
            { value: 'grid',               label: '1. Grid' },
            { value: 'masonry',            label: '2. Masonry' },
            { value: 'bento',              label: '3. Bento' },
            { value: 'before-after',       label: '4. Before & After' },
            { value: 'clinic-tour',        label: '5. Clinic Tour' },
            { value: 'lightbox',           label: '6. Lightbox' },
            { value: 'luxury',             label: '7. Luxury' },
            { value: 'equipment',          label: '8. Equipment' },
            { value: 'carousel-gallery',   label: '9. Carousel' },
            { value: 'department-gallery', label: '10. Department Gallery' },
            { value: 'stacked-modern',     label: '11. Stacked Modern' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'grid',    label: 'Grid' },
            { value: 'masonry', label: 'Masonry' },
            { value: 'carousel',label: 'Carousel' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns)} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}
