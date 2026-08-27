'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function WorkingHoursPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'table';
  const p = theme.primaryColor;
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const hours = (s.hours as Record<string,any>) || {};
  const today = new Date().toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();

  if (variant === 'table' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} theme={theme}/>
          <div style={{maxWidth:480,margin:'0 auto',background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',border:`1px solid ${p}15`}}>
            {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today&&s.showTodayHighlight;if(!slot&&!s.showClosedDays)return null;return(
              <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'12px 24px',borderBottom:'1px solid #f1f5f9',background:isT?`${p}08`:'transparent'}}>
                <span style={{fontSize:14,color:isT?p:'#374151',fontWeight:isT?700:500}}>{day}</span>
                {slot?<span style={{fontSize:14,fontWeight:600,color:isT?p:'#374151'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:13,color:'#ef4444'}}>Closed</span>}
              </div>
            );})}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
            {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today;return(
              <div key={day} style={{borderRadius:14,padding:'14px 8px',textAlign:'center',background:isT?p:'#f8faff',color:isT?'#fff':theme.textColor,boxShadow:isT?`0 6px 20px ${p}40`:'none'}}>
                <div style={{fontSize:10,fontWeight:700,opacity:isT?0.9:0.5,marginBottom:6}}>{day.slice(0,3).toUpperCase()}</div>
                {slot?(<><div style={{fontSize:11,fontWeight:700}}>{slot.open}</div><div style={{fontSize:9,opacity:0.7}}>to</div><div style={{fontSize:11,fontWeight:700}}>{slot.close}</div></>):<div style={{fontSize:10,opacity:0.5,marginTop:6}}>Closed</div>}
              </div>
            );})}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:12}}>{s.title||'Opening Hours'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.6,marginBottom:24,fontSize:14}}>We're here when you need us. Book at your convenience.</p>
              <div style={{background:p,borderRadius:16,padding:24,color:'#fff'}}>
                <div style={{fontSize:13,opacity:0.8,marginBottom:4}}>Today's Hours</div>
                <div style={{fontSize:'1.5rem',fontWeight:800}}>{hours[today]?.open||'9:00'} – {hours[today]?.close||'5:00'}</div>
                <div style={{fontSize:12,opacity:0.7,marginTop:4}}>Currently open</div>
              </div>
            </div>
            <div style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
              {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today;return(
                <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'11px 22px',borderBottom:'1px solid #f1f5f9',background:isT?`${p}05`:'transparent'}}>
                  <span style={{fontSize:13,fontWeight:isT?700:400,color:isT?p:'#374151'}}>{day}</span>
                  {slot?<span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:12,color:'#ef4444'}}>Closed</span>}
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:12}}>{s.title||'Opening Hours'}</h2>
              <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:14,padding:20,marginBottom:20}}>
                <div style={{color:'#ef4444',fontSize:13,fontWeight:600,marginBottom:4}}>🚨 Emergency Line</div>
                <div style={{color:'#fff',fontSize:22,fontWeight:800}}>{s.emergencyPhone||'+1-800-CLINIC'}</div>
                <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:4}}>Available 24/7</div>
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,overflow:'hidden'}}>
              {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today;return(
                <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'11px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:isT?`${p}15`:'transparent'}}>
                  <span style={{fontSize:13,color:isT?'#fff':'rgba(255,255,255,0.6)'}}>{day}</span>
                  {slot?<span style={{fontSize:13,fontWeight:600,color:isT?p:'rgba(255,255,255,0.8)'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:12,color:'#ef4444'}}>Closed</span>}
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // timeline
  if (variant === 'timeline') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Schedule'} theme={theme}/>
          <div style={{maxWidth:600,margin:'0 auto'}}>
            {DAYS.map(day=>{
              const key=day.toLowerCase();const slot=hours[key];const isT=key===today;
              if(!slot&&!s.showClosedDays)return null;
              return(
                <div key={day} style={{display:'flex',gap:16,alignItems:'center',marginBottom:12}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:isT?p:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:700,color:isT?'#fff':p}}>{day.slice(0,2)}</span>
                  </div>
                  <div style={{flex:1,height:1,background:isT?p:`${p}20`}}/>
                  <div style={{background:isT?p:'#f8faff',borderRadius:8,padding:'6px 14px',border:`1px solid ${isT?p:p+'20'}`}}>
                    {slot ? <span style={{fontSize:13,fontWeight:600,color:isT?'#fff':theme.textColor}}>{slot.open} – {slot.close}</span>
                      : <span style={{fontSize:12,color:'#ef4444'}}>Closed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title} theme={theme}/>
        <div style={{maxWidth:480,margin:'0 auto',background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,0.07)'}}>
          {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today&&s.showTodayHighlight;if(!slot&&!s.showClosedDays)return null;return(
            <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'11px 22px',borderBottom:'1px solid #f8f9fa'}}>
              <span style={{fontSize:14,color:'#374151'}}>{day}</span>
              {slot?<span style={{fontSize:14,fontWeight:600,color:isT?p:'#374151'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:13,color:'#ef4444'}}>Closed</span>}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}
