'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useBuilderStore } from '../hooks/useBuilderState';
import { getSectionMeta } from '../utils/sectionMeta';

const dk = {
  text:   '#e2e4ef',
  muted:  '#6b7080',
  label:  '#8b8fa8',
  border: 'rgba(255,255,255,0.06)',
  font:   "'Inter','Geist','Segoe UI',system-ui,sans-serif",
};

export function LayersPanel() {
  const { pages, selectedPageId, selectedSectionId, setSelectedPage, setSelectedSection, updateSection, updatePage } =
    useBuilderStore();
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set([selectedPageId || '']));

  const togglePage = (id: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ padding: 8, fontFamily: dk.font, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }} className="builder-scrollbar">
      <div style={{ fontSize: 10, fontWeight: 700, color: dk.label, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px 8px', marginBottom: 2 }}>
        Page Structure
      </div>

      {pages.map(page => {
        const isPageActive = selectedPageId === page.id && !selectedSectionId;
        return (
          <div key={page.id} style={{ marginBottom: 2 }}>
            {/* Page row */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                borderRadius: 8, cursor: 'pointer',
                background: isPageActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: isPageActive ? '#818cf8' : dk.text,
              }}
              onClick={() => { setSelectedPage(page.id); setSelectedSection(null); }}
            >
              <button
                onClick={e => { e.stopPropagation(); togglePage(page.id); }}
                style={{ color: dk.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, display: 'flex' }}
              >
                {expandedPages.has(page.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</span>
              <span style={{ fontSize: 10, color: dk.muted }}>{page.sections.length}</span>
              <button
                onClick={e => { e.stopPropagation(); updatePage(page.id, { enabled: !page.enabled }); }}
                style={{ color: dk.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                {page.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </div>

            {/* Sections */}
            {expandedPages.has(page.id) && (
              <div style={{ marginLeft: 20, borderLeft: `1px solid ${dk.border}`, paddingLeft: 8, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {page.sections.map(section => {
                  const meta = getSectionMeta(section.type);
                  const isActive = selectedSectionId === section.id;
                  return (
                    <div
                      key={section.id}
                      onClick={() => { setSelectedPage(page.id); setSelectedSection(section.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                        borderRadius: 6, cursor: 'pointer',
                        background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                        color: isActive ? '#818cf8' : dk.muted,
                      }}
                      className="group"
                    >
                      <GripVertical size={11} style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</span>
                      <button
                        onClick={e => { e.stopPropagation(); updateSection(page.id, section.id, { visible: !section.visible }); }}
                        style={{ color: dk.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        {section.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                      </button>
                    </div>
                  );
                })}
                {page.sections.length === 0 && (
                  <div style={{ fontSize: 10, color: dk.muted, padding: '6px 8px', fontStyle: 'italic' }}>No sections yet</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}