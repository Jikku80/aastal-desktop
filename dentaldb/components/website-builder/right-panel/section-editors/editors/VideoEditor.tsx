'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, font, PadStack } from './shared';

export function VideoEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'centered'} onChange={v => $set('variant', v)} options={[
        { value: 'centered', label: '1. Centered' },
        { value: 'side-by-side', label: '2. Side by Side' },
        { value: 'gallery', label: '3. Gallery' },
        { value: 'testimonial-video', label: '4. Testimonial Videos' },
        { value: 'fullwidth', label: '5. Full Width' },
      ]} />
      
      <EditorField label="Title (optional)" value={s.title} onChange={v => $set('title', v)} />
      <EditorField
        label="Video URL"
        value={s.url}
        onChange={v => $set('url', v)}
        placeholder="https://www.youtube.com/embed/..."
      />
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, lineHeight: 1.5, fontFamily: font }}>
        Use the embed URL from YouTube: Share → Embed → copy src
      </p>
      <EditorField label="Caption" value={s.caption} onChange={v => $set('caption', v)} />
      <EditorToggle label="Autoplay" checked={s.autoplay === true} onChange={v => $set('autoplay', v)} />
      <EditorToggle label="Loop"     checked={s.loop     === true} onChange={v => $set('loop', v)} />
    </PadStack>
  );
}
