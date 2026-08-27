'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorColorPicker, useThemeSwatches, EditorTabs } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, PadStack } from './shared';

export function AiChatbotEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  const swatches = useThemeSwatches();
  return (
    <EditorTabs tabs={[
      { label: 'Clinic Info', content: (
        <PadStack>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11.5, color: '#a5b4fc', lineHeight: 1.6 }}>
            💡 Fill in your clinic details below. The AI chatbot will use this information to answer visitor questions automatically.
          </div>
          <EditorField label="Clinic Name"   value={s.clinicName}   onChange={v => $set('clinicName', v)} placeholder="e.g. Bright Smile Dental" />
          <EditorField label="Phone Number"  value={s.clinicPhone}  onChange={v => $set('clinicPhone', v)} placeholder="e.g. +977 980-000-0000" />
          <EditorField label="Email"         value={s.clinicEmail}  onChange={v => $set('clinicEmail', v)} placeholder="e.g. info@clinic.com" />
          <EditorField label="Opening Hours" value={s.openingHours} onChange={v => $set('openingHours', v)} multiline rows={3}
            placeholder="e.g. Mon–Fri: 9am–5pm&#10;Sat: 9am–1pm&#10;Sun: Closed" />
          <EditorField label="Branch Locations" value={s.branches} onChange={v => $set('branches', v)} multiline rows={4}
            placeholder="e.g. Main Branch — 123 Medical Ave, Ph: 01-000000&#10;Downtown — 456 Health St, Ph: 01-111111" />
          <EditorField label="Doctors / Specialists" value={s.doctors} onChange={v => $set('doctors', v)} multiline rows={3}
            placeholder="e.g. Dr. Smith (General Dentistry)&#10;Dr. Patel (Orthodontist)" />
          <EditorField label="Services Offered" value={s.services} onChange={v => $set('services', v)} multiline rows={3}
            placeholder="e.g. Teeth Cleaning, Root Canal, Braces, Whitening…" />
          <EditorField label="Additional Info" value={s.extraInfo} onChange={v => $set('extraInfo', v)} multiline rows={3}
            placeholder="Anything else the chatbot should know (insurance, parking, etc.)" />
        </PadStack>
      )},
      { label: 'Appearance', content: (
        <PadStack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'floating'} onChange={v => $set('variant', v)} options={[
            { value: 'floating',    label: '1. Floating Widget' },
            { value: 'sidebar',     label: '2. Sidebar Panel' },
            { value: 'full-panel',  label: '3. Full Panel' },
            { value: 'doctor-ai',   label: '4. Doctor AI' },
            { value: 'minimal',     label: '5. Minimal' },
          ]} />
          <EditorField label="Chat Widget Title" value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle"          value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Bot Name"          value={s.botName}  onChange={v => $set('botName', v)} placeholder="e.g. Clinic Assistant" />
          <EditorField label="Welcome Message"   value={s.welcomeMessage} onChange={v => $set('welcomeMessage', v)} multiline rows={3} />
          <EditorColorPicker swatches={swatches} label="Accent Color" value={s.accentColor || '#0ea5e9'} onChange={v => $set('accentColor', v)} />
          <EditorSelect label="Widget Position" value={s.position || 'bottom-right'} onChange={v => $set('position', v)} options={[
            { value: 'bottom-right', label: 'Bottom Right (floating)' },
            { value: 'bottom-left',  label: 'Bottom Left (floating)' },
            { value: 'inline',       label: 'Inline (embedded in page)' },
          ]} />
        </PadStack>
      )},
    ]} />
  );
}
