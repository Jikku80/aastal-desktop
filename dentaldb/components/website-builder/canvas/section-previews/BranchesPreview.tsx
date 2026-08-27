'use client';

import React from 'react';
import { Phone, MapPin, Clock } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function BranchesPreview({ s, css, padding, theme, wrapperClass, liveBranches = [] }: PreviewProps) {
  const variant = s.variant ?? 'cards';
  const p = theme.primaryColor;

  const useApiData = s.dataSource !== 'manual' && liveBranches.length > 0;
  const items: any[] = useApiData ? liveBranches
    : (s.items as any[])?.length ? s.items
    : [{ name:'Main Branch', address:'123 Medical Ave', phone:'+1 234 567 890', hours:'9am–6pm' }, { name:'Downtown Clinic', address:'456 Health Street', phone:'+1 234 567 891', hours:'9am–5pm' }, { name:'North Suburb', address:'789 Care Boulevard', phone:'+1 234 567 892', hours:'10am–4pm' }];

  if (variant === 'cards' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {items.map((b:any,i:number)=>(
              <div key={i} style={{border:`1px solid ${p}15`,borderRadius:20,padding:24,boxShadow:'0 2px 16px rgba(0,0,0,0.06)'}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}><MapPin size={18} color={p}/></div>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:10,fontSize:15}}>{b.name}</h3>
                {b.address && <div style={{display:'flex',gap:6,fontSize:13,color:'#6b7280',marginBottom:6}}><MapPin size={12} style={{marginTop:2,flexShrink:0}}/>{b.address}</div>}
                {b.phone && <div style={{display:'flex',gap:6,fontSize:13,color:'#6b7280',marginBottom:6}}><Phone size={12} style={{marginTop:2,flexShrink:0}}/>{b.phone}</div>}
                {b.hours && <div style={{display:'flex',gap:6,fontSize:13,color:'#6b7280'}}><Clock size={12} style={{marginTop:2,flexShrink:0}}/>{b.hours}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'map-first') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:24}}>
            <div style={{background:'#e2e8f0',borderRadius:20,height:360,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{textAlign:'center',color:'#94a3b8'}}><MapPin size={48} style={{margin:'0 auto 12px'}}/><div style={{fontSize:14}}>Map Preview</div></div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {items.slice(0,3).map((b:any,i:number)=>(
                <div key={i} style={{background:'white',borderRadius:14,padding:18,boxShadow:'0 2px 10px rgba(0,0,0,0.06)',cursor:'pointer',borderLeft:i===0?`4px solid ${p}`:'4px solid transparent'}}>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:4}}>{b.name}</div>
                  <div style={{fontSize:12,color:'#9ca3af'}}>{b.address}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {items.map((b:any,i:number)=>(
              <div key={i} style={{borderRadius:24,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
                <div style={{height:120,background:`linear-gradient(135deg,${p}${20+i*10},${theme.secondaryColor}${30+i*8})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MapPin size={36} color="#fff"/>
                </div>
                <div style={{padding:'20px 22px'}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:10}}>{b.name}</h3>
                  {b.address && <p style={{fontSize:13,color:'#6b7280',marginBottom:6}}>{b.address}</p>}
                  {b.phone && <p style={{fontSize:13,color:'#6b7280',marginBottom:12}}>{b.phone}</p>}
                  <button style={{padding:'8px 18px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:12,border:'none',cursor:'pointer'}}>Get Directions</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'city-grid') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Locations'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {([...items,...(items.length<4?[{name:'Coming Soon',address:'New location',phone:'',hours:''}]:[])] as any[]).slice(0,4).map((b:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:20,textAlign:'center',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',cursor:'pointer',border:`1px solid ${p}10`}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><MapPin size={22} color={p}/></div>
                <div style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:6}}>{b.name}</div>
                <div style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{b.address}</div>
                {b.hours && <div style={{fontSize:11,color:p,fontWeight:600,marginTop:8}}>{b.hours}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'hospital-network') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Our Network'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)'}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {items.map((b:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${p}30`,display:'flex',alignItems:'center',justifyContent:'center'}}><MapPin size={16} color={p}/></div>
                  <h3 style={{fontWeight:700,color:'#fff',fontSize:14}}>{b.name}</h3>
                </div>
                {b.address && <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginBottom:4}}>{b.address}</div>}
                {b.phone && <div style={{fontSize:12,color:p,fontWeight:600}}>{b.phone}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,overflowX:'auto',paddingBottom:8}}>
            {[...items,...items].slice(0,5).map((b:any,i:number)=>(
              <div key={i} style={{minWidth:260,background:'#f8faff',borderRadius:16,padding:22,border:`1px solid ${p}12`,flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}><MapPin size={16} color={p}/></div>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:8,fontSize:14}}>{b.name}</h3>
                {b.address && <div style={{fontSize:12,color:'#6b7280',marginBottom:4}}>{b.address}</div>}
                {b.phone && <div style={{fontSize:12,color:'#6b7280'}}>{b.phone}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // regional-directory
  if (variant === 'regional-directory') {
    const regions = [
      {name:'North',branches:items.slice(0,2)},
      {name:'South',branches:items.slice(1,3)},
      {name:'East',branches:items.slice(0,1)},
    ];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Find a Branch'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {regions.map((reg,ri)=>(
              <div key={ri} style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{padding:'14px 20px',background:`${p}10`,borderBottom:`1px solid ${p}15`}}>
                  <h3 style={{fontWeight:700,color:p,fontSize:14}}>📍 {reg.name} Region</h3>
                </div>
                {reg.branches.map((b:any,i:number)=>(
                  <div key={i} style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9'}}>
                    <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:3}}>{b.name}</div>
                    {b.address && <div style={{fontSize:12,color:'#9ca3af',marginBottom:2}}>{b.address}</div>}
                    {b.phone && <div style={{fontSize:12,color:p,fontWeight:600}}>{b.phone}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'white'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {items.map((b:any,i:number)=>(
            <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:16,padding:20}}>
              <h3 style={{fontWeight:600,color:theme.textColor,marginBottom:8}}>{b.name}</h3>
              {b.address && <div style={{fontSize:13,color:'#6b7280'}}>{b.address}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
