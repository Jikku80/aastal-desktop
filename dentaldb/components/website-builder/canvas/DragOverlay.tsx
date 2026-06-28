'use client';

import React from 'react';
import { getSectionMeta } from '../utils/sectionMeta';
import { useBuilderStore } from '../hooks/useBuilderState';
import type { SectionType } from '../hooks/useBuilderState';

export function DragOverlayContent({ activeId }: { activeId: string }) {
  const { pages, selectedPageId } = useBuilderStore();

  // Library drag
  if (activeId.startsWith('library:')) {
    const sectionType = activeId.replace('library:', '') as SectionType;
    const meta = getSectionMeta(sectionType);
    return (
      <div className="bg-white border-2 border-blue-500 rounded-xl shadow-2xl p-3 w-48 opacity-90 rotate-1 pointer-events-none">
        <div className="text-xs font-semibold text-blue-600">{meta.label}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{meta.description}</div>
      </div>
    );
  }

  // Section reorder drag
  if (activeId.startsWith('section:')) {
    const sectionId = activeId.replace('section:', '');
    const page = pages.find(p => p.id === selectedPageId);
    const section = page?.sections.find(s => s.id === sectionId);
    if (!section) return null;
    const meta = getSectionMeta(section.type);
    return (
      <div className="bg-white border-2 border-blue-500 rounded-lg shadow-2xl px-4 py-3 w-64 opacity-90 pointer-events-none">
        <div className="text-xs font-semibold text-gray-700">{meta.label}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">Moving section...</div>
      </div>
    );
  }

  return null;
}
