'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { tokens } from '../design-tokens';

// ── EditorListItem ────────────────────────────────────────────────────────────
// Reusable accordion row for nested repeatable lists (footer columns/links,
// nav links, FAQ items, team members, testimonials, gallery images, services,
// etc). Collapses to a one-line summary and expands to edit, with an optional
// breadcrumb header so users never lose track of nesting depth.
export function EditorListItem({
  summary, breadcrumb, onRemove, children, defaultOpen = false,
}: {
  /** One-line collapsed summary, e.g. "Column: Quick Links (3 links)" */
  summary:     React.ReactNode;
  /** Breadcrumb trail shown when expanded, e.g. ['Footer', 'Quick Links', 'Edit link'] */
  breadcrumb?: string[];
  onRemove:    () => void;
  children:    React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      border: `1px solid ${tokens.border}`, borderRadius: tokens.radius.md,
      background: tokens.surfaceDeep, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            color: tokens.text, fontFamily: tokens.font, padding: 0,
          }}
        >
          <span style={{ color: tokens.muted, flexShrink: 0, display: 'flex' }}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          <span style={{
            fontSize: tokens.fontSize.sm, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {summary}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
            color: tokens.muted, padding: 3, borderRadius: 5, transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = tokens.danger}
          onMouseLeave={e => e.currentTarget.style.color = tokens.muted}
        >
          <Trash2 size={13} />
        </button>
      </div>
      {open && (
        <div style={{ padding: '0 10px 10px 10px' }}>
          {breadcrumb && breadcrumb.length > 0 && (
            <div style={{
              fontSize: tokens.fontSize.xs, color: tokens.muted, marginBottom: 8,
              fontFamily: tokens.font,
            }}>
              {breadcrumb.join(' \u203a ')}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
