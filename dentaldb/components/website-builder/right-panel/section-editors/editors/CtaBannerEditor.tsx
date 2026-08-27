'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorColorPicker, useThemeSwatches } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, PadStack } from './shared';

export function CtaBannerEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  const swatches = useThemeSwatches();
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'horizontal'} onChange={v => $set('variant', v)} options={[
        { value: 'horizontal',        label: '1. Horizontal' },
        { value: 'centered',          label: '2. Centered' },
        { value: 'dark',              label: '3. Dark' },
        { value: 'emergency',         label: '4. Emergency' },
        { value: 'whatsapp',          label: '5. WhatsApp' },
        { value: 'gradient-card',     label: '6. Gradient Card' },
        { value: 'minimal',           label: '7. Minimal' },
        { value: 'split-color',       label: '8. Split Color' },
        { value: 'download-brochure', label: '9. Download Brochure' },
        { value: 'insurance-verify',  label: '10. Insurance Verify' },
        { value: 'health-checkup',    label: '11. Health Checkup' },
      ]} />
      
      <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
      <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
      <EditorField label="Button Text" value={s.ctaText} onChange={v => $set('ctaText', v)} />
      <EditorSelect label="Button Action" value={s.ctaAction} onChange={v => $set('ctaAction', v)} options={[
        { value: 'scroll-to-booking', label: 'Scroll to Booking' },
        { value: 'link',  label: 'Link to URL' },
        { value: 'phone', label: 'Call Phone' },
      ]} />
      {s.ctaAction !== 'scroll-to-booking' && (
        <EditorField label="Action Value" value={s.ctaValue} onChange={v => $set('ctaValue', v)} />
      )}
      <EditorColorPicker swatches={swatches} label="Background Color" value={s.background} onChange={v => $set('background', v)} />
      <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
        { value: 'centered', label: 'Centered' },
        { value: 'split',    label: 'Split (text left, button right)' },
      ]} />
    </PadStack>
  );
}
