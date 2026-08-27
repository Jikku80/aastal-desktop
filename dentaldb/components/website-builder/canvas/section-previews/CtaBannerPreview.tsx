'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import type { PreviewProps } from './types';

export function CtaBannerPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'horizontal';
  const p = theme.primaryColor; const a = theme.accentColor;

  if (variant === 'horizontal' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:s.background||p}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
          <div>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading}}>{s.title||'Ready to Book?'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',marginTop:4}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'12px 28px',background:'#fff',color:p,fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'centered') {
    return (
      <div style={{...css,...padding,background:s.background||`linear-gradient(135deg,${p},${theme.secondaryColor})`}}>
        <div style={{textAlign:'center',maxWidth:700,margin:'0 auto',padding:'0 32px'}}>
          <h2 style={{fontSize:'2rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading,marginBottom:12}}>{s.title||'Take the Next Step'}</h2>
          {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',marginBottom:28,fontSize:16}}>{s.subtitle}</p>}
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            {s.ctaText && <button style={{padding:'13px 32px',background:'#fff',color:p,fontWeight:700,borderRadius:10,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
            {s.secondaryCtaText && <button style={{padding:'13px 32px',background:'transparent',color:'#fff',fontWeight:600,borderRadius:10,border:'2px solid rgba(255,255,255,0.6)',cursor:'pointer'}}>{s.secondaryCtaText}</button>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
          <div>
            <h2 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading}}>{s.title||'Book Your Appointment'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.6)',marginTop:6}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'13px 32px',background:p,color:'#fff',fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',boxShadow:`0 6px 20px ${p}50`,flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div style={{...css,...padding,background:'#ef4444'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
          <span style={{fontSize:32,flexShrink:0}}>🚨</span>
          <div style={{flex:1}}>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff'}}>{s.title||'Emergency? Call Now'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.85)',fontSize:14}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'14px 32px',background:'#fff',color:'#ef4444',fontWeight:800,borderRadius:10,border:'none',cursor:'pointer',fontSize:16,flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'whatsapp') {
    return (
      <div style={{...css,...padding,background:'#dcfce7'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <div style={{flex:1}}>
            <h3 style={{fontWeight:700,color:'#166534',fontSize:16}}>{s.title||'Chat with us on WhatsApp'}</h3>
            {s.subtitle && <p style={{fontSize:13,color:'#16a34a'}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'12px 28px',background:'#25D366',color:'#fff',fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'gradient-card') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 32px'}}>
          <div style={{background:`linear-gradient(135deg,${p},${a||theme.secondaryColor})`,borderRadius:24,padding:'40px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24,boxShadow:`0 20px 60px ${p}30`}}>
            <div>
              <h2 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading,marginBottom:8}}>{s.title||'Ready to Get Started?'}</h2>
              {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',maxWidth:400}}>{s.subtitle}</p>}
            </div>
            {s.ctaText && <button style={{padding:'13px 32px',background:'#fff',color:p,fontWeight:700,borderRadius:12,border:'none',cursor:'pointer',flexShrink:0}}>{s.ctaText}</button>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{...css,...padding,background:'white',borderTop:`1px solid ${p}20`,borderBottom:`1px solid ${p}20`}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <h3 style={{fontWeight:700,color:theme.textColor,fontSize:18}}>{s.title||'Book an Appointment Today'}</h3>
            {s.subtitle && <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'11px 28px',background:'transparent',color:p,fontWeight:700,borderRadius:8,border:`2px solid ${p}`,cursor:'pointer'}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'split-color') {
    return (
      <div style={{...css,display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:160}}>
        <div style={{background:p,padding:'40px 48px',display:'flex',alignItems:'center'}}>
          <div>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading}}>{s.title||'Book Appointment'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',marginTop:6,fontSize:14}}>{s.subtitle}</p>}
          </div>
        </div>
        <div style={{background:`${p}12`,padding:'40px 48px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {s.ctaText && <button style={{padding:'14px 36px',background:p,color:'#fff',fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',fontSize:16,boxShadow:`0 6px 20px ${p}40`}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  // download-brochure
  if (variant === 'download-brochure') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <div style={{background:'white',borderRadius:20,padding:'32px 40px',display:'flex',alignItems:'center',gap:32,boxShadow:'0 4px 24px rgba(0,0,0,0.08)',border:`1px solid ${p}15`,flexWrap:'wrap'}}>
            <div style={{width:64,height:64,borderRadius:16,background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:28}}>📋</span>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <h3 style={{fontWeight:700,color:theme.textColor,fontSize:18,marginBottom:6}}>{s.title||'Download Our Services Brochure'}</h3>
              <p style={{color:'#6b7280',fontSize:14}}>{s.subtitle||'Get a complete overview of our services, doctors, and packages.'}</p>
            </div>
            <button style={{padding:'13px 28px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:8}}>
              ↓ {s.ctaText||'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // insurance-verify
  if (variant === 'insurance-verify') {
    return (
      <div style={{...css,...padding,background:'#eff6ff'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:32,alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <Shield size={20} color={p}/><span style={{fontSize:13,fontWeight:700,color:p}}>Insurance Verification</span>
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.6rem',fontWeight:700,color:theme.textColor,marginBottom:8}}>{s.title||'Check Your Insurance Coverage'}</h2>
              <p style={{color:'#6b7280',fontSize:14}}>{s.subtitle||'We accept most major insurance plans. Verify coverage in seconds.'}</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}>
                {['Aetna','Blue Cross','Cigna','UnitedHealth'].map(ins=><span key={ins} style={{padding:'4px 12px',borderRadius:999,background:'white',border:`1px solid ${p}25`,fontSize:12,color:theme.textColor,fontWeight:600}}>{ins}</span>)}
                <span style={{padding:'4px 12px',borderRadius:999,background:'white',border:'1px solid #e5e7eb',fontSize:12,color:'#9ca3af'}}>+more</span>
              </div>
            </div>
            <button style={{padding:'13px 28px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>{s.ctaText||'Verify Coverage'}</button>
          </div>
        </div>
      </div>
    );
  }

  // health-checkup
  if (variant === 'health-checkup') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p},${theme.secondaryColor})`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                {['Basic','Premium','Executive','Comprehensive'].map((pkg,i)=>(
                  <span key={pkg} style={{padding:'4px 12px',borderRadius:999,background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:12,fontWeight:600}}>{pkg}</span>
                ))}
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:10}}>{s.title||'Book a Health Checkup'}</h2>
              <p style={{color:'rgba(255,255,255,0.8)',fontSize:15,marginBottom:24}}>{s.subtitle||'Comprehensive health screenings starting at affordable prices.'}</p>
              <button style={{padding:'13px 32px',borderRadius:10,background:'#fff',color:p,fontWeight:700,border:'none',cursor:'pointer'}}>{s.ctaText||'View Packages'}</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[['🩸','Blood Tests'],['❤️','Cardiac Check'],['👁️','Eye Exam'],['🦷','Dental Screen']].map(([ic,lb])=>(
                <div key={lb} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:14,padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:28,marginBottom:8}}>{ic}</div>
                  <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{lb}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:s.background||p}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
        <div>
          <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff'}}>{s.title}</h2>
          {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)'}}>{s.subtitle}</p>}
        </div>
        {s.ctaText && <button style={{padding:'12px 28px',background:'#fff',color:p,fontWeight:700,borderRadius:10,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
      </div>
    </div>
  );
}
