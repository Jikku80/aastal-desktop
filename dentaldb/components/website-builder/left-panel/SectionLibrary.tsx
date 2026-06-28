'use client';

import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SECTION_META, type SectionMeta } from '../utils/sectionMeta';
import { SectionThumbnail } from './SectionThumbnail';

const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

function LibraryItem({ meta }: { meta: SectionMeta }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${meta.type}`,
    data: { fromLibrary: true, sectionType: meta.type },
  });
  const [hov, setHov] = useState(false);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        cursor: 'grab',
        border: `1px solid ${hov ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 8, overflow: 'hidden',
        transition: 'all 0.15s',
        background: hov ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
        opacity: isDragging ? 0.45 : 1,
        boxShadow: hov ? '0 2px 12px rgba(99,102,241,0.15)' : 'none',
      }}
      title={meta.description}
    >
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 54, overflow: 'hidden',
      }}>
        <SectionThumbnail type={meta.type} />
      </div>
      <div style={{ padding: '6px 8px 7px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#c9ccd8', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 10, color: '#4b5060', marginTop: 2, fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {meta.description}
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = ['Clinic Info', 'Booking', 'Social Proof', 'Media', 'Content', 'Layout'] as const;

export function SectionLibrary() {
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTION_META;
    const q = query.toLowerCase();
    return SECTION_META.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  }, [query]);

  const byCategory = useMemo(() => {
    const map: Record<string, SectionMeta[]> = {};
    for (const cat of CATEGORIES) {
      const items = filtered.filter(m => m.category === cat);
      if (items.length) map[cat] = items;
    }
    return map;
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: font }}>
      {/* Search */}
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4b5060" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Search sections…"
            style={{
              width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
              fontSize: 11.5, border: `1px solid ${inputFocused ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 7, background: 'rgba(0,0,0,0.3)', color: '#c9ccd8',
              fontFamily: font, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
              boxShadow: inputFocused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Drag hint */}
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(99,102,241,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
        </svg>
        <p style={{ fontSize: 10.5, color: '#5a5f9a', margin: 0, letterSpacing: '0.01em' }}>
          Drag sections onto the canvas
        </p>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }} className="builder-scrollbar">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, color: '#3a3f52',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: 8, fontFamily: font,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {cat}
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {items.map(meta => <LibraryItem key={meta.type} meta={meta} />)}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#4b5060', fontSize: 12 }}>
            No sections found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}