'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorTabs } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function ContactEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'classic'} onChange={v => $set('variant', v)} options={[
        { value: 'classic',        label: '1. Classic' },
        { value: 'premium',        label: '2. Premium' },
        { value: 'minimal',        label: '3. Minimal' },
        { value: 'emergency',      label: '4. Emergency' },
        { value: 'multi-location', label: '5. Multi-Location' },
        { value: 'consultation',   label: '6. Consultation' },
        { value: 'contact-faq',    label: '7. Contact + FAQ' },
        { value: 'dept-inquiry',   label: '8. Department Inquiry' },
        { value: 'doctor-inquiry', label: '9. Doctor Inquiry' },
      ]} />
      
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Address"  value={s.address}  onChange={v => $set('address', v)} multiline rows={2} />
          <EditorField label="Phone"    value={s.phone}    onChange={v => $set('phone', v)} />
          <EditorField label="Email"    value={s.email}    onChange={v => $set('email', v)} />
          <EditorField label="Map Embed URL" value={s.mapEmbedUrl} onChange={v => $set('mapEmbedUrl', v)} placeholder="Google Maps embed URL" />
        </Stack>
      )},
      { label: 'Options', content: (
        <Stack>
          <EditorToggle label="Show Contact Form"    checked={s.showForm    !== false} onChange={v => $set('showForm', v)} />
          <EditorToggle label="Show Map"             checked={s.showMap     === true}  onChange={v => $set('showMap', v)} />
          <EditorToggle label="Show Contact Details" checked={s.showDetails !== false} onChange={v => $set('showDetails', v)} />
        </Stack>
      )},
    ]} />
  );
}
