'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function VideoPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'featured';
  const p = theme.primaryColor;
  const VideoBox = ({h=400}:{h?:number}) => (
    <div style={{background:'#0f172a',borderRadius:16,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',height:h}}>
      {s.url ? <iframe src={s.url as string} style={{width:'100%',height:'100%',border:0}} allowFullScreen/>
        : <div style={{textAlign:'center'}}><div style={{width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',cursor:'pointer'}}><span style={{color:'#fff',fontSize:24,marginLeft:4}}>▶</span></div><div style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>Video Preview</div></div>}
    </div>
  );

  if (variant === 'featured' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <VideoBox/>
          {s.caption && <p style={{fontSize:13,color:'#9ca3af',textAlign:'center',marginTop:10}}>{s.caption}</p>}
        </div>
      </div>
    );
  }

  if (variant === 'side-by-side') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,alignItems:'center'}}>
            <div>
              {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,marginBottom:14}}>{s.title}</h2>}
              {s.subtitle && <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:20}}>{s.subtitle}</p>}
              {s.description && <p style={{color:'#6b7280',lineHeight:1.7}}>{s.description}</p>}
            </div>
            <VideoBox h={300}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'gallery') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Video Gallery'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
            <VideoBox h={300}/>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <VideoBox h={140}/><VideoBox h={140}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'testimonial-video') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Patient Stories'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{borderRadius:16,overflow:'hidden',background:'white',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
                <div style={{height:160,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><span style={{color:'#fff',fontSize:18,marginLeft:3}}>▶</span></div>
                </div>
                <div style={{padding:'14px 16px'}}>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:2}}>{['Patient Story','Recovery Journey','Treatment Review'][i]}</div>
                  <div style={{fontSize:12,color:'#9ca3af'}}>2:30 min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'fullwidth') {
    return (
      <div style={{...css,position:'relative',overflow:'hidden'}}>
        <div style={{background:'#0f172a',minHeight:500,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {s.url ? <iframe src={s.url as string} style={{width:'100%',height:500,border:0}} allowFullScreen/>
            : <div style={{textAlign:'center'}}>
                <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',cursor:'pointer'}}><span style={{color:'#fff',fontSize:32,marginLeft:6}}>▶</span></div>
                {s.title && <h2 style={{fontFamily:theme.fontHeading,color:'#fff',fontSize:'2rem',fontWeight:700}}>{s.title}</h2>}
              </div>}
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'white'}}>
      <div className={wrapperClass}>
        {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,marginBottom:16,textAlign:'center'}}>{s.title}</h2>}
        <VideoBox/>
      </div>
    </div>
  );
}
