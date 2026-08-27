'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorTabs, EditorArrayField, EditorRating } from '../EditorComponents';
import { EditorListItem } from '../EditorListItem';
import type { Props } from './shared';
import { safe, set, font, Stack } from './shared';

export function TestimonialsEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorArrayField
            label="Reviews"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Review"
            defaultItem={{ id: '', name: 'Patient Name', rating: 5, text: 'Great experience!', role: 'Patient' }}
            bare
            renderItem={(item, update, remove) => (
              <EditorListItem summary={item.name || 'Untitled review'} onRemove={remove}>
                <EditorField label="Name" value={item.name} onChange={v => update({ name: v })} />
                <EditorField label="Role" value={item.role} onChange={v => update({ role: v })} placeholder="Patient" />
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#8b8fa8', marginBottom: 5, fontFamily: font }}>Rating</label>
                  <EditorRating value={item.rating} onChange={v => update({ rating: v })} />
                </div>
                <EditorField label="Review" value={item.text} onChange={v => update({ text: v })} multiline rows={3} />
              </EditorListItem>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',              label: '1. Cards' },
            { value: 'bento-reviews',      label: '2. Bento Reviews' },
            { value: 'google-style',       label: '3. Google Style' },
            { value: 'large-quote',        label: '4. Large Quote' },
            { value: 'trust-wall',         label: '5. Trust Wall' },
            { value: 'featured-story',     label: '6. Featured Story' },
            { value: 'minimal',            label: '7. Minimal' },
            { value: 'carousel',           label: '8. Carousel' },
            { value: 'stats-reviews',      label: '9. Stats + Reviews' },
            { value: 'doctor-specific',    label: '10. Doctor Specific' },
            { value: 'department-reviews', label: '11. Department Reviews' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'carousel', label: 'Carousel' },
            { value: 'grid',     label: 'Grid' },
            { value: 'list',     label: 'List' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}
