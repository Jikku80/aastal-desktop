'use client';

import React from 'react';
import { Stethoscope, ChevronDown, ArrowRight } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function ServicesPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'cards';
  const cols = (s.columns as number) || 3;
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[])?.length
    ? s.items
    : Array(cols).fill({title:'Service',icon:'🩺',description:'Comprehensive care for you and your family.',price:''});

  if (variant === 'cards' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:20,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:`1px solid ${p}10`}}>
                {s.showIcons !== false && (
                  <div style={{width:52,height:52,borderRadius:12,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                    {item.icon ? <span style={{fontSize:24}}>{item.icon}</span> : <Stethoscope size={24} color={p}/>}
                  </div>
                )}
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:8,fontSize:15}}>{item.title||'Service'}</h3>
                <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>{item.description||''}</p>
                {s.showPrices && item.price && <div style={{marginTop:12,fontWeight:700,color:p}}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium-cards') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:24,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',border:`1px solid ${p}15`}}>
                <div style={{height:8,background:`linear-gradient(90deg,${p},${theme.accentColor})`}}/>
                <div style={{padding:28}}>
                  <div style={{fontSize:32,marginBottom:14}}>{item.icon||'🏥'}</div>
                  <h3 style={{fontFamily:theme.fontHeading,fontWeight:700,color:theme.textColor,fontSize:16,marginBottom:10}}>{item.title||'Service'}</h3>
                  <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6,marginBottom:16}}>{item.description||''}</p>
                  <span style={{fontSize:13,color:p,fontWeight:600,display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>Learn More <ArrowRight size={14}/></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento-grid') {
    const bi = items.slice(0,6);
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {bi.map((item:any,i:number)=>(
              <div key={i} style={{borderRadius:20,padding:28,background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:i===3?p:'white',color:i===0||i===3?'#fff':theme.textColor,boxShadow:i===0||i===3?`0 8px 32px ${p}40`:'0 2px 12px rgba(0,0,0,0.06)',gridColumn:i===0?'span 2':undefined,cursor:'pointer'}}>
                <div style={{fontSize:28,marginBottom:12}}>{item.icon||'🏥'}</div>
                <h3 style={{fontWeight:700,fontSize:15,marginBottom:6}}>{item.title||'Service'}</h3>
                <p style={{fontSize:13,opacity:i===0||i===3?0.85:0.6,lineHeight:1.5}}>{item.description||''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'icon-based') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(cols,4)},1fr)`,gap:32}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',padding:'16px 8px'}}>
                <div style={{width:72,height:72,borderRadius:'50%',background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',border:`2px solid ${p}20`}}>
                  <span style={{fontSize:30}}>{item.icon||'🏥'}</span>
                </div>
                <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:6}}>{item.title}</h3>
                <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{item.description||''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'tabs') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:28,justifyContent:'center'}}>
            {items.slice(0,5).map((item:any,i:number)=>(
              <button key={i} style={{padding:'8px 20px',borderRadius:999,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,background:i===0?p:'white',color:i===0?'#fff':theme.textColor,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>{item.title||`Service ${i+1}`}</button>
            ))}
          </div>
          {items[0] && (
            <div style={{background:'white',borderRadius:20,padding:40,boxShadow:'0 4px 24px rgba(0,0,0,0.08)',display:'grid',gridTemplateColumns:'1fr 2fr',gap:40,alignItems:'center'}}>
              <div style={{textAlign:'center'}}><span style={{fontSize:64}}>{items[0].icon||'🏥'}</span></div>
              <div>
                <h3 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:theme.textColor,marginBottom:12}}>{items[0].title}</h3>
                <p style={{color:'#6b7280',lineHeight:1.7}}>{items[0].description||'Comprehensive care for all your needs.'}</p>
                <button style={{marginTop:20,padding:'10px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}}>Book This Service</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'image-first') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:20,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,0.08)',cursor:'pointer'}}>
                <div style={{height:160,background:`linear-gradient(135deg,${p}${20+i*10},${theme.secondaryColor}${30+i*8})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:48}}>{item.icon||'🏥'}</span>
                </div>
                <div style={{padding:'18px 20px'}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:6}}>{item.title||'Service'}</h3>
                  <p style={{fontSize:13,color:'#9ca3af',lineHeight:1.5}}>{item.description||''}</p>
                  {s.showPrices && item.price && <div style={{marginTop:8,fontWeight:700,color:p}}>{item.price}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'treatment-pathway') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Your Treatment Journey'} subtitle={s.subtitle} theme={theme}/>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',top:32,left:'10%',right:'10%',height:2,background:`linear-gradient(90deg,${p}40,${p},${p}40)`}}/>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,5)},1fr)`,gap:16,position:'relative',zIndex:1}}>
              {items.slice(0,5).map((item:any,i:number)=>(
                <div key={i} style={{textAlign:'center',padding:'0 8px'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:p,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:`0 4px 16px ${p}40`}}>
                    <span style={{fontSize:24,color:'#fff'}}>{item.icon||`${i+1}`}</span>
                  </div>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:6}}>{item.title||`Step ${i+1}`}</h3>
                  <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{item.description||''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'accordion') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{maxWidth:720,margin:'0 auto',display:'flex',flexDirection:'column',gap:10}}>
            {items.slice(0,6).map((item:any,i:number)=>(
              <div key={i} style={{border:`1.5px solid ${p}20`,borderRadius:14,overflow:'hidden'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:i===0?`${p}08`:'#fafafa',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:20}}>{item.icon||'🏥'}</span>
                    <span style={{fontWeight:600,color:theme.textColor,fontSize:14}}>{item.title||'Service'}</span>
                  </div>
                  <ChevronDown size={16} color={p} style={{transform:i===0?'rotate(180deg)':'none'}}/>
                </div>
                {i===0 && <div style={{padding:'0 20px 16px',fontSize:13,color:'#6b7280',lineHeight:1.6,background:`${p}05`}}>{item.description||'Details about this service.'}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal-scroll') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,overflowX:'auto',paddingBottom:8}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{minWidth:220,background:'#f8faff',borderRadius:16,padding:24,border:`1px solid ${p}15`,flexShrink:0}}>
                <div style={{fontSize:32,marginBottom:12}}>{item.icon||'🏥'}</div>
                <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:6}}>{item.title}</h3>
                <p style={{fontSize:12,color:'#9ca3af'}}>{item.description||''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // category-groups
  if (variant === 'category-groups') {
    const cats = s.categories || [
      {label:'Primary Care',items:items.slice(0,3)},
      {label:'Specialties',items:items.slice(0,3)},
    ];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          {cats.map((cat:any,ci:number)=>(
            <div key={ci} style={{marginBottom:36}}>
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
                <span style={{padding:'5px 16px',borderRadius:999,background:`${p}12`,color:p,fontSize:13,fontWeight:700}}>{cat.label}</span>
                <div style={{flex:1,height:1,background:'#e5e7eb'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:16}}>
                {cat.items.map((item:any,i:number)=>(
                  <div key={i} style={{background:'#f8faff',borderRadius:14,padding:'18px 20px',display:'flex',gap:12,alignItems:'flex-start',border:`1px solid ${p}10`}}>
                    <div style={{width:40,height:40,borderRadius:10,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:18}}>{item.icon||'🏥'}</span>
                    </div>
                    <div><div style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:4}}>{item.title}</div><div style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{item.description||''}</div></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // department-showcase
  if (variant === 'department-showcase') {
    return (
      <div style={{...css,...padding,background:p}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Our Departments'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.7)'}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:16}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:20,padding:28,cursor:'pointer',transition:'background 0.2s'}}>
                <div style={{fontSize:36,marginBottom:14}}>{item.icon||'🏥'}</div>
                <h3 style={{fontWeight:700,color:'#fff',fontSize:15,marginBottom:6}}>{item.title}</h3>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.5}}>{item.description||''}</p>
                {s.showPrices && item.price && <div style={{marginTop:10,fontWeight:700,color:'rgba(255,255,255,0.9)',fontSize:14}}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // interactive-hover
  if (variant === 'interactive-hover') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:20}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{borderRadius:20,overflow:'hidden',position:'relative',cursor:'pointer',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',border:`1px solid ${p}10`}}>
                <div style={{height:180,background:`linear-gradient(135deg,${p}${18+i*8},${theme.secondaryColor}${25+i*6})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:52}}>{item.icon||'🏥'}</span>
                </div>
                <div style={{padding:'20px 22px',background:'white'}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:6,fontSize:15}}>{item.title}</h3>
                  <p style={{fontSize:13,color:'#9ca3af',lineHeight:1.5,marginBottom:12}}>{item.description||''}</p>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {s.showPrices && item.price ? <span style={{fontWeight:700,color:p}}>{item.price}</span> : <span/>}
                    <span style={{fontSize:13,color:p,fontWeight:600,display:'flex',alignItems:'center',gap:4}}>Learn more <ArrowRight size={13}/></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // specialist-grid (medical specialties)
  if (variant === 'specialist-grid') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Medical Specialties'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:'20px 16px',textAlign:'center',cursor:'pointer',border:`2px solid transparent`,transition:'border-color 0.2s',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                  <span style={{fontSize:26}}>{item.icon||'🩺'}</span>
                </div>
                <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:4}}>{item.title}</div>
                <div style={{fontSize:11,color:'#9ca3af',lineHeight:1.4}}>{item.description||''}</div>
                {s.showPrices && item.price && <div style={{marginTop:8,fontSize:12,fontWeight:700,color:p}}>{item.price}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // masonry-grid
  if (variant === 'masonry-grid') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{columns:cols,gap:16}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{breakInside:'avoid',marginBottom:16,borderRadius:16,overflow:'hidden',background:'#f8faff',border:`1px solid ${p}10`,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                <div style={{height:i%3===0?180:i%3===1?140:120,background:`linear-gradient(135deg,${p}${15+i*6},${theme.secondaryColor}${20+i*5})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:i%3===0?48:36}}>{item.icon||'🏥'}</span>
                </div>
                <div style={{padding:'14px 16px'}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:4}}>{item.title}</h3>
                  <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{item.description||''}</p>
                </div>
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
        <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
        <div style={{display:'grid',gap:20,gridTemplateColumns:`repeat(${cols},1fr)`}}>
          {items.map((item:any,i:number)=>(
            <div key={i} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
              <div style={{width:52,height:52,borderRadius:12,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                {item.icon ? <span style={{fontSize:24}}>{item.icon}</span> : <Stethoscope size={24} color={p}/>}
              </div>
              <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:8}}>{item.title||'Service'}</h3>
              <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>{item.description||''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
