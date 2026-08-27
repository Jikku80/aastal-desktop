'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorArrayField } from '../EditorComponents';
import { EditorListItem } from '../EditorListItem';
import type { Props } from './shared';
import { safe, set, PadStack } from './shared';

export function FaqEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'accordion'} onChange={v => $set('variant', v)} options={[
        { value: 'accordion', label: '1. Accordion' },
        { value: 'modern-cards', label: '2. Modern Cards' },
        { value: 'two-column', label: '3. Two Column' },
        { value: 'premium', label: '4. Premium' },
        { value: 'category', label: '5. Category' },
        { value: 'dark', label: '6. Dark' },
      ]} />
      
      <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
      <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
      <EditorArrayField
        label="Questions"
        items={s.items || []}
        onChange={items => $set('items', items)}
        addLabel="Add Question"
        defaultItem={{ id: '', question: 'Your Question?', answer: 'Your Answer.' }}
        bare
        renderItem={(item, update, remove) => (
          <EditorListItem summary={item.question || 'Untitled question'} onRemove={remove}>
            <EditorField label="Question" value={item.question} onChange={v => update({ question: v })} />
            <EditorField label="Answer"   value={item.answer}   onChange={v => update({ answer: v })} multiline rows={3} />
          </EditorListItem>
        )}
      />
    </PadStack>
  );
}
