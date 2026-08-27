'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorColorPicker, useThemeSwatches } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, PadStack } from './shared';

export function WhatsAppButtonEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  const swatches = useThemeSwatches();
  return (
    <PadStack>
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', fontSize: 11.5, color: '#86efac', lineHeight: 1.6 }}>
        🟢 Add your WhatsApp number below. Visitors will click the floating button and be taken directly to a WhatsApp chat with your clinic.
      </div>
      <EditorSelect label="Design Variant" value={s.variant ?? 'floating-circle'} onChange={v => $set('variant', v)} options={[
        { value: 'floating-circle', label: '1. Floating Circle' },
        { value: 'floating-pill',   label: '2. Floating Pill' },
        { value: 'bottom-bar',      label: '3. Bottom Bar' },
        { value: 'doctor-avatar',   label: '4. Doctor Avatar' },
      ]} />
      <EditorField
        label="WhatsApp Phone Number"
        value={s.phoneNumber}
        onChange={v => $set('phoneNumber', v)}
        placeholder="e.g. 9779800000000  (country code, no + or spaces)"
      />
      <EditorField
        label="Pre-filled Message"
        value={s.welcomeMessage}
        onChange={v => $set('welcomeMessage', v)}
        multiline rows={2}
        placeholder="e.g. Hello! I have a question about your clinic."
      />
      <EditorField label="Banner Heading"  value={s.bannerText}    onChange={v => $set('bannerText', v)}    placeholder="How can I help you?" />
      <EditorField label="Banner Subtext"  value={s.bannerSubText} onChange={v => $set('bannerSubText', v)} placeholder="Chat with us on WhatsApp" />
      <EditorColorPicker swatches={swatches} label="Button Color" value={s.accentColor || '#25D366'} onChange={v => $set('accentColor', v)} />
      <EditorSelect label="Button Position" value={s.position || 'bottom-right'} onChange={v => $set('position', v)} options={[
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'bottom-left',  label: 'Bottom Left' },
      ]} />
    </PadStack>
  );
}
