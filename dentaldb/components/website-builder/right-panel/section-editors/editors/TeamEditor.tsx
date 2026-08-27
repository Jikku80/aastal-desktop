'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorTabs, EditorArrayField, EditorImageUpload } from '../EditorComponents';
import { EditorListItem } from '../EditorListItem';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function TeamEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorSelect label="Data Source" value={s.dataSource} onChange={v => $set('dataSource', v)} options={[
            { value: 'live-api', label: 'Live — Auto-sync from Doctors' },
            { value: 'manual',   label: 'Manual — Manage members below' },
          ]} />
          {s.dataSource === 'manual' && (
            <EditorArrayField
              label="Team Members"
              items={s.members || []}
              onChange={items => $set('members', items)}
              addLabel="Add Member"
              defaultItem={{ id: '', name: 'Dr. Name', role: 'Specialist', bio: '', avatar: '', showBookButton: true }}
              bare
              renderItem={(item, update, remove) => (
                <EditorListItem summary={item.name || 'Untitled member'} onRemove={remove}>
                  <EditorImageUpload label="Avatar" value={item.avatar} onChange={v => update({ avatar: v })} />
                  <EditorField label="Name"  value={item.name} onChange={v => update({ name: v })} />
                  <EditorField label="Role"  value={item.role} onChange={v => update({ role: v })} placeholder="Cardiologist" />
                  <EditorField label="Bio"   value={item.bio}  onChange={v => update({ bio: v })} multiline rows={2} />
                </EditorListItem>
              )}
            />
          )}
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',                         label: '1. Cards' },
            { value: 'premium-profiles',              label: '2. Premium Profiles' },
            { value: 'featured-doctor',               label: '3. Featured Doctor' },
            { value: 'horizontal-cards',              label: '4. Horizontal Cards' },
            { value: 'luxury-cosmetic-specialists',   label: '5. Luxury Cosmetic' },
            { value: 'department-groups',             label: '6. Department Groups' },
            { value: 'bento',                         label: '7. Bento' },
            { value: 'carousel',                      label: '8. Carousel' },
            { value: 'team-wall',                     label: '9. Team Wall' },
            { value: 'medical-board',                 label: '10. Medical Board' },
            { value: 'multi-location-listing',        label: '11. Multi-Location Listing' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'grid',     label: 'Grid' },
            { value: 'cards',    label: 'Cards' },
            { value: 'list',     label: 'List' },
            { value: 'carousel', label: 'Carousel' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns)} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
          ]} />
          <EditorToggle label="Show Specializations" checked={s.showSpecializations !== false} onChange={v => $set('showSpecializations', v)} />
          <EditorToggle label="Show Book Button"     checked={s.showBookButton !== false}      onChange={v => $set('showBookButton', v)} />
        </Stack>
      )},
    ]} />
  );
}
