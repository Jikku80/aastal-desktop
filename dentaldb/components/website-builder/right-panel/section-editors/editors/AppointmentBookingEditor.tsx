'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorSection, EditorTabs } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function AppointmentBookingEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'classic'} onChange={v => $set('variant', v)} options={[
            { value: 'classic', label: '1. Classic Calendar' },
            { value: 'full-width', label: '2. Full Width' },
            { value: 'sidebar-card', label: '3. Sidebar Card' },
            { value: 'luxury', label: '4. Luxury' },
            { value: 'multi-step', label: '5. Multi-Step' },
            { value: 'doctor-first', label: '6. Doctor First' },
            { value: 'treatment-first', label: '7. Treatment First' },
            { value: 'emergency-booking', label: '8. Emergency Booking' },
            { value: 'quick-consult', label: '9. Quick Consult' },
            { value: 'sticky-cta', label: '10. Sticky CTA' },
          ]} />
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Confirmation Message" value={s.confirmationMessage} onChange={v => $set('confirmationMessage', v)} multiline />
        </Stack>
      )},
      { label: 'Options', content: (
        <Stack>
          <EditorSection title="Filters">
            <EditorSelect label="Branch Filter" value={s.branchFilter} onChange={v => $set('branchFilter', v)} options={[
              { value: 'all',      label: 'All Branches' },
              { value: 'specific', label: 'Specific Branch' },
            ]} />
            <EditorSelect label="Doctor Filter" value={s.doctorFilter} onChange={v => $set('doctorFilter', v)} options={[
              { value: 'all',      label: 'All Doctors' },
              { value: 'specific', label: 'Specific Doctor' },
            ]} />
          </EditorSection>
          <EditorSection title="Calendar Style">
            <EditorSelect label="Style" value={s.calendarStyle} onChange={v => $set('calendarStyle', v)} options={[
              { value: 'slots-grid',      label: 'Slots Grid' },
              { value: 'date-picker',     label: 'Date Picker' },
              { value: 'inline-calendar', label: 'Inline Calendar' },
            ]} />
          </EditorSection>
          <EditorSection title="Form Fields">
            {['patientName','patientPhone','patientEmail','notes','doctorSelect','branchSelect'].map(f => (
              <EditorToggle key={f}
                label={f.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                checked={s.formFields?.[f] !== false}
                onChange={v => $set('formFields', { ...(s.formFields || {}), [f]: v })}
              />
            ))}
          </EditorSection>
        </Stack>
      )},
    ]} />
  );
}
