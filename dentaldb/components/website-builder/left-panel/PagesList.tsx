'use client';

import React, { useState } from 'react';
import { Home, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBuilderStore, type PageConfig } from '../hooks/useBuilderState';
import { motion, AnimatePresence } from 'framer-motion';

const dk = {
  bg:       '#111318',
  surface:  'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.08)',
  text:     '#e2e4ef',
  muted:    '#6b7080',
  label:    '#8b8fa8',
  accent:   '#6366f1',
  font:     "'Inter','Geist','Segoe UI',system-ui,sans-serif",
};

const inputSt: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)',
  border: `1px solid ${dk.border}`, borderRadius: 7,
  padding: '8px 12px', fontSize: 13, color: dk.text,
  fontFamily: dk.font, outline: 'none', boxSizing: 'border-box',
};

// ── Sortable page row ─────────────────────────────────────────────────────────

function PageRow({ page, isSelected, onSelect, onDelete, onToggle }: {
  page: PageConfig;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `page:${page.id}` });
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', cursor: 'pointer', borderRadius: 8, margin: '0 8px 2px',
    background: isSelected ? 'rgba(99,102,241,0.12)' : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
    border: isSelected ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
    fontFamily: dk.font,
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Drag handle */}
      <button {...attributes} {...listeners} onClick={e => e.stopPropagation()}
        style={{ background: 'none', border: 'none', cursor: 'grab', color: dk.muted, flexShrink: 0, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', padding: 0 }}>
        <GripVertical size={14} />
      </button>

      {/* Home/page icon */}
      <span style={{ color: isSelected ? '#818cf8' : dk.muted, flexShrink: 0, display: 'flex' }}>
        {page.isHome ? <Home size={14} /> : <ChevronRight size={14} />}
      </span>

      {/* Title + slug */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? '#818cf8' : dk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {page.title}
        </div>
        <div style={{ fontSize: 11, color: dk.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          /{page.slug}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onToggle(); }} title={page.enabled ? 'Hide page' : 'Show page'}
          style={{ padding: 4, color: dk.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: 4 }}>
          {page.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        {!page.isHome && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete page"
            style={{ padding: 4, color: dk.muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: 4 }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Page Modal ────────────────────────────────────────────────────────────

function AddPageModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, slug: string) => void }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug]   = useState('');

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), slug || title.toLowerCase().replace(/\s+/g, '-'));
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#1a1c23', borderRadius: 14, boxShadow: '0 25px 60px rgba(0,0,0,0.5)', padding: 24, width: '100%', maxWidth: 360, margin: '0 16px', border: `1px solid ${dk.border}`, fontFamily: dk.font }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: dk.text, marginBottom: 20, margin: '0 0 20px 0' }}>Add New Page</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dk.muted, marginBottom: 6 }}>Page Title</label>
            <input autoFocus value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g. Services" style={inputSt} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dk.muted, marginBottom: 6 }}>URL Slug</label>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${dk.border}`, borderRadius: 7, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
              <span style={{ padding: '8px 12px', color: dk.muted, fontSize: 13, borderRight: `1px solid ${dk.border}`, background: 'rgba(255,255,255,0.03)' }}>/</span>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="services"
                style={{ flex: 1, padding: '8px 12px', fontSize: 13, color: dk.text, background: 'transparent', border: 'none', outline: 'none', fontFamily: dk.font }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, border: `1px solid ${dk.border}`, borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 500, color: dk.muted, background: 'transparent', cursor: 'pointer', fontFamily: dk.font }}>
              Cancel
            </button>
            <button type="submit" disabled={!title.trim()}
              style={{ flex: 1, background: dk.accent, color: 'white', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: dk.font, opacity: title.trim() ? 1 : 0.5 }}>
              Add Page
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Pages List ────────────────────────────────────────────────────────────────

export function PagesList() {
  const { pages, selectedPageId, setSelectedPage, addPage, deletePage, updatePage } =
    useBuilderStore();
  const [showModal, setShowModal] = useState(false);

  const handleAdd = (title: string, slug: string) => {
    addPage({ slug, title, enabled: true, isHome: false, sections: [] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: dk.font }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${dk.border}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: dk.label, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Pages ({pages.length})
        </span>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: dk.font }}
        >
          <Plus size={12} />
          Add Page
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} className="builder-scrollbar">
        <SortableContext items={pages.map(p => `page:${p.id}`)} strategy={verticalListSortingStrategy}>
          {pages.map(page => (
            <PageRow
              key={page.id}
              page={page}
              isSelected={selectedPageId === page.id}
              onSelect={() => setSelectedPage(page.id)}
              onDelete={() => {
                if (confirm(`Delete page "${page.title}"?`)) deletePage(page.id);
              }}
              onToggle={() => updatePage(page.id, { enabled: !page.enabled })}
            />
          ))}
        </SortableContext>
      </div>

      <AnimatePresence>
        {showModal && (
          <AddPageModal onClose={() => setShowModal(false)} onAdd={handleAdd} />
        )}
      </AnimatePresence>
    </div>
  );
}