'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorTabs } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, Stack } from './shared';

export function ClinicInfoEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'modern-card'} onChange={v => $set('variant', v)} options={[
            { value: 'modern-card',          label: '1. Modern Card' },
            { value: 'premium-overview',     label: '2. Premium Overview' },
            { value: 'founder-message',      label: '3. Founder Message' },
            { value: 'medical-excellence',   label: '4. Medical Excellence' },
            { value: 'split-image-content',  label: '5. Split Image + Content' },
            { value: 'multi-column-overview',label: '6. Multi-Column Overview' },
            { value: 'timeline-history',     label: '7. Timeline / History' },
          ]} />
          <EditorField label="Title"       value={s.title}       onChange={v => $set('title', v)} />
          <EditorField label="Description" value={s.description} onChange={v => $set('description', v)} multiline />
          <EditorField label="Badge Text"  value={s.badge}       onChange={v => $set('badge', v)} />
          <EditorField label="CTA Text"    value={s.ctaText}     onChange={v => $set('ctaText', v)} />
        </Stack>
      )},
      { label: 'Stats', content: (
        <Stack>
          <EditorField label="Stat 1 Value"  value={s.stat1Val} onChange={v => $set('stat1Val', v)} placeholder="15+" />
          <EditorField label="Stat 1 Label"  value={s.stat1Lbl} onChange={v => $set('stat1Lbl', v)} placeholder="Years Experience" />
          <EditorField label="Stat 2 Value"  value={s.stat2Val} onChange={v => $set('stat2Val', v)} placeholder="10K+" />
          <EditorField label="Stat 2 Label"  value={s.stat2Lbl} onChange={v => $set('stat2Lbl', v)} placeholder="Patients Treated" />
          <EditorField label="Stat 3 Value"  value={s.stat3Val} onChange={v => $set('stat3Val', v)} placeholder="50+" />
          <EditorField label="Stat 3 Label"  value={s.stat3Lbl} onChange={v => $set('stat3Lbl', v)} placeholder="Specialists" />
          <EditorField label="Stat 4 Value"  value={s.stat4Val} onChange={v => $set('stat4Val', v)} placeholder="98%" />
          <EditorField label="Stat 4 Label"  value={s.stat4Lbl} onChange={v => $set('stat4Lbl', v)} placeholder="Satisfaction" />
        </Stack>
      )},
    ]} />
  );
}
