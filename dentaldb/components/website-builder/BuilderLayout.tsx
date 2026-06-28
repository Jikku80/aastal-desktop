'use client';

import React, { useEffect, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useBuilderStore } from './hooks/useBuilderState';
import { useAutoSave } from './hooks/useAutoSave';
import { BuilderToolbar } from './toolbar/BuilderToolbar';
import { LeftPanel } from './LeftPanel';
import { BuilderCanvas } from './canvas/BuilderCanvas';
import { RightPanel } from './right-panel/RightPanel';
import { DragOverlayContent } from './canvas/DragOverlay';
import { useDragAndDrop } from './hooks/useDragAndDrop';

interface BuilderLayoutProps {
  clinicId: string;
  subdomain: string;
  onSave: (snapshot: any) => Promise<void>;
}

export function BuilderLayout({ clinicId, subdomain, onSave }: BuilderLayoutProps) {
  const { undo, redo, canUndo, canRedo, setSelectedSection } = useBuilderStore();
  const { activeId, handleDragStart, handleDragEnd, handleDragOver, sensors } = useDragAndDrop();

  useAutoSave(clinicId, onSave);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
    if (isInput) return;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); if (canUndo()) undo(); }
    if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) { e.preventDefault(); if (canRedo()) redo(); }
    if (e.key === 'Escape') setSelectedSection(null);
  }, [undo, redo, canUndo, canRedo, setSelectedSection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <style>{`
        .builder-scrollbar::-webkit-scrollbar { width: 4px; }
        .builder-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .builder-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .builder-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
        @keyframes builder-spin { to { transform: rotate(360deg); } }
        @keyframes builder-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw',
        overflow: 'hidden', minWidth: 1280,
        background: '#0d0e12',
        fontFamily: "'Inter','Geist','Segoe UI',system-ui,sans-serif",
        color: '#f1f2f6',
      }}>
        <BuilderToolbar clinicId={clinicId} subdomain={subdomain} onSave={onSave} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside style={{
            width: 260, flexShrink: 0,
            background: '#111318',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <LeftPanel onSave={onSave} />
          </aside>

          <main style={{
            flex: 1, overflow: 'auto',
            background: '#161820',
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(99,102,241,0.04) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(139,92,246,0.03) 0%, transparent 50%),
              repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,255,255,0.015) 31px, rgba(255,255,255,0.015) 32px),
              repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,255,255,0.015) 31px, rgba(255,255,255,0.015) 32px)
            `,
          }} className="builder-scrollbar">
            <BuilderCanvas />
          </main>

          <aside style={{
            width: 296, flexShrink: 0,
            background: '#111318',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <RightPanel clinicId={clinicId} />
          </aside>
        </div>
      </div>

      <DragOverlay>
        {activeId ? <DragOverlayContent activeId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}