'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useBuilderStore } from '../hooks/useBuilderState';
import { AIGenerateModal } from './AIGenerateModal';
import { websiteApi } from '@/lib/api/websiteApi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Icon = {
  chevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  undo: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  ),
  redo: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
    </svg>
  ),
  monitor: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  tablet: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/>
    </svg>
  ),
  smartphone: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/>
    </svg>
  ),
  eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  sparkle: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>
    </svg>
  ),
  globe: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  checkCircle: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  externalLink: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  loader: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'builder-spin 0.7s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
};

interface Props {
  clinicId:  string;
  subdomain: string;
  onSave:    (snap: any) => Promise<void>;
}

export function BuilderToolbar({ clinicId, subdomain, onSave }: Props) {
  const {
    pages, undo, redo, canUndo, canRedo,
    previewDevice, setPreviewDevice,
    saveStatus, setSaveStatus,
    isPublished, setIsPublished,
    getSnapshot,
  } = useBuilderStore();

  const [showAI, setShowAI] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const siteName = pages.find(p => p.isHome)?.title || 'My Clinic Site';

  const handleManualSave = async () => {
    setSaveStatus('saving');
    try {
      await onSave(getSnapshot());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      toast.error('Save failed: ' + (err?.message || 'Unknown error'));
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      setSaveStatus('saving');
      await onSave(getSnapshot());
      setSaveStatus('saved');
      await websiteApi.publish();
      setIsPublished(true);
      toast.success('Website published successfully.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('idle');
      toast.error('Publish failed: ' + (err?.message || 'Please try again'));
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await websiteApi.unpublish();
      setIsPublished(false);
      toast.success('Website unpublished.');
    } catch (err: any) {
      toast.error('Unpublish failed: ' + (err?.message || 'Please try again'));
    } finally {
      setPublishing(false);
    }
  };

  const handlePreview = () => {
    if (subdomain) {
      const previewUrl = `${window.location.origin}/site/${subdomain}/preview`;
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast('No subdomain configured. Set one in Domain Settings (right panel).');
    }
  };

  const devices = [
    { id: 'desktop' as const, Icon: Icon.monitor,    label: 'Desktop' },
    { id: 'tablet'  as const, Icon: Icon.tablet,     label: 'Tablet' },
    { id: 'mobile'  as const, Icon: Icon.smartphone, label: 'Mobile' },
  ];

  const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 6, border: 'none',
    background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: font,
  };

  const divider: React.CSSProperties = {
    width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px',
  };

  return (
    <>
      <style>{`@keyframes builder-spin { to { transform: rotate(360deg); } }`}</style>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 48, paddingInline: 16, flexShrink: 0, zIndex: 40,
        background: '#0a0b0f',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontFamily: font,
        gap: 8,
        backdropFilter: 'blur(10px)',
      }}>

        {/* ── Left ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto', minWidth: 0 }}>
          <Link href="/dashboard/profile" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: '#5a5f72', textDecoration: 'none', fontSize: 12, fontWeight: 500,
            padding: '4px 8px', borderRadius: 6, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c9ccd8'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5a5f72'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <Icon.chevronLeft />
            Back
          </Link>

          <div style={divider} />

          {/* Logo mark */}
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 0 10px rgba(99,102,241,0.3)',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 4a5 5 0 0 1 0 10A5 5 0 0 1 12 7z" opacity="0.4"/>
              <path d="M8 12a4 4 0 0 0 8 0"/>
            </svg>
          </div>

          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e4ef', letterSpacing: '-0.01em', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {siteName}
          </span>

          {subdomain && (
            <span style={{
              fontSize: 10.5, color: '#3a3f52', paddingLeft: 2,
              fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
            }}>
              .{subdomain}
            </span>
          )}
        </div>

        {/* ── Center ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
          {/* Undo / Redo */}
          {[
            { fn: undo, can: canUndo, Ico: Icon.undo,  title: 'Undo (Ctrl+Z)' },
            { fn: redo, can: canRedo, Ico: Icon.redo,  title: 'Redo (Ctrl+Shift+Z)' },
          ].map(({ fn, can, Ico, title }) => (
            <button key={title} onClick={fn} disabled={!can()} title={title}
              style={{ ...iconBtn, color: can() ? '#8b8fa8' : '#2e3040', cursor: can() ? 'pointer' : 'not-allowed' }}
              onMouseEnter={e => { if (can()) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#c9ccd8'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = can() ? '#8b8fa8' : '#2e3040'; }}>
              <Ico />
            </button>
          ))}

          <div style={divider} />

          {/* Device toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 7, padding: '2px', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {devices.map(({ id, Icon: DevIcon, label }) => (
              <button key={id} onClick={() => setPreviewDevice(id)} title={label}
                style={{
                  ...iconBtn, width: 27, height: 25, borderRadius: 5,
                  background: previewDevice === id ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: previewDevice === id ? '#818cf8' : '#4b5060',
                  border: previewDevice === id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                <DevIcon />
              </button>
            ))}
          </div>
        </div>

        {/* ── Right ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          <SaveIndicator status={saveStatus} onRetry={handleManualSave} />

          {/* AI Generate */}
          <button
            onClick={() => setShowAI(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 7,
              border: '1px solid rgba(139,92,246,0.25)',
              background: 'rgba(139,92,246,0.1)',
              color: '#a78bfa', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: font, transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.18)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)'; }}>
            <Icon.sparkle /> AI Generate
          </button>

          {/* Preview */}
          <button
            onClick={handlePreview}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#7a7f94', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: font, transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#c9ccd8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = '#7a7f94'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
            <Icon.eye /> Preview <Icon.externalLink />
          </button>

          <div style={divider} />

          {/* Publish */}
          <button
            onClick={isPublished ? handleUnpublish : handlePublish}
            disabled={publishing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 7,
              border: isPublished ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.4)',
              background: isPublished ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%)',
              color: isPublished ? '#4ade80' : '#818cf8',
              fontSize: 12, fontWeight: 600,
              cursor: publishing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', fontFamily: font,
              opacity: publishing ? 0.6 : 1,
              boxShadow: !isPublished ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { if (!publishing) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = publishing ? '0.6' : '1'}>
            {publishing
              ? <><Icon.loader />{isPublished ? 'Unpublishing…' : 'Publishing…'}</>
              : isPublished
                ? <><Icon.checkCircle /> Published</>
                : <><Icon.globe /> Publish</>}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showAI && <AIGenerateModal clinicId={clinicId} onClose={() => setShowAI(false)} />}
      </AnimatePresence>
    </>
  );
}

function SaveIndicator({ status, onRetry }: { status: string; onRetry: () => void }) {
  const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";
  const base: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 500, fontFamily: font,
    letterSpacing: '-0.01em',
  };
  return (
    <AnimatePresence mode="wait">
      {status === 'saving' && (
        <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ ...base, color: '#5a5f72' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: 'builder-spin 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Saving
        </motion.span>
      )}
      {status === 'saved' && (
        <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ ...base, color: '#4ade80' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Saved
        </motion.span>
      )}
      {status === 'error' && (
        <motion.button key="error" onClick={onRetry}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ ...base, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
          Save failed — retry?
        </motion.button>
      )}
    </AnimatePresence>
  );
}