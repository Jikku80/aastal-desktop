'use client';

import React, { useCallback } from 'react';
import { useBuilderStore } from '../hooks/useBuilderState';
import type { SeoConfig } from '../hooks/useBuilderState';
import { SectionEditor } from './SectionEditor';
import { GlobalSettingsEditor } from './GlobalSettingsEditor';
import { ThemeEditor } from './ThemeEditor';
import { SeoEditor } from './SeoEditor';
import { DomainSettings } from './DomainSettings';
import { tokens } from './design-tokens';

interface Props { clinicId: string; }
type Panel = 'section' | 'global' | 'theme' | 'seo' | 'domain';

const IcoSettings = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IcoPalette  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
const IcoSearch   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoGlobe    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;

const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

export function RightPanel({ clinicId }: Props) {
  const rightPanel        = useBuilderStore(s => s.rightPanel);
  const setRightPanel     = useBuilderStore(s => s.setRightPanel);
  const selectedSectionId = useBuilderStore(s => s.selectedSectionId);
  const setSelectedSection = useBuilderStore(s => s.setSelectedSection);
  const seo               = useBuilderStore(s => s.seo ?? {});
  const setSeo            = useBuilderStore(s => s.setSeo);

  // Clicking a top-level tab clears any selected section first,
  // otherwise the selectedSectionId ternary blocks the panel from showing.
  const handleTabClick = useCallback((id: Panel) => {
    if (selectedSectionId) setSelectedSection(null);
    setRightPanel(id);
  }, [selectedSectionId, setSelectedSection, setRightPanel]);

  const handleSeoChange = useCallback(
    (updated: SeoConfig) => setSeo(updated),
    [setSeo]
  );

  const tabs: { id: Panel; label: string; Icon: () => JSX.Element }[] = [
    { id: 'global', label: 'Settings', Icon: IcoSettings },
    { id: 'theme',  label: 'Theme',    Icon: IcoPalette },
    { id: 'seo',    label: 'SEO',      Icon: IcoSearch },
    { id: 'domain', label: 'Domain',   Icon: IcoGlobe },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:font }}>
      {/* Tab bar — always visible so users can escape the section editor */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        padding: '8px 8px 0',
        gap: 3,
      }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = !selectedSectionId && rightPanel === id;
          return (
            <button key={id} onClick={() => handleTabClick(id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 4px 11px', border: 'none', cursor: 'pointer', borderRadius: '7px 7px 0 0',
              minHeight: 44,
              background: active ? tokens.accentLight : 'transparent',
              color: active ? '#818cf8' : tokens.muted,
              fontSize: tokens.fontSize.label, fontWeight: active ? 600 : 500,
              borderBottom: active ? `2px solid ${tokens.accent}` : '2px solid transparent',
              transition: 'all .15s', fontFamily: tokens.font,
              letterSpacing: '0.02em',
            }}
              onMouseEnter={e => { if(!active) { e.currentTarget.style.color=tokens.label; e.currentTarget.style.background=tokens.surfaceHover; } }}
              onMouseLeave={e => { if(!active) { e.currentTarget.style.color=tokens.muted; e.currentTarget.style.background='transparent'; } }}>
              <Icon />
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:'auto' }} className="builder-scrollbar">
        {selectedSectionId
          ? <SectionEditor clinicId={clinicId} />
          : rightPanel === 'global' ? <GlobalSettingsEditor />
          : rightPanel === 'theme'  ? <ThemeEditor />
          : rightPanel === 'seo'    ? <SeoEditor seo={seo ?? {}} onChange={handleSeoChange} />
          : rightPanel === 'domain' ? <DomainSettings clinicId={clinicId} />
          : null}
      </div>
    </div>
  );
}