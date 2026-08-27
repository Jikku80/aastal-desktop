'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { PreviewProps } from './types';
import { resolveImg, SectionTitle } from './shared';

export function TeamPreview({ s, css, padding, theme, wrapperClass, liveDoctors = [] }: PreviewProps) {
  const variant = s.variant ?? 'cards';
  const cols = (s.columns as number) || 3;
  const p = theme.primaryColor;

  // Use live doctors if dataSource=live-api and we have data, else fall back to manual or placeholders
  const useApiData = s.dataSource !== 'manual' && liveDoctors.length > 0;
  const apiMembers = liveDoctors.map(d => ({
    name: d.name, role: d.specialization || 'Doctor',
    specialization: d.specialization || '', avatar: d.avatar || '', bio: d.bio || '',
  }));
  const members: any[] = useApiData ? apiMembers
    : (s.members as any[])?.length
      ? s.members
      : Array(cols).fill({ name: 'Dr. Expert', role: 'Specialist', specialization: 'General Medicine', avatar: '' });

  const Photo = ({m,sz=80}:{m:any;sz?:number}) => (
    <div style={{width:sz,height:sz,borderRadius:'50%',background:`${p}15`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      {m.avatar ? <img src={resolveImg(m.avatar)} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : <svg width={sz*0.45} height={sz*0.45} viewBox="0 0 24 24" fill="none" stroke={p} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
    </div>
  );

  if (variant === 'cards' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:24,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {members.slice(0,cols*2).map((m:any,i:number)=>(
              <div key={i} style={{textAlign:'center',background:'#f8faff',borderRadius:20,padding:28,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:16}}><Photo m={m} sz={88}/></div>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:4}}>{m.name}</h3>
                <p style={{fontSize:13,fontWeight:600,color:p,marginBottom:4}}>{m.role||m.specialization}</p>
                {m.experience && <p style={{fontSize:12,color:'#9ca3af'}}>{m.experience} yrs exp.</p>}
                {s.showBookButton && <button style={{marginTop:14,padding:'8px 20px',borderRadius:999,border:`2px solid ${p}`,background:'transparent',color:p,fontWeight:600,fontSize:12,cursor:'pointer'}}>Book Appointment</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium-profiles') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:20,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {members.slice(0,cols*2).map((m:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
                <div style={{height:120,background:`linear-gradient(135deg,${p},${theme.secondaryColor})`,position:'relative'}}>
                  <div style={{position:'absolute',bottom:-32,left:'50%',transform:'translateX(-50%)'}}>
                    <div style={{border:'4px solid white',borderRadius:'50%'}}><Photo m={m} sz={72}/></div>
                  </div>
                </div>
                <div style={{textAlign:'center',padding:'44px 20px 24px'}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:4}}>{m.name}</h3>
                  <p style={{fontSize:12,color:p,fontWeight:600,marginBottom:8}}>{m.role||m.specialization}</p>
                  {m.qualification && <p style={{fontSize:11,color:'#9ca3af',marginBottom:12}}>{m.qualification}</p>}
                  {s.showBookButton && <button style={{padding:'8px 20px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:12,border:'none',cursor:'pointer'}}>Book Now</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured-doctor') {
    const featured = members[0] || {};
    const rest = members.slice(1,4);
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginBottom:32}}>
            <div style={{background:`linear-gradient(135deg,${p}08,${p}15)`,borderRadius:24,padding:36,display:'flex',gap:24,alignItems:'center'}}>
              <Photo m={featured} sz={100}/>
              <div>
                <span style={{fontSize:11,color:p,fontWeight:700,background:`${p}15`,padding:'3px 10px',borderRadius:999}}>Featured Doctor</span>
                <h3 style={{fontFamily:theme.fontHeading,fontSize:'1.3rem',fontWeight:700,color:theme.textColor,margin:'8px 0 4px'}}>{featured.name||'Dr. Chief Physician'}</h3>
                <p style={{fontSize:13,color:p,fontWeight:600,marginBottom:8}}>{featured.role||featured.specialization||'Chief Medical Officer'}</p>
                <p style={{fontSize:12,color:'#6b7280',lineHeight:1.5}}>{featured.bio||'20+ years of expertise in advanced medical care.'}</p>
                {s.showBookButton && <button style={{marginTop:14,padding:'8px 20px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:12,border:'none',cursor:'pointer'}}>Book Appointment</button>}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {rest.map((m:any,i:number)=>(
                <div key={i} style={{background:'#f8faff',borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
                  <Photo m={m} sz={52}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:theme.textColor,fontSize:14}}>{m.name}</div>
                    <div style={{fontSize:12,color:p,fontWeight:600}}>{m.role||m.specialization}</div>
                  </div>
                  {s.showBookButton && <button style={{padding:'6px 14px',borderRadius:6,background:'transparent',border:`1.5px solid ${p}`,color:p,fontWeight:600,fontSize:11,cursor:'pointer'}}>Book</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'horizontal-cards') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {members.slice(0,5).map((m:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:'20px 24px',display:'flex',gap:20,alignItems:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <Photo m={m} sz={72}/>
                <div style={{flex:1}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:2}}>{m.name}</h3>
                  <p style={{fontSize:13,color:p,fontWeight:600,marginBottom:4}}>{m.role||m.specialization}</p>
                  {m.qualification && <p style={{fontSize:12,color:'#9ca3af'}}>{m.qualification}</p>}
                </div>
                <div style={{display:'flex',gap:16,textAlign:'center',flexShrink:0}}>
                  {m.experience && <div><div style={{fontWeight:800,color:p,fontSize:16}}>{m.experience}+</div><div style={{fontSize:11,color:'#9ca3af'}}>Yrs</div></div>}
                </div>
                {s.showBookButton && <button style={{padding:'9px 20px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer',flexShrink:0}}>Book</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'luxury-cosmetic-specialists') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <div style={{width:40,height:1,background:theme.accentColor,margin:'0 auto 16px'}}/>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2.2rem',fontWeight:300,color:'#fff',letterSpacing:'-0.02em',marginBottom:10}}>{s.title||'Our Specialists'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)',fontSize:15}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gap:24,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {members.slice(0,cols*2).map((m:any,i:number)=>(
              <div key={i} style={{border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,overflow:'hidden',background:'rgba(255,255,255,0.04)'}}>
                <div style={{height:200,background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {m.avatar ? <img src={resolveImg(m.avatar)} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Users size={60} color="rgba(255,255,255,0.2)"/>}
                </div>
                <div style={{padding:'20px 24px'}}>
                  <h3 style={{fontWeight:700,color:'#fff',marginBottom:4}}>{m.name}</h3>
                  <p style={{fontSize:12,color:theme.accentColor||p,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>{m.role||m.specialization}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'department-groups') {
    const depts = s.departments || [{name:'Cardiology',members:members.slice(0,2)},{name:'Orthopedics',members:members.slice(0,2)}];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          {depts.map((dept:any,di:number)=>(
            <div key={di} style={{marginBottom:40}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                <h3 style={{fontFamily:theme.fontHeading,fontSize:'1.2rem',fontWeight:700,color:theme.textColor}}>{dept.name}</h3>
                <div style={{flex:1,height:1,background:'#e5e7eb'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:14}}>
                {(dept.members||members.slice(0,3)).map((m:any,i:number)=>(
                  <div key={i} style={{background:'white',borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                    <Photo m={m} sz={52}/>
                    <div>
                      <div style={{fontWeight:700,color:theme.textColor,fontSize:14}}>{m.name}</div>
                      <div style={{fontSize:12,color:p}}>{m.role||m.specialization}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gridTemplateRows:'auto auto',gap:16}}>
            {members.slice(0,5).map((m:any,i:number)=>(
              <div key={i} style={{borderRadius:20,overflow:'hidden',background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:'#f8faff',gridColumn:i===0?'span 2':undefined,boxShadow:i===0?`0 8px 32px ${p}30`:'0 2px 8px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',alignItems:'center',padding:24,gap:12}}>
                <div style={{border:i===0?'3px solid rgba(255,255,255,0.4)':'3px solid transparent',borderRadius:'50%'}}><Photo m={m} sz={i===0?90:64}/></div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontWeight:700,color:i===0?'#fff':theme.textColor,fontSize:i===0?16:14}}>{m.name}</div>
                  <div style={{fontSize:12,color:i===0?'rgba(255,255,255,0.75)':p,fontWeight:600,marginTop:2}}>{m.role||m.specialization}</div>
                </div>
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
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,overflowX:'auto',paddingBottom:8}}>
            {members.map((m:any,i:number)=>(
              <div key={i} style={{minWidth:220,background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',flexShrink:0}}>
                <div style={{height:180,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {m.avatar ? <img src={resolveImg(m.avatar)} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Users size={56} color={`${p}40`}/>}
                </div>
                <div style={{padding:'18px 20px'}}>
                  <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:3,fontSize:15}}>{m.name}</h3>
                  <p style={{fontSize:12,color:p,fontWeight:600,marginBottom:6}}>{m.role||m.specialization}</p>
                  {m.qualification && <p style={{fontSize:11,color:'#9ca3af',marginBottom:10}}>{m.qualification}</p>}
                  {s.showBookButton && <button style={{width:'100%',padding:'8px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:12,border:'none',cursor:'pointer'}}>Book</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // team-wall
  if (variant === 'team-wall') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
            {[...members,...members,...members].slice(0,10).map((m:any,i:number)=>(
              <div key={i} style={{textAlign:'center',cursor:'pointer'}}>
                <div style={{width:'100%',aspectRatio:'1',borderRadius:16,overflow:'hidden',background:`${p}${12+i*4}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                  {m.avatar ? <img src={resolveImg(m.avatar)} alt={m.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Users size={28} color={`${p}50`}/>}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:theme.textColor,marginBottom:2}}>{m.name}</div>
                <div style={{fontSize:10,color:p,fontWeight:600}}>{m.role||m.specialization}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // medical-board
  if (variant === 'medical-board') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Medical Advisory Board'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {members.slice(0,5).map((m:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:'20px 28px',display:'flex',gap:20,alignItems:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:`1px solid ${p}10`}}>
                <Photo m={m} sz={64}/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                    <h3 style={{fontWeight:700,color:theme.textColor,fontSize:15}}>{m.name}</h3>
                    {m.qualification && <span style={{fontSize:11,background:`${p}12`,color:p,padding:'2px 8px',borderRadius:999,fontWeight:600}}>{m.qualification}</span>}
                  </div>
                  <p style={{fontSize:13,color:p,fontWeight:600,marginBottom:4}}>{m.role||m.specialization}</p>
                  {m.bio && <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5}}>{m.bio}</p>}
                </div>
                {m.experience && <div style={{textAlign:'center',flexShrink:0,padding:'12px 16px',background:`${p}08`,borderRadius:12}}>
                  <div style={{fontWeight:800,color:p,fontSize:18}}>{m.experience}+</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>yrs exp</div>
                </div>}
                {s.showBookButton && <button style={{padding:'9px 18px',borderRadius:8,background:'transparent',border:`1.5px solid ${p}`,color:p,fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0}}>Book</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // multi-location-listing
  if (variant === 'multi-location-listing') {
    const locs = s.locations || ['Main Branch','Downtown','North Suburb'];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Find a Doctor Near You'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:28,justifyContent:'center'}}>
            {locs.map((loc:string,i:number)=>(
              <button key={i} style={{padding:'7px 18px',borderRadius:999,border:`1.5px solid ${i===0?p:'#e5e7eb'}`,background:i===0?p:'white',color:i===0?'#fff':theme.textColor,fontWeight:600,fontSize:12,cursor:'pointer'}}>{loc}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:16}}>
            {members.slice(0,cols*2).map((m:any,i:number)=>(
              <div key={i} style={{background:'#f8faff',borderRadius:14,padding:'16px 18px',display:'flex',gap:12,alignItems:'center',border:`1px solid ${p}10`}}>
                <Photo m={m} sz={52}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:14,marginBottom:2}}>{m.name}</div>
                  <div style={{fontSize:12,color:p,fontWeight:600,marginBottom:2}}>{m.role||m.specialization}</div>
                  {m.location && <div style={{fontSize:11,color:'#9ca3af'}}>📍 {m.location}</div>}
                </div>
                {s.showBookButton && <button style={{padding:'6px 12px',borderRadius:6,background:p,color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:'pointer',flexShrink:0}}>Book</button>}
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
        <div style={{display:'grid',gap:24,gridTemplateColumns:`repeat(${cols},1fr)`}}>
          {members.slice(0,cols*2).map((m:any,i:number)=>(
            <div key={i} style={{textAlign:'center',background:'#f8faff',borderRadius:20,padding:28}}>
              <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><Photo m={m} sz={80}/></div>
              <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:4}}>{m.name}</h3>
              <p style={{fontSize:13,color:p,fontWeight:600}}>{m.role||m.specialization}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
