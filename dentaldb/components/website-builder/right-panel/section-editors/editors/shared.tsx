'use client';

import React from 'react';

export type Props = { settings: Record<string, any>; onChange: (u: Record<string, any>) => void; clinicId?: string };

// CRITICAL FIX: Always guard settings against undefined/null (AI-generated sections may omit settings)
export const safe = (settings: any): Record<string, any> => settings ?? {};
export const set = (onChange: Props['onChange']) => (key: string, val: any) => onChange({ [key]: val });

export const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

// Shared dark-themed remove button for array items
export const RemoveBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} style={{
    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
    color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 1, borderRadius: 4,
    transition: 'color 0.12s',
  }}
    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
  >✕</button>
);

// Shared item header row
export const ItemHeader = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
    <RemoveBtn onClick={onRemove} />
  </div>
);

export const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
);

export const PadStack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
);
