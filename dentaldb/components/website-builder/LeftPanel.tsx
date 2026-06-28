'use client';

import React from 'react';
import { useBuilderStore } from './hooks/useBuilderState';
import { PagesList }    from './left-panel/PagesList';
import { SectionLibrary } from './left-panel/SectionLibrary';
import { LayersPanel }  from './left-panel/LayersPanel';
import { ThemeGallery } from './left-panel/ThemeGallery';

const IcoPages  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcoAdd    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>;
const IcoLayers = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IcoThemes = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 1 7 7"/><circle cx="12" cy="12" r="3"/></svg>;

const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

export function LeftPanel({ onSave }: { onSave?: (snap: any) => Promise<void> }) {
  const { leftPanel, setLeftPanel } = useBuilderStore();

  const tabs = [
    { id: 'pages'   as const, label: 'Pages',   Icon: IcoPages },
    { id: 'library' as const, label: 'Add',     Icon: IcoAdd },
    { id: 'layers'  as const, label: 'Layers',  Icon: IcoLayers },
    { id: 'themes'  as const, label: 'Themes',  Icon: IcoThemes },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:font }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        padding: '6px 8px 0',
        gap: 2,
      }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = leftPanel === id;
          const isThemes = id === 'themes';
          return (
            <button key={id} onClick={() => setLeftPanel(id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '7px 4px 8px', border: 'none', cursor: 'pointer', borderRadius: '7px 7px 0 0',
              background: active
                ? (isThemes ? 'rgba(139,92,246,0.15)' : 'rgba(99,102,241,0.12)')
                : 'transparent',
              color: active
                ? (isThemes ? '#a78bfa' : '#818cf8')
                : '#4b5060',
              fontSize: 10.5, fontWeight: active ? 600 : 500,
              borderBottom: active
                ? `2px solid ${isThemes ? '#8b5cf6' : '#6366f1'}`
                : '2px solid transparent',
              transition: 'all .15s', fontFamily: font,
              letterSpacing: '0.02em',
              position: 'relative',
            }}
              onMouseEnter={e => { if(!active) { e.currentTarget.style.color='#8b8fa8'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; } }}
              onMouseLeave={e => { if(!active) { e.currentTarget.style.color='#4b5060'; e.currentTarget.style.background='transparent'; } }}>
              <Icon />
              {label}
              {/* New badge on Themes tab */}
              {isThemes && !active && (
                <span style={{
                  position: 'absolute', top: 4, right: 6,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#8b5cf6',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {leftPanel === 'pages'   && <PagesList />}
        {leftPanel === 'library' && <SectionLibrary />}
        {leftPanel === 'layers'  && <LayersPanel />}
        {leftPanel === 'themes'  && <ThemeGallery onSave={onSave} />}
      </div>
    </div>
  );
}