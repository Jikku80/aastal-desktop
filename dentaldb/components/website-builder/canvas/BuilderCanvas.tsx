'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBuilderStore } from '../hooks/useBuilderState';
import { CanvasSection } from './CanvasSection';

const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

export function BuilderCanvas() {
  const { pages, selectedPageId, setLeftPanel, previewDevice } = useBuilderStore();
  const currentPage = pages.find(p => p.id === selectedPageId);

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-zone' });

  const deviceWidth = {
    desktop: '100%',
    tablet:  '768px',
    mobile:  '390px',
  }[previewDevice];

  if (!currentPage) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', fontFamily: font, color: '#4b5060',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 6, fontSize: 13 }}>No page selected</p>
          <p style={{ fontSize: 11, color: '#3a3f52' }}>Select a page from the left panel</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', justifyContent: 'center', padding: '28px 20px', fontFamily: font }}>
      <div style={{ width: deviceWidth, maxWidth: '100%', transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column' }}>

        {/* Page header */}
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#c9ccd8', letterSpacing: '-0.01em' }}>{currentPage.title}</span>
            <span style={{
              fontSize: 11, color: '#3a3f52',
              fontFamily: "'JetBrains Mono','Fira Code',monospace",
            }}>/{currentPage.slug}</span>
          </div>
          {!currentPage.enabled && (
            <span style={{
              fontSize: 10.5, background: 'rgba(251,191,36,0.1)', color: '#fbbf24',
              padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(251,191,36,0.2)',
              fontWeight: 500,
            }}>Hidden</span>
          )}
        </div>

        {/* Canvas drop zone */}
        <div
          ref={setNodeRef}
          style={{
            flex: 1, borderRadius: 10, overflow: 'hidden',
            border: isOver
              ? '2px solid rgba(99,102,241,0.5)'
              : '1px solid rgba(255,255,255,0.07)',
            background: '#fff',
            minHeight: 600,
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: isOver
              ? '0 0 0 4px rgba(99,102,241,0.1)'
              : '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          <SortableContext
            items={currentPage.sections.map(s => `section:${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {currentPage.sections.length === 0 ? (
              <EmptyCanvas onAddSection={() => setLeftPanel('library')} />
            ) : (
              currentPage.sections.map((section, index) => (
                <CanvasSection
                  key={section.id}
                  section={section}
                  pageId={currentPage.id}
                  index={index}
                  total={currentPage.sections.length}
                />
              ))
            )}
          </SortableContext>

          {isOver && (
            <div style={{
              height: 56, margin: '0 16px 16px',
              border: '2px dashed rgba(99,102,241,0.5)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#818cf8', fontSize: 12, fontWeight: 500, fontFamily: font,
              background: 'rgba(99,102,241,0.04)',
            }}>
              Drop here to add section
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCanvas({ onAddSection }: { onAddSection: () => void }) {
  const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 32px', textAlign: 'center', fontFamily: font,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 100%)',
        border: '1.5px dashed rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>
        </svg>
      </div>
      <h3 style={{ color: '#374151', fontWeight: 700, fontSize: 16, marginBottom: 8, margin: '0 0 8px' }}>
        Start Building
      </h3>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24, maxWidth: 240, lineHeight: 1.6, margin: '0 0 24px' }}>
        Drag sections from the library or click below to browse
      </p>
      <button
        onClick={onAddSection}
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
          color: '#fff', padding: '9px 20px', borderRadius: 8, border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
          boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Browse Sections
      </button>
    </div>
  );
}