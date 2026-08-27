'use client';

import React from 'react';
import { EditorField, EditorSelect } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, PadStack } from './shared';

export function AvailableSlotsEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'grid'} onChange={v => $set('variant', v)} options={[
        { value: 'grid',        label: '1. Slot Grid' },
        { value: 'day-cards',   label: '2. Day Cards' },
        { value: 'timeline',    label: '3. Timeline' },
        { value: 'doctor-wise', label: '4. Doctor-Wise' },
        { value: 'compact',     label: '5. Compact' },
      ]} />
      <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
      <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
      <EditorSelect label="Branch Filter" value={s.branchFilter ?? 'all'} onChange={v => $set('branchFilter', v)} options={[
        { value: 'all', label: 'All Branches' },
      ]} />
      <EditorSelect label="Doctor Filter" value={s.doctorFilter ?? 'all'} onChange={v => $set('doctorFilter', v)} options={[
        { value: 'all', label: 'All Doctors' },
      ]} />
    </PadStack>
  );
}
