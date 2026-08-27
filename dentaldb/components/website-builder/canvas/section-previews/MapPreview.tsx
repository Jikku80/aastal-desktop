'use client';

import React from 'react';
import { Phone, MapPin, Mail, Clock } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function MapPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'full-width';
  const p = theme.primaryColor;
  const address = (s.address as string) || '';
  const h = (s.height as number) || 400;

  const MapBox = ({height=400,rounded=true}:{height?:number;rounded?:boolean}) => (
    <div style={{background:'#e2e8f0',height,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:rounded?16:0,overflow:'hidden'}}>
      {s.embedUrl
        ? <iframe src={s.embedUrl as string} width="100%" height={height} style={{border:0}} allowFullScreen loading="lazy"/>
        : <div style={{textAlign:'center',color:'#94a3b8'}}><MapPin size={40} style={{margin:'0 auto 10px'}}/><div style={{fontSize:13}}>Map Preview</div>{address&&<div style={{fontSize:11,marginTop:4,opacity:0.7,maxWidth:200,textAlign:'center'}}>{address}</div>}</div>}
    </div>
  );

  if (variant === 'full-width' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        {s.title && <div className={wrapperClass} style={{marginBottom:16}}><h2 style={{fontSize:'1.5rem',fontWeight:700,color:theme.textColor}}>{s.title}</h2></div>}
        <div style={{borderRadius:0,overflow:'hidden'}}><MapBox height={h} rounded={false}/></div>
      </div>
    );
  }

  if (variant === 'contact-map') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:0,borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            <div style={{background:p,padding:36,display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <h3 style={{fontWeight:700,color:'#fff',fontSize:18,marginBottom:20}}>{s.title||'Find Us'}</h3>
              {address && <div style={{display:'flex',gap:10,marginBottom:14}}><MapPin size={16} color="rgba(255,255,255,0.7)" style={{flexShrink:0,marginTop:2}}/><span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{address}</span></div>}
              {s.phone && <div style={{display:'flex',gap:10,marginBottom:14}}><Phone size={16} color="rgba(255,255,255,0.7)"/><span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{s.phone}</span></div>}
              {s.email && <div style={{display:'flex',gap:10}}><Mail size={16} color="rgba(255,255,255,0.7)"/><span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{s.email}</span></div>}
              <button style={{marginTop:28,padding:'10px 20px',borderRadius:8,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer'}}>Get Directions →</button>
            </div>
            <MapBox height={360} rounded={false}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating-card') {
    return (
      <div style={{...css,position:'relative',overflow:'hidden'}}>
        <MapBox height={480} rounded={false}/>
        <div style={{position:'absolute',top:'50%',right:48,transform:'translateY(-50%)',background:'white',borderRadius:20,padding:'28px 24px',width:280,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
          <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:16,fontSize:16}}>{s.title||'Visit Us'}</h3>
          {address && <div style={{display:'flex',gap:10,marginBottom:10}}><MapPin size={15} color={p} style={{flexShrink:0,marginTop:2}}/><span style={{fontSize:13,color:'#374151'}}>{address}</span></div>}
          {s.phone && <div style={{display:'flex',gap:10,marginBottom:10}}><Phone size={15} color={p}/><span style={{fontSize:13,color:'#374151'}}>{s.phone}</span></div>}
          {s.hours && <div style={{display:'flex',gap:10,marginBottom:16}}><Clock size={15} color={p}/><span style={{fontSize:13,color:'#374151'}}>{s.hours}</span></div>}
          <button style={{width:'100%',padding:'10px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer'}}>Get Directions</button>
        </div>
      </div>
    );
  }

  if (variant === 'multi-location') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Locations'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
            {[{name:'Main Branch',addr:address||'123 Medical Ave'},{name:'Downtown',addr:'456 Health Street'}].map((loc,i)=>(
              <div key={i} style={{background:i===0?p:'white',borderRadius:14,padding:'14px 18px',cursor:'pointer',border:i===0?'none':`1px solid ${p}20`}}>
                <div style={{fontWeight:700,color:i===0?'#fff':theme.textColor,marginBottom:4,fontSize:14}}>{loc.name}</div>
                <div style={{fontSize:12,color:i===0?'rgba(255,255,255,0.8)':'#9ca3af'}}>{loc.addr}</div>
              </div>
            ))}
          </div>
          <MapBox height={320}/>
        </div>
      </div>
    );
  }

  if (variant === 'directions') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:40,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'How to Find Us'}</h2>
              {address && <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}><MapPin size={16} color={p} style={{flexShrink:0,marginTop:2}}/><span style={{fontSize:14,color:'#374151'}}>{address}</span></div>}
              {s.phone && <div style={{display:'flex',gap:10,marginBottom:12}}><Phone size={16} color={p}/><span style={{fontSize:14,color:'#374151'}}>{s.phone}</span></div>}
              {s.parkingInfo && <div style={{background:`${p}08`,borderRadius:12,padding:'12px 14px',marginTop:16}}><div style={{fontSize:12,fontWeight:700,color:p,marginBottom:4}}>🅿 Parking</div><div style={{fontSize:13,color:'#6b7280'}}>{s.parkingInfo}</div></div>}
              <button style={{marginTop:20,padding:'11px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer',width:'100%'}}>Open in Maps →</button>
            </div>
            <MapBox height={380}/>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'white'}}>
      <div className={wrapperClass}>
        {s.title && <h2 style={{fontSize:'1.5rem',fontWeight:700,color:theme.textColor,marginBottom:14}}>{s.title}</h2>}
        <MapBox height={h}/>
      </div>
    </div>
  );
}
