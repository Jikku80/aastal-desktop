'use client';

import React from 'react';
import { Shield, Award } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function SocialProofPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'logos';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[])?.length ? s.items
    : [{name:'ISO Certified'},{name:'NABH Accredited'},{name:'JCI Certified'},{name:'JCAHO'},{name:'WHO Partner'}];

  if (variant === 'logos' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} theme={theme}/>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:20}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,background:'white',borderRadius:14,padding:'18px 22px',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',minWidth:100}}>
                {item.image ? <img src={item.image} alt={item.name} style={{height:40,objectFit:'contain'}}/> : <div style={{width:48,height:48,background:`${p}15`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}><Shield size={22} color={p}/></div>}
                <span style={{fontSize:11,fontWeight:600,color:'#6b7280',textAlign:'center'}}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'award-showcase') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}06,${p}12)`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Awards & Certifications'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:20}}>
            {items.slice(0,5).map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',border:`1px solid ${p}10`}}>
                <Award size={36} color={i===0?'#f59e0b':p} style={{margin:'0 auto 12px'}}/>
                <div style={{fontSize:12,fontWeight:700,color:theme.textColor}}>{item.name}</div>
                {item.year && <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>{item.year}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'strip') {
    return (
      <div style={{...css,...padding,background:'white',borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:32,flexWrap:'wrap'}}>
            {s.title && <span style={{fontSize:13,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.title}</span>}
            <div style={{display:'flex',gap:32,alignItems:'center',flexWrap:'wrap'}}>
              {items.map((item:any,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,opacity:0.6}}>
                  <Shield size={16} color={p}/><span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'insurance') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Insurance We Accept'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:16}}>
            {(items.length?items:['Aetna','Blue Cross','Cigna','UnitedHealth','Humana','Medicare'].map(n=>({name:n}))).map((item:any,i:number)=>(
              <div key={i} style={{background:'#f8faff',border:'1px solid #e5e7eb',borderRadius:12,padding:'14px 22px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,background:`${p}15`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><Shield size={16} color={p}/></div>
                <span style={{fontSize:13,fontWeight:600,color:theme.textColor}}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:32}}>
            {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:'#fff',marginBottom:6}}>{s.title}</h2>}
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:16}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:10}}>
                <Shield size={18} color={p}/><span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.8)'}}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'interactive') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Certifications'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {items.slice(0,4).map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:20,padding:28,textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',cursor:'pointer',border:`2px solid transparent`,transition:'border-color 0.2s'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                  <Award size={30} color={p}/>
                </div>
                <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:4}}>{item.name}</div>
                {item.desc && <div style={{fontSize:11,color:'#9ca3af'}}>{item.desc}</div>}
                {item.year && <div style={{fontSize:11,color:p,fontWeight:600,marginTop:6}}>Since {item.year}</div>}
              </div>
            ))}
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
        <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:20}}>
          {items.map((item:any,i:number)=>(
            <div key={i} style={{background:'white',borderRadius:12,padding:'16px 20px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
              <div style={{width:40,height:40,background:`${p}12`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><Shield size={18} color={p}/></div>
              <span style={{fontSize:11,color:'#6b7280'}}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
