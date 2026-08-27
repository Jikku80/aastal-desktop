'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { resolveImg, SectionTitle } from './shared';

export function GalleryPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'grid';
  const cols = (s.columns as number) || 3;
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[]) || [];

  const Box = ({i,style={}}:{i:number;style?:React.CSSProperties}) => {
    const item = items[i];
    return (
      <div style={{borderRadius:12,overflow:'hidden',background:`${p}${12+(i%4)*8}`,display:'flex',alignItems:'center',justifyContent:'center',...style}}>
        {item?.url ? <img src={resolveImg(item.url)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:28,opacity:0.4}}>🖼</span>}
      </div>
    );
  };

  if (variant === 'grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:12,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(9).fill(0).map((_,i)=><Box key={i} i={i} style={{aspectRatio:'1'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'masonry') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{columns:cols,gap:12}}>
            {Array(9).fill(0).map((_,i)=>(
              <div key={i} style={{marginBottom:12,breakInside:'avoid'}}>
                <Box i={i} style={{height:i%3===0?200:i%3===1?140:160}}/>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gridTemplateRows:'200px 160px',gap:12}}>
            <Box i={0} style={{gridColumn:'span 2',gridRow:'span 2'}}/>
            <Box i={1} style={{height:undefined}}/><Box i={2} style={{height:undefined}}/>
            <Box i={3} style={{height:undefined}}/><Box i={4} style={{height:undefined}}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'before-after') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Before & After'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{borderRadius:16,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
                  <div>
                    <div style={{background:'#64748b20',height:160,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:20,opacity:0.5}}>🖼</span></div>
                    <div style={{textAlign:'center',padding:'8px 0',fontSize:11,fontWeight:600,background:'#f1f5f9',color:'#6b7280'}}>BEFORE</div>
                  </div>
                  <div>
                    <div style={{background:`${p}20`,height:160,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:20,opacity:0.5}}>🖼</span></div>
                    <div style={{textAlign:'center',padding:'8px 0',fontSize:11,fontWeight:600,background:`${p}15`,color:p}}>AFTER</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'clinic-tour') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Clinic Tour'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gridTemplateRows:'240px 180px',gap:12}}>
            <Box i={0} style={{gridRow:'span 2'}}/><Box i={1} style={{height:undefined}}/><Box i={2} style={{height:undefined}}/>
            <Box i={3} style={{height:undefined}}/><Box i={4} style={{height:undefined}}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'lightbox') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Gallery'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)'}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gap:8,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(9).fill(0).map((_,i)=>(
              <div key={i} style={{borderRadius:8,overflow:'hidden',position:'relative',cursor:'pointer',aspectRatio:'1',background:`${p}${15+i*6}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:24,opacity:0.3}}>🖼</span>
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>
                  <span style={{color:'rgba(255,255,255,0)',fontSize:20,fontWeight:700}}>⊕</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'luxury') {
    return (
      <div style={{...css,...padding,background:'#fafaf9'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{width:40,height:1,background:theme.accentColor||p,margin:'0 auto 16px'}}/>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:300,color:theme.textColor,letterSpacing:'-0.02em',marginBottom:8}}>{s.title||'Our Gallery'}</h2>
            {s.subtitle && <p style={{color:'#9ca3af',fontSize:14}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <Box i={0} style={{aspectRatio:'16/9'}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[1,2,3,4].map(i=><Box key={i} i={i} style={{aspectRatio:'1'}}/>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'equipment') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Equipment'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:20,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(6).fill(0).map((_,i)=>(
              <div key={i} style={{borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}>
                <div style={{height:140,background:`${p}${12+i*7}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:36,opacity:0.5}}>🔬</span>
                </div>
                <div style={{padding:'12px 16px',background:'white'}}>
                  <div style={{fontWeight:600,color:theme.textColor,fontSize:13}}>{['MRI Scanner','X-Ray','Ultrasound','ECG','Endoscope','Lab Analyzer'][i]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // carousel-gallery
  if (variant === 'carousel-gallery') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>
            {Array(8).fill(0).map((_,i)=>(
              <div key={i} style={{minWidth:240,flexShrink:0,borderRadius:16,overflow:'hidden'}}>
                <Box i={i} style={{height:180}}/>
                {items[i]?.caption && <div style={{padding:'8px 12px',fontSize:12,color:'#6b7280'}}>{items[i].caption}</div>}
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:16}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===0?24:8,height:8,borderRadius:4,background:i===0?p:'#e5e7eb'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  // department-gallery
  if (variant === 'department-gallery') {
    const depts = [{name:'Reception',icon:'🏥'},{name:'Consultation Rooms',icon:'🩺'},{name:'Lab',icon:'🔬'},{name:'Equipment',icon:'💊'}];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Facilities'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:24}}>
            {depts.map((d,i)=>(
              <button key={i} style={{padding:'7px 16px',borderRadius:999,border:`1.5px solid ${i===0?p:'#e5e7eb'}`,background:i===0?p:'white',color:i===0?'#fff':theme.textColor,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <span>{d.icon}</span>{d.name}
              </button>
            ))}
          </div>
          <div style={{display:'grid',gap:12,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(9).fill(0).map((_,i)=><Box key={i} i={i} style={{aspectRatio:'4/3'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  // stacked-modern
  if (variant === 'stacked-modern') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Box i={0} style={{height:280,borderRadius:16}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Box i={1} style={{height:140,borderRadius:14}}/>
                <Box i={2} style={{height:140,borderRadius:14}}/>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Box i={3} style={{height:140,borderRadius:14}}/>
                <Box i={4} style={{height:140,borderRadius:14}}/>
              </div>
              <Box i={5} style={{height:280,borderRadius:16}}/>
            </div>
          </div>
          {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:theme.textColor,textAlign:'center',marginTop:24}}>{s.title}</h2>}
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
        <div style={{display:'grid',gap:12,gridTemplateColumns:`repeat(${cols},1fr)`}}>
          {Array(6).fill(0).map((_,i)=><Box key={i} i={i} style={{aspectRatio:'4/3'}}/>)}
        </div>
      </div>
    </div>
  );
}
