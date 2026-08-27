'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorTabs, EditorImageUpload } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function AboutEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Body Text" value={s.body}    onChange={v => $set('body', v)} multiline rows={5} />
          <EditorImageUpload label="Image" value={s.image} onChange={v => $set('image', v)} />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'split'} onChange={v => $set('variant', v)} options={[
            { value: 'split',            label: '1. Classic Split' },
            { value: 'timeline',         label: '2. Timeline' },
            { value: 'mission-vision',   label: '3. Mission & Vision' },
            { value: 'founder-spotlight',label: '4. Founder Spotlight' },
            { value: 'stats-integrated', label: '5. Stats Integrated' },
            { value: 'multi-column',     label: '6. Multi-Column' },
            { value: 'awards',           label: '7. Awards' },
            { value: 'story-layout',     label: '8. Story Layout' },
            { value: 'image-gallery-style', label: '9. Image Gallery' },
          ]} />
          <EditorSelect label="Image Position" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'image-right', label: 'Image Right' },
            { value: 'image-left',  label: 'Image Left' },
            { value: 'full-width',  label: 'Full Width' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}
