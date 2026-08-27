'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorSection } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, font, RemoveBtn, PadStack } from './shared';

export function WorkingHoursEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const inputSt: React.CSSProperties = {
    flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
    padding: '5px 7px', fontSize: 11, background: 'rgba(0,0,0,0.3)',
    color: '#c9ccd8', fontFamily: font, outline: 'none',
  };
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'table'} onChange={v => $set('variant', v)} options={[
        { value: 'table',       label: '1. Table' },
        { value: 'cards',       label: '2. Day Cards' },
        { value: 'premium',     label: '3. Premium Split' },
        { value: 'emergency',   label: '4. Emergency / Dark' },
        { value: 'timeline',    label: '5. Timeline' },
        { value: 'doctor-wise', label: '6. Doctor-Wise' },
      ]} />
      
      <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} />
      <EditorSelect label="Data Source" value={s.dataSource} onChange={v => $set('dataSource', v)} options={[
        { value: 'live-api', label: 'Auto-sync from Clinic Settings' },
        { value: 'manual',   label: 'Manual Entry' },
      ]} />
      {s.dataSource === 'manual' && (
        <EditorSection title="Hours">
          {days.map(day => {
            const slot = s.hours?.[day];
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, fontSize: 10.5, fontWeight: 600, color: '#6b7080', textTransform: 'capitalize', fontFamily: font }}>{day.slice(0,3)}</div>
                {slot ? (
                  <>
                    <input type="time" value={slot.open}  onChange={e => $set('hours', { ...s.hours, [day]: { ...slot, open:  e.target.value }})} style={inputSt} />
                    <span style={{ color: '#4b5060', fontSize: 10 }}>–</span>
                    <input type="time" value={slot.close} onChange={e => $set('hours', { ...s.hours, [day]: { ...slot, close: e.target.value }})} style={inputSt} />
                    <RemoveBtn onClick={() => $set('hours', { ...s.hours, [day]: null })} />
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 11, color: '#4b5060', fontStyle: 'italic', fontFamily: font }}>Closed</span>
                    <button onClick={() => $set('hours', { ...s.hours, [day]: { open: '09:00', close: '17:00' }})}
                      style={{ fontSize: 11, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font, padding: '2px 4px' }}>
                      + Add
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </EditorSection>
      )}
      <EditorToggle label="Highlight Today"  checked={s.showTodayHighlight !== false} onChange={v => $set('showTodayHighlight', v)} />
      <EditorToggle label="Show Closed Days" checked={s.showClosedDays !== false}     onChange={v => $set('showClosedDays', v)} />
      <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
        { value: 'table', label: 'Table' }, { value: 'cards', label: 'Cards' }, { value: 'list', label: 'List' },
      ]} />
    </PadStack>
  );
}
