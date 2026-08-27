'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function SlotsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'grid';
  const p = theme.primaryColor;
  const slots = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30'];

  if (variant === 'grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Available Slots'} theme={theme}/>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
            {slots.map(slot=>(
              <button key={slot} style={{padding:'10px 20px',border:`2px solid ${p}40`,borderRadius:10,fontSize:13,fontWeight:600,color:p,background:'white',cursor:'pointer'}}>{slot}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'day-cards') {
    const days = ['Mon','Tue','Wed','Thu','Fri'];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Book a Slot'} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14}}>
            {days.map((day,i)=>(
              <div key={day} style={{borderRadius:14,border:`1.5px solid ${i===0?p:'#e5e7eb'}`,padding:16,background:i===0?`${p}08`:'white'}}>
                <div style={{fontWeight:700,color:i===0?p:theme.textColor,marginBottom:12,fontSize:14}}>{day}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {slots.slice(0,4).map(t=>(
                    <span key={t} style={{display:'block',textAlign:'center',padding:'6px 4px',borderRadius:6,background:i===0&&t==='09:00'?p:'#f8faff',color:i===0&&t==='09:00'?'#fff':'#6b7280',fontSize:12,fontWeight:600,cursor:'pointer'}}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Today\'s Available Slots'} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:24}}>
            {[{label:'Morning',slots:slots.slice(0,5)},{label:'Afternoon',slots:slots.slice(6)}].map(({label,slots:ss})=>(
              <div key={label} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:16,fontSize:14}}>☀️ {label}</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {ss.map(t=>(
                    <button key={t} style={{padding:'8px 16px',borderRadius:8,border:`1.5px solid ${p}35`,color:p,fontSize:12,fontWeight:600,background:'transparent',cursor:'pointer'}}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-wise') {
    const doctors = ['Dr. Smith','Dr. Patel','Dr. Chen'];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Available Slots by Doctor'} theme={theme}/>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {doctors.map((doc,di)=>(
              <div key={doc} style={{background:'#f8faff',borderRadius:16,padding:'18px 24px'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p,fontSize:14}}>{doc[3]}</div>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:14}}>{doc}</div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {slots.slice(di,di+5).map(t=>(
                    <button key={t} style={{padding:'6px 14px',borderRadius:6,border:`1.5px solid ${p}35`,color:p,fontSize:12,fontWeight:600,background:'white',cursor:'pointer'}}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div style={{...css,...padding,background:`${p}08`}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <h3 style={{fontFamily:theme.fontHeading,fontWeight:700,color:theme.textColor,fontSize:16}}>{s.title||'Quick Book'}</h3>
              <p style={{fontSize:13,color:'#6b7280',marginTop:2}}>Select a slot and book instantly</p>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {slots.slice(0,6).map(t=>(
                <button key={t} style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${p}40`,color:p,fontSize:12,fontWeight:700,background:'white',cursor:'pointer'}}>{t}</button>
              ))}
            </div>
            <button style={{padding:'10px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',flexShrink:0}}>Confirm</button>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title||'Available Slots'} theme={theme}/>
        <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
          {slots.map(slot=>(
            <button key={slot} style={{padding:'10px 20px',border:`2px solid ${p}40`,borderRadius:10,fontSize:13,fontWeight:600,color:p,background:'white',cursor:'pointer'}}>{slot}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
