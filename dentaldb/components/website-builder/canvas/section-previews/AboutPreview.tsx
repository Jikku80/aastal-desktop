'use client';

import React from 'react';
import { Building2, Users } from 'lucide-react';
import type { PreviewProps } from './types';
import { resolveImg, SectionTitle } from './shared';

export function AboutPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'split';
  const p = theme.primaryColor;

  if (variant === 'split' || variant === 'classic') {
    const isRight = s.layout !== 'image-left';
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',gap:48,alignItems:'center',flexDirection:isRight?'row':'row-reverse',flexWrap:'wrap'}}>
            <div style={{flex:'0 0 45%',aspectRatio:'4/3',borderRadius:16,background:'#f1f5f9',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {s.image ? <img src={resolveImg(s.image)} alt="about" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Building2 size={48} color="#cbd5e1"/>}
            </div>
            <div style={{flex:1,minWidth:280}}>
              {s.subtitle && <p style={{color:p,fontWeight:600,fontSize:13,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8}}>{s.subtitle}</p>}
              {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title}</h2>}
              <p style={{color:'#6b7280',lineHeight:1.7}}>{s.body||'About our clinic...'}</p>
              {s.showStats && s.stats?.length > 0 && (
                <div style={{display:'flex',gap:24,marginTop:24,flexWrap:'wrap'}}>
                  {s.stats.map((st:any,i:number)=>(
                    <div key={i}><div style={{fontSize:'1.5rem',fontWeight:800,color:p}}>{st.value}</div><div style={{fontSize:12,color:'#9ca3af'}}>{st.label}</div></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline') {
    const milestones = s.milestones || [
      {year:'2008',title:'Clinic Founded',desc:'Opened our first branch with a dedicated team.'},
      {year:'2013',title:'Expanded Services',desc:'Added specialist departments and advanced equipment.'},
      {year:'2019',title:'NABH Accreditation',desc:'Achieved national accreditation for quality standards.'},
      {year:'2024',title:'10,000+ Patients',desc:'Proudly serving thousands of families.'},
    ];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{position:'relative',paddingLeft:40}}>
            <div style={{position:'absolute',left:15,top:0,bottom:0,width:2,background:`${p}30`}}/>
            {milestones.map((m:any,i:number)=>(
              <div key={i} style={{position:'relative',marginBottom:32,paddingLeft:32}}>
                <div style={{position:'absolute',left:-10,top:4,width:20,height:20,borderRadius:'50%',background:p,border:'3px solid #fff',boxShadow:`0 0 0 3px ${p}30`}}/>
                <div style={{fontSize:13,fontWeight:700,color:p,marginBottom:4}}>{m.year}</div>
                <div style={{fontWeight:700,color:theme.textColor,marginBottom:4}}>{m.title}</div>
                <div style={{fontSize:14,color:'#6b7280'}}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mission-vision') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Mission & Vision'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24}}>
            {[{icon:'🎯',title:'Our Mission',text:s.mission||'To provide exceptional, patient-centered healthcare.'},
              {icon:'👁️',title:'Our Vision',text:s.vision||'To be the most trusted healthcare provider.'},
              {icon:'❤️',title:'Our Values',text:s.values||'Compassion, excellence, integrity and innovation.'}
            ].map((item,i)=>(
              <div key={i} style={{background:'#f8faff',borderRadius:16,padding:28,borderTop:`4px solid ${p}`}}>
                <div style={{fontSize:36,marginBottom:16}}>{item.icon}</div>
                <h3 style={{fontFamily:theme.fontHeading,fontSize:'1.1rem',fontWeight:700,color:theme.textColor,marginBottom:10}}>{item.title}</h3>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.6}}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'founder-spotlight') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08 0%,white 100%)`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:56,alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{width:200,height:200,borderRadius:'50%',background:`${p}15`,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:`4px solid ${p}30`}}>
                {s.founderImage ? <img src={resolveImg(s.founderImage)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Users size={64} color={`${p}60`}/>}
              </div>
              <div style={{fontWeight:700,color:theme.textColor,fontSize:18}}>{s.founderName||'Dr. Founder'}</div>
              <div style={{color:p,fontSize:13,fontWeight:600}}>{s.founderTitle||'Founder & Chief Physician'}</div>
              <div style={{color:'#9ca3af',fontSize:12,marginTop:4}}>{s.founderQualification||'MBBS, MD, FRCS'}</div>
            </div>
            <div>
              <p style={{fontSize:13,color:p,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12}}>A Message From Our Founder</p>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'Our Clinic, Our Promise'}</h2>
              <p style={{color:'#4b5563',lineHeight:1.8,fontSize:15,fontStyle:'italic',borderLeft:`3px solid ${p}`,paddingLeft:20,marginBottom:16}}>
                "{s.founderQuote||'Every patient who walks through our doors deserves the very best in care. That has been my promise since day one.'}"
              </p>
              <p style={{color:'#6b7280',lineHeight:1.7}}>{s.body||'Our clinic was founded with a single purpose: to provide world-class healthcare with genuine compassion.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stats-integrated') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
            <div>
              {s.subtitle && <p style={{color:p,fontWeight:600,fontSize:13,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>{s.subtitle}</p>}
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2.2rem',fontWeight:700,color:theme.textColor,marginBottom:18}}>{s.title||'About Our Clinic'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:28}}>{s.body||'We are committed to delivering the highest standard of care.'}</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {[{val:'15+',lbl:'Years Experience',icon:'🏥'},{val:'10K+',lbl:'Patients Treated',icon:'👥'},{val:'50+',lbl:'Specialists',icon:'👨‍⚕️'},{val:'98%',lbl:'Satisfaction Rate',icon:'⭐'}].map((st,i)=>(
                  <div key={i} style={{background:`${p}08`,borderRadius:12,padding:'16px 18px',display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:24}}>{st.icon}</span>
                    <div><div style={{fontWeight:800,color:p,fontSize:20}}>{st.val}</div><div style={{fontSize:12,color:'#9ca3af'}}>{st.lbl}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{aspectRatio:'3/4',borderRadius:20,overflow:'hidden',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {s.image ? <img src={resolveImg(s.image)} alt="about" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Building2 size={64} color="#cbd5e1"/>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-column') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24,marginBottom:40}}>
            {[{icon:'🏥',title:'World-Class Facilities',text:'State-of-the-art equipment and modern treatment rooms.'},
              {icon:'👨‍⚕️',title:'Expert Medical Team',text:'Board-certified specialists with decades of combined experience.'},
              {icon:'❤️',title:'Patient-First Approach',text:'Every decision we make puts your wellbeing first.'}
            ].map((item,i)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:28,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{fontSize:32,marginBottom:12}}>{item.icon}</div>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:8}}>{item.title}</h3>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.6}}>{item.text}</p>
              </div>
            ))}
          </div>
          <p style={{color:'#6b7280',lineHeight:1.7,maxWidth:700,margin:'0 auto',textAlign:'center',fontSize:15}}>{s.body||'Our clinic has been serving the community with dedication and excellence.'}</p>
        </div>
      </div>
    );
  }

  if (variant === 'awards') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
            <div>
              {s.subtitle && <p style={{color:p,fontWeight:600,fontSize:13,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>{s.subtitle}</p>}
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'Recognized Excellence'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:28}}>{s.body||'Our commitment to quality care has been recognized with numerous awards and certifications.'}</p>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                {['ISO 9001:2015','NABH Accredited','Best Clinic 2023','Patient Choice Award'].map(aw=>(
                  <span key={aw} style={{padding:'6px 14px',borderRadius:999,background:`${p}10`,color:p,fontSize:12,fontWeight:600,border:`1px solid ${p}25`}}>{aw}</span>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {[{icon:'🏆',title:'Best Hospital',sub:'2023 Regional Award'},{icon:'⭐',title:'Top Rated',sub:'4.9 Patient Score'},{icon:'🛡️',title:'ISO Certified',sub:'Quality Management'},{icon:'🎓',title:'Training Centre',sub:'Medical Education'}].map((aw,i)=>(
                <div key={i} style={{background:'#f8faff',borderRadius:16,padding:20,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                  <div style={{fontSize:32,marginBottom:8}}>{aw.icon}</div>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:13}}>{aw.title}</div>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{aw.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // story-layout
  if (variant === 'story-layout') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
            <div>
              <p style={{fontSize:13,color:p,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>Our Story</p>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2.2rem',fontWeight:700,color:theme.textColor,lineHeight:1.2,marginBottom:20}}>{s.title||'How We Started'}</h2>
              <div style={{width:48,height:3,background:p,marginBottom:20}}/>
              <p style={{color:'#6b7280',lineHeight:1.8,marginBottom:16,fontSize:15}}>{s.body||'Our clinic was founded with a vision to make premium healthcare accessible to all.'}</p>
              {s.body2 && <p style={{color:'#6b7280',lineHeight:1.8,fontSize:15}}>{s.body2}</p>}
              {s.ctaText && <button style={{marginTop:24,padding:'11px 28px',borderRadius:8,background:p,color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
            </div>
            <div style={{position:'relative'}}>
              <div style={{aspectRatio:'4/5',borderRadius:24,overflow:'hidden',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {s.image ? <img src={resolveImg(s.image)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Building2 size={64} color={`${p}40`}/>}
              </div>
              <div style={{position:'absolute',bottom:-20,right:-20,background:'white',borderRadius:16,padding:'18px 22px',boxShadow:'0 8px 32px rgba(0,0,0,0.12)',border:`1px solid ${p}15`}}>
                <div style={{fontSize:'1.8rem',fontWeight:800,color:p}}>{s.yearsExp||'15'}+</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>Years of Care</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // image-gallery-style
  if (variant === 'image-gallery-style') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:32}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{aspectRatio:'4/3',borderRadius:14,overflow:'hidden',background:`${p}${15+i*8}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Building2 size={36} color={`${p}50`}/>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:40,alignItems:'center'}}>
            <p style={{color:'#6b7280',lineHeight:1.8,fontSize:15}}>{s.body||'We believe in delivering world-class care in a welcoming environment where patients feel at home.'}</p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[{v:'10K+',l:'Patients'},{v:'15+',l:'Specialists'},{v:'98%',l:'Satisfaction'}].map((st,i)=>(
                <div key={i} style={{background:'white',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                  <div style={{fontWeight:800,color:p,fontSize:20,minWidth:50}}>{st.v}</div>
                  <div style={{fontSize:13,color:'#6b7280'}}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  const isRight = s.layout !== 'image-left';
  return (
    <div style={{...css,...padding,background:'white'}}>
      <div className={wrapperClass}>
        <div style={{display:'flex',gap:48,alignItems:'center',flexDirection:isRight?'row':'row-reverse',flexWrap:'wrap'}}>
          <div style={{flex:'0 0 45%',aspectRatio:'4/3',borderRadius:16,background:'#f1f5f9',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {s.image ? <img src={resolveImg(s.image)} alt="about" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Building2 size={48} color="#cbd5e1"/>}
          </div>
          <div style={{flex:1}}>
            {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:12}}>{s.title}</h2>}
            <p style={{color:'#6b7280',lineHeight:1.7}}>{s.body||'About our clinic...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
