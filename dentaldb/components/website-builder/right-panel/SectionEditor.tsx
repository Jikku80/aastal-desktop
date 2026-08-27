'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '../hooks/useBuilderState';
import { getSectionMeta } from '../utils/sectionMeta';
import { SectionRenderer } from '../canvas/SectionRenderer';
import { HeroEditor } from './section-editors/HeroEditor';
import { GlobalDesignEditor } from './section-editors/GlobalDesignEditor';
import { tokens } from './design-tokens';
import {
  AboutEditor, ServicesEditor, TeamEditor, TestimonialsEditor,
  AppointmentBookingEditor, WorkingHoursEditor, ContactEditor,
  GalleryEditor, FaqEditor, StatsEditor, CtaBannerEditor,
  RichTextEditor, MapEditor, BranchesEditor, VideoEditor,
  GenericSectionEditor,
  ProductsEditor,
  AiChatbotEditor,
  WhatsAppButtonEditor,
  BlogEditor,
  ClinicInfoEditor,
  SocialProofEditor,
  AvailableSlotsEditor,
  DividerEditor,
  SpacerEditor,
} from './section-editors';
import { websiteApi } from '@/lib/api/websiteApi';
import toast from 'react-hot-toast';

const IcoClose    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoSparkles = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>;
const IcoSpin     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{animation:'builder-spin .7s linear infinite',display:'block'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

/**
 * Live thumbnail of the currently-selected section, shown at the top of the
 * panel so the person has a visual anchor confirming which section they're
 * editing before scrolling through the form below it. Renders the *real*
 * SectionRenderer at full size and scales it down, rather than a generic
 * schematic icon, so it reflects the section's actual current content.
 */
const THUMBNAIL_SOURCE_WIDTH = 1200;
const THUMBNAIL_HEIGHT = 92;

function SectionLiveThumbnail({ section }: { section: any }) {
  return (
    <div style={{
      height: THUMBNAIL_HEIGHT, overflow: 'hidden', position: 'relative',
      background: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      {/* Scale factor is resolved at runtime via CSS custom property + container query
          width isn't available here, so we use a ResizeObserver-free trick:
          render at a fixed known width and let the wrapper below scale it with
          a percentage-based transform computed from its own clientWidth. */}
      <ScaledSection section={section} />
      {/* Fade so a tall section doesn't look abruptly clipped */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 20,
        background: 'linear-gradient(rgba(255,255,255,0), rgba(255,255,255,0.9))',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function ScaledSection({ section }: { section: any }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.22);

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => setScale(el.clientWidth / THUMBNAIL_SOURCE_WIDTH);
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <div style={{
        width: THUMBNAIL_SOURCE_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left',
      }}>
        <SectionRenderer section={section} />
      </div>
    </div>
  );
}

const EditorMap: Record<string, React.ComponentType<any>> = {
  hero:                  HeroEditor,
  about:                 AboutEditor,
  services:              ServicesEditor,
  team:                  TeamEditor,
  testimonials:          TestimonialsEditor,
  'appointment-booking': AppointmentBookingEditor,
  'working-hours':       WorkingHoursEditor,
  contact:               ContactEditor,
  gallery:               GalleryEditor,
  faq:                   FaqEditor,
  stats:                 StatsEditor,
  'cta-banner':          CtaBannerEditor,
  'rich-text':           RichTextEditor,
  map:                   MapEditor,
  branches:              BranchesEditor,
  video:                 VideoEditor,
  products:              ProductsEditor,
  'ai-chatbot':          AiChatbotEditor,
  'whatsapp-button':     WhatsAppButtonEditor,
  'blog-articles':       BlogEditor,
  'clinic-info':         ClinicInfoEditor,
  'social-proof':        SocialProofEditor,
  'available-slots':     AvailableSlotsEditor,
  divider:               DividerEditor,
  spacer:                SpacerEditor,
};

interface SectionEditorProps { clinicId?: string; }

export function SectionEditor({ clinicId }: SectionEditorProps = {}) {
  const {
    pages, selectedPageId, selectedSectionId, setSelectedSection, updateSection,
  } = useBuilderStore();

  const [regenerating,   setRegenerating]   = useState(false);
  const [hint,           setHint]           = useState('');
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [hintFocused,    setHintFocused]    = useState(false);

  const page    = pages.find(p => p.id === selectedPageId);
  const section = page?.sections.find(s => s.id === selectedSectionId);

  if (!section || !page) {
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'100%', padding:'32px 16px', textAlign:'center', fontFamily:font,
        color:'#4b5060', gap:12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, border: '1.5px dashed rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <p style={{ margin:0, fontSize:12, color: '#5a5f72', lineHeight: 1.6, maxWidth: 180 }}>
          Click any section on the canvas to edit its content
        </p>
      </div>
    );
  }

  const meta = getSectionMeta(section.type);

  const updateSettings = (updates: Record<string, any>) => {
    updateSection(page.id, section.id, { settings: updates });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const data = await websiteApi.generateSection({
        pageId:         page.id,
        sectionId:      section.id,
        sectionType:    section.type,
        currentContent: section.settings,
        userHint:       hint,
      });
      if (data.pages) {
        const updatedSection = data.pages.find((p: any) => p.id === page.id)
          ?.sections.find((s: any) => s.id === section.id);
        if (updatedSection?.settings) {
          updateSettings(updatedSection.settings);
          toast.success('Section regenerated!');
        }
      }
    } catch {
      toast.error('Regeneration failed');
    }
    setRegenerating(false);
    setShowRegenerate(false);
    setHint('');
  };

  const EditorComponent = EditorMap[section.type] || GenericSectionEditor;

  // Sub-tabs: Content | Design
  const [activeEditorTab, setActiveEditorTab] = useState<'content' | 'design'>('content');

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:font }}>
      <style>{`@keyframes builder-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'11px 14px', flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#818cf8', fontSize: 12,
          }}>
            {meta.label.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e4ef', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{meta.label}</div>
            <div style={{ fontSize: 10.5, color: '#4b5060', marginTop: 1, letterSpacing: '0.02em' }}>{meta.category}</div>
          </div>
        </div>
        <button onClick={() => setSelectedSection(null)} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:26, height:26, borderRadius:6,
          border:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(255,255,255,0.04)', cursor:'pointer', color:'#6b7080',
          transition:'all .15s',
        }}
          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#e2e4ef'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='#6b7080'; }}>
          <IcoClose />
        </button>
      </div>

      {/* Live thumbnail — visual anchor confirming which section this is */}
      <SectionLiveThumbnail section={section} />

      {/* Content / Design tab switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.15)',
        flexShrink: 0,
      }}>
        {(['content', 'design'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveEditorTab(tab)}
            style={{
              flex: 1, padding: '11px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: activeEditorTab === tab ? '#818cf8' : '#4b5060',
              fontSize: tokens.fontSize.label, fontWeight: activeEditorTab === tab ? 600 : 500,
              fontFamily: font,
              borderBottom: activeEditorTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
              letterSpacing: '0.02em',
            }}
          >
            {tab === 'content' ? '✦ Content' : '🎨 Design'}
          </button>
        ))}
      </div>

      {/* Editor content */}
      <div style={{ flex:1, overflowY:'auto' }} className="builder-scrollbar">
        {activeEditorTab === 'content' ? (
          <EditorComponent settings={section.settings} onChange={updateSettings} clinicId={clinicId} />
        ) : (
          <GlobalDesignEditor settings={section.settings} onChange={updateSettings} sectionType={section.type} />
        )}
      </div>

      {/* AI Regenerate footer */}
      <div style={{
        borderTop:'1px solid rgba(255,255,255,0.06)', padding:'10px 12px', flexShrink:0,
        background: 'rgba(0,0,0,0.15)',
      }}>
        {!showRegenerate ? (
          <button onClick={() => setShowRegenerate(true)} style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            padding:'8px', borderRadius:8, cursor:'pointer',
            border:'1px solid rgba(139,92,246,0.2)', background:'rgba(139,92,246,0.07)',
            fontSize:11.5, fontWeight:600, color:'#a78bfa',
            transition:'all .15s', fontFamily:font, letterSpacing: '-0.01em',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(139,92,246,0.14)'; e.currentTarget.style.borderColor='rgba(139,92,246,0.35)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(139,92,246,0.07)'; e.currentTarget.style.borderColor='rgba(139,92,246,0.2)'; }}>
            <IcoSparkles /> Regenerate with AI
          </button>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <textarea
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Optional: describe what you want…"
              rows={2}
              style={{
                width:'100%', padding:'8px 10px', borderRadius:7,
                border: hintFocused ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.08)',
                fontSize:11.5, fontFamily:font,
                resize:'none', outline:'none', color:'#e2e4ef',
                boxSizing:'border-box', lineHeight:1.6,
                background: 'rgba(0,0,0,0.3)',
                transition: 'border-color 0.15s',
                boxShadow: hintFocused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
              }}
              onFocus={() => setHintFocused(true)}
              onBlur={() => setHintFocused(false)}
            />
            <div style={{ display:'flex', gap:7 }}>
              <button onClick={() => { setShowRegenerate(false); setHint(''); }} style={{
                flex:1, padding:'7px', borderRadius:7, cursor:'pointer',
                border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)',
                fontSize:11.5, fontWeight:500, color:'#8b8fa8', fontFamily:font,
                transition:'all .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                Cancel
              </button>
              <button onClick={handleRegenerate} disabled={regenerating} style={{
                flex:2, padding:'7px', borderRadius:7, cursor:'pointer', border:'none',
                background: regenerating ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6d28d9,#4f46e5)',
                fontSize:11.5, fontWeight:600, color:'#fff', fontFamily:font,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                opacity: regenerating ? 0.7 : 1, transition:'opacity .15s',
                boxShadow: regenerating ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
              }}>
                {regenerating ? <IcoSpin /> : <IcoSparkles />}
                {regenerating ? 'Generating…' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}