'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function StatsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'banner';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[])?.length ? s.items
    : [{value:'10+',label:'Years Experience'},{value:'5000+',label:'Happy Patients'},{value:'15+',label:'Expert Doctors'},{value:'98%',label:'Satisfaction Rate'}];

  if (variant === 'banner' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:p}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:24}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',color:'#fff'}}>
                <div style={{fontSize:'2.5rem',fontWeight:800}}>{item.value}</div>
                <div style={{fontSize:13,opacity:0.8,marginTop:4}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating-cards') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:20}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:20,padding:28,textAlign:'center',boxShadow:`0 8px 32px ${p}15`,border:`1px solid ${p}10`}}>
                <div style={{fontSize:'2.2rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                <div style={{fontSize:13,color:'#6b7280'}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {items.slice(0,4).map((item:any,i:number)=>(
              <div key={i} style={{borderRadius:20,padding:28,textAlign:'center',background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:'#f8faff',color:i===0?'#fff':theme.textColor,gridColumn:i===0?'span 2':undefined,boxShadow:i===0?`0 8px 32px ${p}30`:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:i===0?'3rem':'2.2rem',fontWeight:800}}>{item.value}</div>
                <div style={{fontSize:13,opacity:i===0?0.85:0.6,marginTop:4}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'with-icons') {
    const icons = ['🏥','👥','👨‍⚕️','⭐','🏆','💊'];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,4)},1fr)`,gap:24}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{fontSize:32,marginBottom:12}}>{icons[i%icons.length]}</div>
                <div style={{fontSize:'2rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                <div style={{fontSize:13,color:'#6b7280'}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark-premium') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:1,background:'rgba(255,255,255,0.08)',borderRadius:20,overflow:'hidden'}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',padding:'36px 24px',background:'#0f172a'}}>
                <div style={{fontSize:'2.8rem',fontWeight:800,color:p}}>{item.value}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:6}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'gradient-bg') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p},${theme.secondaryColor})`}}>
        <div className={wrapperClass}>
          {s.title && <h2 style={{textAlign:'center',fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:32}}>{s.title}</h2>}
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:1}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',padding:'28px 20px',borderRight:i<items.length-1?'1px solid rgba(255,255,255,0.2)':'none'}}>
                <div style={{fontSize:'2.5rem',fontWeight:800,color:'#fff'}}>{item.value}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginTop:4}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,4)},1fr)`,gap:24}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{width:110,height:110,borderRadius:'50%',border:`8px solid ${p}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',background:`${p}06`}}>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:p}}>{item.value}</div>
                </div>
                <div style={{fontSize:13,color:'#6b7280',fontWeight:600}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // dashboard
  if (variant === 'dashboard') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{background:'white',borderRadius:24,padding:32,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:'#f1f5f9',borderRadius:12,overflow:'hidden',marginBottom:24}}>
              {items.slice(0,4).map((item:any,i:number)=>(
                <div key={i} style={{padding:'20px 16px',background:'white',textAlign:'center'}}>
                  <div style={{fontSize:'1.8rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                  <div style={{fontSize:11,color:'#9ca3af',fontWeight:600}}>{item.label}</div>
                  <div style={{marginTop:8,height:3,borderRadius:2,background:`${p}20`}}>
                    <div style={{height:'100%',borderRadius:2,background:p,width:`${60+i*10}%`}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap'}}>
              {[['🏆','Award Winning'],['✓','Accredited'],['🌟','Top Rated']].map(([ic,lb])=>(
                <div key={lb} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#6b7280'}}>
                  <span>{ic}</span><span>{lb}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // timeline-stats
  if (variant === 'timeline-stats') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Growth'} subtitle={s.subtitle} theme={theme}/>
          <div style={{position:'relative',padding:'0 32px'}}>
            <div style={{position:'absolute',top:24,left:32,right:32,height:2,background:`${p}20`}}/>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:16,position:'relative',zIndex:1}}>
              {items.map((item:any,i:number)=>(
                <div key={i} style={{textAlign:'center'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:i===0?p:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:i===0?`0 4px 16px ${p}40`:'none',border:i!==0?`2px solid ${p}30`:'none'}}>
                    <span style={{fontWeight:800,color:i===0?'#fff':p,fontSize:12}}>{i+1}</span>
                  </div>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                  <div style={{fontSize:12,color:'#6b7280'}}>{item.label}</div>
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
    <div style={{...css,...padding,background:p}}>
      <div className={wrapperClass}>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:24}}>
          {items.map((item:any,i:number)=>(
            <div key={i} style={{textAlign:'center',color:'#fff'}}>
              <div style={{fontSize:'2.5rem',fontWeight:800}}>{item.value}</div>
              <div style={{fontSize:13,opacity:0.8,marginTop:4}}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
