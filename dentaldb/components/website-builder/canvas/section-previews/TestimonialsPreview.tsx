'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { SectionTitle, StarRating } from './shared';

export function TestimonialsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'cards';
  const p = theme.primaryColor; const starC = theme.accentColor || '#f59e0b';
  const items: any[] = (s.items as any[])?.length ? s.items
    : Array(3).fill({name:'Happy Patient',rating:5,text:'Exceptional care and friendly staff! I highly recommend this clinic.',role:'Patient'});

  if (variant === 'cards' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {items.slice(0,3).map((t:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 16px rgba(0,0,0,0.06)',border:`1px solid ${p}10`}}>
                <StarRating rating={t.rating||5} color={starC}/>
                <p style={{color:'#374151',lineHeight:1.7,margin:'14px 0 20px',fontSize:14}}>"{t.text}"</p>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p}}>{t.name?.[0]||'P'}</div>
                  <div><div style={{fontWeight:700,fontSize:13,color:theme.textColor}}>{t.name}</div>{t.role&&<div style={{fontSize:11,color:'#9ca3af'}}>{t.role}</div>}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento-reviews') {
    const bi = [...items,...Array(Math.max(0,5-items.length)).fill({name:'Patient',rating:5,text:'Great experience!',role:''})].slice(0,5);
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {bi.map((t:any,i:number)=>(
              <div key={i} style={{background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:i===3?p:'white',borderRadius:20,padding:24,gridColumn:i===0||i===3?'span 2':undefined,boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
                <StarRating rating={t.rating||5} color={i===0||i===3?'rgba(255,255,255,0.9)':starC}/>
                <p style={{color:i===0||i===3?'rgba(255,255,255,0.9)':'#374151',fontSize:14,lineHeight:1.6,margin:'12px 0'}}>"{t.text}"</p>
                <div style={{fontWeight:700,fontSize:13,color:i===0||i===3?'#fff':theme.textColor}}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'google-style') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
            <div style={{background:'#f8faff',borderRadius:20,padding:32,minWidth:200,textAlign:'center',flexShrink:0}}>
              <div style={{fontSize:'3.5rem',fontWeight:800,color:theme.textColor}}>4.9</div>
              <div style={{display:'flex',justifyContent:'center'}}><StarRating rating={5} color="#f59e0b"/></div>
              <div style={{fontSize:13,color:'#9ca3af',marginTop:8}}>500+ reviews</div>
              <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:6}}>
                {[5,4,3,2,1].map(n=>(
                  <div key={n} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'#6b7280',width:8}}>{n}</span>
                    <div style={{flex:1,height:6,background:'#e5e7eb',borderRadius:3}}>
                      <div style={{height:'100%',borderRadius:3,background:'#f59e0b',width:n===5?'80%':n===4?'15%':'3%'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:12,minWidth:280}}>
              {items.slice(0,4).map((t:any,i:number)=>(
                <div key={i} style={{background:'#f9fafb',borderRadius:14,padding:'14px 18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p}}>{t.name?.[0]||'P'}</div>
                    <div><div style={{fontWeight:700,fontSize:13}}>{t.name}</div><StarRating rating={t.rating||5} color="#f59e0b"/></div>
                    <span style={{marginLeft:'auto',fontSize:11,color:'#9ca3af'}}>1 week ago</span>
                  </div>
                  <p style={{fontSize:13,color:'#4b5563',lineHeight:1.5}}>{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'large-quote') {
    const ft = items[0] || {};
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',maxWidth:800,margin:'0 auto'}}>
            <div style={{fontSize:80,color:`${p}30`,lineHeight:0.6,marginBottom:24}}>"</div>
            <p style={{fontSize:'1.5rem',color:theme.textColor,lineHeight:1.6,fontStyle:'italic',fontFamily:theme.fontHeading,marginBottom:32}}>{ft.text||'The most caring and professional medical team I have encountered. They truly made me feel at ease.'}</p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p,fontSize:18}}>{ft.name?.[0]||'P'}</div>
              <div style={{textAlign:'left'}}>
                <div style={{fontWeight:700,color:theme.textColor}}>{ft.name||'Satisfied Patient'}</div>
                <StarRating rating={ft.rating||5} color={starC}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'trust-wall') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Patient Stories'}</h2>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <StarRating rating={5} color="#f59e0b"/>
              <span style={{color:'rgba(255,255,255,0.7)',fontSize:14}}>4.9 average from 1,200+ reviews</span>
            </div>
          </div>
          <div style={{columns:3,gap:16}}>
            {[...items,...items.slice(0,3)].slice(0,6).map((t:any,i:number)=>(
              <div key={i} style={{breakInside:'avoid',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20,marginBottom:16}}>
                <StarRating rating={t.rating||5} color="#f59e0b"/>
                <p style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5,margin:'10px 0'}}>{t.text}</p>
                <div style={{fontWeight:600,fontSize:12,color:'rgba(255,255,255,0.5)'}}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured-story') {
    const ft = items[0]||{};
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{background:`linear-gradient(135deg,${p}06,${p}12)`,borderRadius:24,padding:'40px 48px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              <div style={{display:'flex',marginBottom:16}}><StarRating rating={ft.rating||5} color={starC}/></div>
              <p style={{fontSize:'1.2rem',color:theme.textColor,lineHeight:1.7,fontStyle:'italic',marginBottom:24}}>"{ft.text||'The care I received was truly outstanding. The doctors were knowledgeable and compassionate.'}"</p>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:p,fontSize:20}}>{ft.name?.[0]||'P'}</div>
                <div><div style={{fontWeight:700,color:theme.textColor,fontSize:16}}>{ft.name||'Patient'}</div><div style={{fontSize:13,color:'#9ca3af'}}>{ft.role||'Verified Patient'}</div></div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {items.slice(1,4).map((t:any,i:number)=>(
                <div key={i} style={{background:'white',borderRadius:14,padding:'14px 18px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:13,color:theme.textColor}}>{t.name}</span>
                    <StarRating rating={t.rating||5} color={starC}/>
                  </div>
                  <p style={{fontSize:12,color:'#6b7280',lineHeight:1.5}}>{t.text?.slice(0,80)}...</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',flexDirection:'column',gap:24,maxWidth:700,margin:'0 auto'}}>
            {items.slice(0,4).map((t:any,i:number)=>(
              <div key={i} style={{borderBottom:'1px solid #f1f5f9',paddingBottom:24}}>
                <StarRating rating={t.rating||5} color={starC}/>
                <p style={{color:'#374151',lineHeight:1.7,margin:'12px 0',fontSize:15,fontStyle:'italic'}}>"{t.text}"</p>
                <div style={{fontSize:13,fontWeight:700,color:theme.textColor}}>{t.name} <span style={{color:'#9ca3af',fontWeight:400}}>— {t.role||'Patient'}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // carousel
  if (variant === 'carousel') {
    return (
      <div style={{...css,...padding,background:`${p}08`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,overflowX:'auto',paddingBottom:8}}>
            {[...items,...items].slice(0,6).map((t:any,i:number)=>(
              <div key={i} style={{minWidth:300,background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 20px rgba(0,0,0,0.08)',flexShrink:0,border:`1px solid ${p}10`}}>
                <StarRating rating={t.rating||5} color={starC}/>
                <p style={{color:'#374151',lineHeight:1.7,margin:'14px 0 18px',fontSize:14}}>"{t.text}"</p>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p}}>{t.name?.[0]||'P'}</div>
                  <div><div style={{fontWeight:700,fontSize:13,color:theme.textColor}}>{t.name}</div>{t.role&&<div style={{fontSize:11,color:'#9ca3af'}}>{t.role}</div>}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:20}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===0?24:8,height:8,borderRadius:4,background:i===0?p:'#e5e7eb'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  // stats-reviews
  if (variant === 'stats-reviews') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:48}}>
            <div style={{background:`${p}08`,borderRadius:24,padding:36,textAlign:'center',display:'flex',flexDirection:'column',justifyContent:'center',gap:24}}>
              {[{v:'4.9★',l:'Average Rating'},{v:'1,200+',l:'Reviews'},{v:'98%',l:'Recommend Us'}].map((st,i)=>(
                <div key={i}><div style={{fontSize:'2rem',fontWeight:800,color:p}}>{st.v}</div><div style={{fontSize:13,color:'#6b7280',marginTop:2}}>{st.l}</div></div>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {items.slice(0,4).map((t:any,i:number)=>(
                <div key={i} style={{background:'#f9fafb',borderRadius:14,padding:'16px 20px',borderLeft:`3px solid ${p}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontWeight:700,fontSize:13,color:theme.textColor}}>{t.name}</span>
                    <StarRating rating={t.rating||5} color={starC}/>
                  </div>
                  <p style={{fontSize:13,color:'#4b5563',lineHeight:1.5}}>{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // doctor-specific
  if (variant === 'doctor-specific') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Reviews by Doctor'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            {[{doc:'Dr. Smith',spec:'Cardiology',reviews:items.slice(0,2)},{doc:'Dr. Patel',spec:'Dermatology',reviews:items.slice(1,3)}].map((group,gi)=>(
              <div key={gi} style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,0.07)'}}>
                <div style={{padding:'16px 20px',background:p,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#fff',fontSize:16}}>{group.doc[3]}</div>
                  <div><div style={{fontWeight:700,color:'#fff',fontSize:14}}>{group.doc}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>{group.spec}</div></div>
                </div>
                <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
                  {group.reviews.map((t:any,i:number)=>(
                    <div key={i} style={{background:'#f9fafb',borderRadius:10,padding:'10px 14px'}}>
                      <StarRating rating={t.rating||5} color={starC}/>
                      <p style={{fontSize:12,color:'#4b5563',marginTop:6,lineHeight:1.5}}>{t.text}</p>
                      <div style={{fontSize:11,color:'#9ca3af',marginTop:4,fontWeight:600}}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // department-reviews
  if (variant === 'department-reviews') {
    const deptData = [
      {dept:'Cardiology',emoji:'❤️',avg:'4.9',reviews:items.slice(0,2)},
      {dept:'Dermatology',emoji:'🌿',avg:'4.8',reviews:items.slice(1,3)},
      {dept:'Orthopedics',emoji:'🦴',avg:'4.9',reviews:items.slice(0,1)},
    ];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Reviews by Department'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {deptData.map((d,di)=>(
              <div key={di} style={{border:`1px solid ${p}15`,borderRadius:20,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{padding:'16px 20px',background:`${p}08`,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:24}}>{d.emoji}</span>
                  <div>
                    <div style={{fontWeight:700,color:theme.textColor,fontSize:14}}>{d.dept}</div>
                    <div style={{display:'flex',alignItems:'center',gap:4}}><StarRating rating={5} color={starC}/><span style={{fontSize:11,fontWeight:700,color:p}}>{d.avg}</span></div>
                  </div>
                </div>
                <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
                  {d.reviews.map((t:any,i:number)=>(
                    <div key={i} style={{fontSize:12,color:'#4b5563',lineHeight:1.5,paddingBottom:8,borderBottom:i<d.reviews.length-1?'1px solid #f1f5f9':'none'}}>"{t.text}"<div style={{fontSize:11,color:'#9ca3af',marginTop:3}}>— {t.name}</div></div>
                  ))}
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
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {items.slice(0,3).map((t:any,i:number)=>(
            <div key={i} style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 16px rgba(0,0,0,0.06)'}}>
              <StarRating rating={t.rating||5} color={starC}/>
              <p style={{color:'#374151',lineHeight:1.7,margin:'14px 0 20px',fontSize:14,fontStyle:'italic'}}>"{t.text}"</p>
              <div style={{fontWeight:700,fontSize:13,color:theme.textColor}}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
