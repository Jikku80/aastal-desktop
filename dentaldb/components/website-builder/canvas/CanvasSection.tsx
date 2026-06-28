'use client';

import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Copy, Trash2, ChevronUp, ChevronDown, EyeOff } from 'lucide-react';
import { useBuilderStore, type SectionConfig } from '../hooks/useBuilderState';
import { SectionRenderer } from './SectionRenderer';

interface CanvasSectionProps {
  section: SectionConfig;
  pageId:  string;
  index:   number;
  total:   number;
}

export function CanvasSection({ section, pageId, index, total }: CanvasSectionProps) {
  const [hovered, setHovered] = useState(false);

  const {
    selectedSectionId, setSelectedSection, setRightPanel,
    deleteSection, duplicateSection, updateSection, reorderSections,
    pages,
  } = useBuilderStore();

  const isSelected = selectedSectionId === section.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `section:${section.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative' as const,
  };

  const handleSelect = useCallback(() => {
    setSelectedSection(section.id);
    setRightPanel('section');
  }, [section.id, setSelectedSection, setRightPanel]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this section?')) deleteSection(pageId, section.id);
  }, [pageId, section.id, deleteSection]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateSection(pageId, section.id);
  }, [pageId, section.id, duplicateSection]);

  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const page = pages.find(p => p.id === pageId);
    if (!page || index === 0) return;
    const ids = page.sections.map(s => s.id);
    const newIds = [...ids];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    useBuilderStore.getState().reorderSections(pageId, newIds);
  }, [pageId, index, pages]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const page = pages.find(p => p.id === pageId);
    if (!page || index >= total - 1) return;
    const ids = page.sections.map(s => s.id);
    const newIds = [...ids];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    useBuilderStore.getState().reorderSections(pageId, newIds);
  }, [pageId, index, total, pages]);

  const handleToggleVisible = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateSection(pageId, section.id, { visible: !section.visible });
  }, [pageId, section.id, section.visible, updateSection]);

  const showBar = hovered || isSelected;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        outline: isSelected
          ? '2px solid #6366f1'
          : hovered && !isSelected
            ? '1px solid rgba(99,102,241,0.35)'
            : 'none',
        outlineOffset: isSelected ? '-2px' : '-1px',
        zIndex: isSelected ? 10 : 1,
        opacity: (!section.visible || isDragging) ? 0.4 : 1,
        cursor: 'pointer',
        transition: 'opacity 0.15s, outline 0.1s',
      }}
      onClick={handleSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action bar */}
      {showBar && (
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 10px',
            background: isSelected
              ? 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)'
              : 'rgba(99,102,241,0.85)',
            backdropFilter: 'blur(8px)',
            height: 32,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              {...attributes}
              {...listeners}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'none', border: 'none', padding: '4px', cursor: 'grab',
                color: 'rgba(255,255,255,0.7)', borderRadius: 4,
                transition: 'color 0.1s',
              }}
              title="Drag to reorder"
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              <GripVertical size={13} />
            </button>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
              textTransform: 'capitalize', letterSpacing: '0.02em',
              fontFamily: "'Inter','Geist',system-ui,sans-serif",
            }}>
              {section.type.replace(/-/g, ' ')}
            </span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ActionBtn onClick={handleMoveUp}    title="Move up"   disabled={index === 0}><ChevronUp size={12} /></ActionBtn>
            <ActionBtn onClick={handleMoveDown}  title="Move down" disabled={index >= total - 1}><ChevronDown size={12} /></ActionBtn>
            <ActionBtn onClick={handleToggleVisible} title={section.visible ? 'Hide' : 'Show'}><EyeOff size={12} /></ActionBtn>
            <ActionBtn onClick={handleDuplicate} title="Duplicate"><Copy size={12} /></ActionBtn>
            <ActionBtn onClick={() => { setSelectedSection(section.id); setRightPanel('section'); }} title="Edit"><Pencil size={12} /></ActionBtn>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />
            <ActionBtn onClick={handleDelete} title="Delete" danger><Trash2 size={12} /></ActionBtn>
          </div>
        </div>
      )}

      {/* Selected glow top accent */}
      {isSelected && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#6366f1', zIndex: 25 }} />
      )}

      <SectionRenderer section={section} />
    </div>
  );
}

function ActionBtn({
  children, onClick, title, disabled, danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 5, border: 'none',
        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.15)';
          e.currentTarget.style.color = danger ? '#fca5a5' : '#fff';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)';
      }}
    >
      {children}
    </button>
  );
}