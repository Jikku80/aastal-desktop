import { useState, useCallback } from 'react';
import { useSensors, useSensor, PointerSensor, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useBuilderStore } from './useBuilderState';
import { SECTION_DEFAULTS } from '../utils/sectionMeta';
import type { SectionType } from './useBuilderState';

export function useDragAndDrop() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const {
    pages, selectedPageId, addSection, reorderSections, reorderPages,
  } = useBuilderStore();

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setActiveData(event.active.data.current);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Could use this to show drop indicator between sections
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr   = String(over.id);

    // ── Case 0: Reorder pages in the left panel ───────────────────────────────
    if (activeIdStr.startsWith('page:') && overIdStr.startsWith('page:')) {
      const fromId = activeIdStr.replace('page:', '');
      const toId   = overIdStr.replace('page:', '');
      if (fromId === toId) return;

      const oldIndex = pages.findIndex(p => p.id === fromId);
      const newIndex = pages.findIndex(p => p.id === toId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(pages.map(p => p.id), oldIndex, newIndex);
      reorderPages(newOrder);
      return;
    }

    if (!selectedPageId) return;

    // ── Case 1: Drag from library onto canvas ─────────────────────────────────
    if (activeIdStr.startsWith('library:')) {
      const sectionType = active.data.current?.sectionType as SectionType;
      if (!sectionType) return;

      const currentPage = pages.find(p => p.id === selectedPageId);
      if (!currentPage) return;

      // Determine insert position from over element
      let position: number | undefined;
      if (overIdStr.startsWith('section:')) {
        const sectionId = overIdStr.replace('section:', '');
        const idx = currentPage.sections.findIndex(s => s.id === sectionId);
        if (idx !== -1) position = idx;
      } else if (overIdStr === 'canvas-drop-zone') {
        position = undefined; // append at end
      }

      addSection(
        selectedPageId,
        {
          type:     sectionType,
          visible:  true,
          layout:   'contained',
          settings: { ...(SECTION_DEFAULTS[sectionType] || {}) },
        },
        position,
      );
      return;
    }

    // ── Case 2: Reorder sections within canvas ────────────────────────────────
    if (activeIdStr.startsWith('section:') && overIdStr.startsWith('section:')) {
      const fromId = activeIdStr.replace('section:', '');
      const toId   = overIdStr.replace('section:', '');
      if (fromId === toId) return;

      const currentPage = pages.find(p => p.id === selectedPageId);
      if (!currentPage) return;

      const oldIndex = currentPage.sections.findIndex(s => s.id === fromId);
      const newIndex = currentPage.sections.findIndex(s => s.id === toId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(
        currentPage.sections.map(s => s.id),
        oldIndex,
        newIndex,
      );
      reorderSections(selectedPageId, newOrder);
    }
  }, [selectedPageId, pages, addSection, reorderSections, reorderPages]);

  return { activeId, activeData, sensors, handleDragStart, handleDragOver, handleDragEnd };
}
