'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuilderStore } from '../hooks/useBuilderState';
import { TEMPLATE_PRESETS } from '../utils/templatePresets';
import { websiteApi } from '@/lib/api/websiteApi';
import toast from 'react-hot-toast';

interface Props { clinicId: string; onClose: () => void; }

const STEPS = [
  'Analyzing clinic information…',
  'Generating hero content…',
  'Writing about section…',
  'Creating service descriptions…',
  'Generating doctor bios…',
  'Building testimonials…',
  'Finalizing pages…',
];

const TONES = ['professional', 'friendly', 'modern', 'traditional'] as const;
const SPECIALTIES = [
  ['general',      'General Medicine'],
  ['dentistry',    'General Dentistry'],
  ['pediatric',    'Pediatrics'],
  ['orthodontics', 'Orthodontics'],
  ['dermatology',  'Dermatology'],
  ['aesthetics',   'Aesthetic / Cosmetic'],
  ['multi',        'Multi-Specialty'],
  ['telemedicine', 'Telemedicine / Online'],
] as const;

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoClose    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoSparkles = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>;
const IcoCheck    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoCheckSm  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoSpinner  = ({ color = '#a78bfa' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
    style={{ animation:'spin .7s linear infinite', display:'block' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const font = "'DM Sans','Segoe UI',system-ui,sans-serif";

export function AIGenerateModal({ clinicId, onClose }: Props) {
  const { loadFromApi, pushHistory } = useBuilderStore();
  const [template,   setTemplate]   = useState('modern-dental');
  const [tone,       setTone]       = useState('professional');
  const [specialty,  setSpecialty]  = useState('general');
  const [clinicInfo, setClinicInfo] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [step,       setStep]       = useState(0);
  const [done,       setDone]       = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setStep(0);
    const interval = setInterval(() => setStep(p => Math.min(p + 1, STEPS.length - 1)), 900);
    try {
      const data = await websiteApi.generateAI({ template, tone, specialty, clinicInfo });
      clearInterval(interval);
      pushHistory();
      loadFromApi({
        pages:          data.pages          || [],
        globalSettings: data.globalSettings || {},
        theme:          data.theme          || {},
        seo:            data.seo            || {},
      });
      setDone(true);
      toast.success('Website generated with AI!');
      setTimeout(onClose, 1600);
    } catch (err: any) {
      clearInterval(interval);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Generation failed. Please try again.';
      toast.error(msg);
      setLoading(false);
    }
  };

  const lbl: React.CSSProperties = {
    display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:8, letterSpacing:'0.01em',
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)',
      padding:'1rem',
      fontFamily: font,
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse-ring{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.15);opacity:.2}}`}</style>

      <motion.div
        initial={{ opacity:0, scale:.96, y:16 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:.96, y:16 }}
        transition={{ type:'spring', stiffness:400, damping:30 }}
        style={{
          background:'#fff', borderRadius:20,
          boxShadow:'0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          width:'100%', maxWidth:520, overflow:'hidden',
          maxHeight:'90svh', display:'flex', flexDirection:'column',
        }}
      >
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'18px 24px',
          background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background:'rgba(255,255,255,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'1px solid rgba(255,255,255,0.2)',
            }}>
              <IcoSparkles />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.2 }}>AI Website Generator</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:1 }}>Powered by Claude</div>
            </div>
          </div>
          {!loading && (
            <button onClick={onClose} style={{
              background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:8, padding:6, cursor:'pointer', color:'rgba(255,255,255,0.8)',
              display:'flex', alignItems:'center', transition:'all .15s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
              <IcoClose />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {!loading && !done ? (
            <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:20 }}>
              <p style={{ margin:0, fontSize:13, color:'#6b7280', lineHeight:1.65 }}>
                Generate a complete, professional clinic website based on your preferences. You can customize everything after generation.
              </p>

              {/* Style */}
              <div>
                <label style={lbl}>Clinic Style</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {TEMPLATE_PRESETS.map(p => (
                    <button key={p.id} onClick={() => setTemplate(p.id)} style={{
                      textAlign:'left', padding:'10px 12px', borderRadius:10, cursor:'pointer',
                      border: template === p.id ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                      background: template === p.id ? '#eef2ff' : '#fafafa',
                      transition:'all .15s', fontFamily:font,
                    }}>
                      <div style={{ fontSize:12, fontWeight:600, color: template === p.id ? '#4338ca' : '#374151' }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'#9ca3af', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label style={lbl}>Communication Tone</label>
                <div style={{ display:'flex', gap:6 }}>
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)} style={{
                      flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer',
                      border: tone === t ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                      background: tone === t ? '#eef2ff' : 'transparent',
                      fontSize:11, fontWeight:600, color: tone === t ? '#4338ca' : '#6b7280',
                      textTransform:'capitalize', transition:'all .15s', fontFamily:font,
                    }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label style={lbl}>Medical Specialty</label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={{
                  width:'100%', padding:'9px 12px', borderRadius:10,
                  border:'1.5px solid #e5e7eb', fontSize:13, color:'#111827',
                  background:'#fff', outline:'none', fontFamily:font, cursor:'pointer',
                }}>
                  {SPECIALTIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {/* Clinic info */}
              <div>
                <label style={lbl}>About Your Clinic <span style={{ fontWeight:400, color:'#9ca3af' }}>(optional)</span></label>
                <textarea
                  value={clinicInfo}
                  onChange={e => setClinicInfo(e.target.value)}
                  placeholder="e.g. We are a family-run dental clinic in Kathmandu with 3 branches. We specialise in painless treatments and have been operating since 2010…"
                  rows={3}
                  style={{
                    width:'100%', padding:'10px 12px', borderRadius:10,
                    border:'1.5px solid #e5e7eb', fontSize:13, color:'#111827',
                    resize:'vertical', outline:'none', fontFamily:font,
                    boxSizing:'border-box', lineHeight:1.6,
                  }}
                  onFocus={e=>e.currentTarget.style.borderColor='#4f46e5'}
                  onBlur={e=>e.currentTarget.style.borderColor='#e5e7eb'}
                />
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={onClose} style={{
                  flex:1, padding:'11px', borderRadius:10, cursor:'pointer',
                  border:'1.5px solid #e5e7eb', background:'#fff',
                  fontSize:13, fontWeight:600, color:'#374151', fontFamily:font,
                  transition:'all .15s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  Cancel
                </button>
                <button onClick={handleGenerate} style={{
                  flex:2, padding:'11px', borderRadius:10, cursor:'pointer', border:'none',
                  background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  fontSize:13, fontWeight:700, color:'#fff', fontFamily:font,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  transition:'opacity .15s',
                  boxShadow:'0 4px 12px rgba(79,70,229,0.35)',
                }}
                  onMouseEnter={e=>e.currentTarget.style.opacity='.88'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  <IcoSparkles /> Generate Website
                </button>
              </div>
            </div>

          ) : done ? (
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <div style={{
                width:64, height:64, borderRadius:'50%', margin:'0 auto 16px',
                background:'#d1fae5', display:'flex', alignItems:'center', justifyContent:'center',
                border:'2px solid #6ee7b7',
              }}>
                <IcoCheck />
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:'#111827', marginBottom:6 }}>Website Generated!</div>
              <div style={{ fontSize:13, color:'#6b7280' }}>Your AI-powered website is ready to customize.</div>
            </div>

          ) : (
            <div style={{ padding:'40px 24px' }}>
              {/* Pulsing icon */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:28, position:'relative' }}>
                <div style={{
                  width:60, height:60, borderRadius:'50%', position:'relative',
                  background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <IcoSparkles />
                  <div style={{
                    position:'absolute', inset:-6, borderRadius:'50%',
                    border:'2px solid rgba(124,58,237,0.4)',
                    animation:'pulse-ring 2s ease-in-out infinite',
                  }}/>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {STEPS.map((s, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    opacity: i <= step ? 1 : 0.3,
                    transition:'opacity .3s',
                    padding:'4px 0',
                  }}>
                    <div style={{ flexShrink:0, width:22, display:'flex', justifyContent:'center' }}>
                      {i < step  ? <IcoCheckSm /> :
                       i === step ? <IcoSpinner /> :
                       <div style={{ width:8, height:8, borderRadius:'50%', background:'#d1d5db' }}/>}
                    </div>
                    <span style={{
                      fontSize:13, fontWeight: i === step ? 600 : 400,
                      color: i === step ? '#4f46e5' : '#374151',
                      transition:'all .2s',
                    }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}