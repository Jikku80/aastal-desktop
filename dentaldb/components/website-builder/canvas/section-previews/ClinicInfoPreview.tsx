'use client';

import React from 'react';
import { Building2, Users, CheckCircle } from 'lucide-react';
import type { PreviewProps } from './types';
import { resolveImg, SectionTitle } from './shared';

export function ClinicInfoPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'modern-card';
  const p = theme.primaryColor;

  if (variant === 'modern-card' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              {s.badge && <span style={{fontSize:11,fontWeight:700,color:p,background:`${p}12`,padding:'4px 12px',borderRadius:999,marginBottom:14,display:'inline-block'}}>{s.badge||'About Us'}</span>}
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:14,lineHeight:1.3}}>{s.title||'About Our Clinic'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.8,marginBottom:24,fontSize:15}}>{s.description||'We provide world-class healthcare services with a patient-first approach. Our team of certified specialists is dedicated to your wellbeing.'}</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:24}}>
                {(s.badges||['ISO Certified','NABH Accredited','Award Winning']).map((b:string,i:number)=>(
                  <span key={i} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:999,background:`${p}08`,border:`1px solid ${p}20`,fontSize:12,color:p,fontWeight:600}}>
                    <CheckCircle size={12}/>{b}
                  </span>
                ))}
              </div>
              {s.ctaText && <button style={{padding:'12px 28px',borderRadius:8,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[{v:s.stat1Val||'15+',l:s.stat1Lbl||'Years Experience',icon:'🏥'},{v:s.stat2Val||'10K+',l:s.stat2Lbl||'Patients Treated',icon:'👥'},{v:s.stat3Val||'50+',l:s.stat3Lbl||'Specialists',icon:'👨‍⚕️'},{v:s.stat4Val||'98%',l:s.stat4Lbl||'Satisfaction',icon:'⭐'}].map((st,i)=>(
                <div key={i} style={{background:`${p}08`,borderRadius:16,padding:'18px 14px',textAlign:'center'}}>
                  <div style={{fontSize:24,marginBottom:6}}>{st.icon}</div>
                  <div style={{fontWeight:800,color:p,fontSize:'1.4rem'}}>{st.v}</div>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:3}}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium-overview') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}06,${p}12)`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:64,alignItems:'start'}}>
            <div>
              <div style={{width:48,height:3,background:p,marginBottom:20}}/>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16,lineHeight:1.2}}>{s.title||'Excellence in Healthcare'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.8,marginBottom:24,fontSize:14}}>{s.description||'Delivering premium healthcare with compassion and precision.'}</p>
              {s.ctaText && <button style={{padding:'11px 24px',borderRadius:6,background:p,color:'#fff',fontWeight:600,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              {[{icon:'🏆',title:s.achieve1||'Award Winning',desc:'Recognized for clinical excellence 5 years running.'},{icon:'🎓',title:s.achieve2||'Certified Doctors',desc:'All specialists are board-certified with advanced training.'},{icon:'🔬',title:s.achieve3||'Advanced Tech',desc:'Latest diagnostic and treatment technology.'},{icon:'❤️',title:s.achieve4||'Patient Care',desc:'Compassionate care tailored to each patient.'},{icon:'🌐',title:s.achieve5||'Global Standards',desc:'JCI and ISO accredited quality systems.'},{icon:'📅',title:s.achieve6||'Easy Access',desc:'Online booking with same-day appointments.'}].map((item,i)=>(
                <div key={i} style={{background:'white',borderRadius:16,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>{item.icon}</div>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:5}}>{item.title}</div>
                  <div style={{fontSize:11,color:'#9ca3af',lineHeight:1.5}}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'founder-message') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:56,alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{width:180,height:180,borderRadius:'50%',background:`${p}15`,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:`4px solid ${p}25`}}>
                {s.founderImage ? <img src={resolveImg(s.founderImage)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Users size={64} color={`${p}50`}/>}
              </div>
              <div style={{fontWeight:700,color:theme.textColor,fontSize:17}}>{s.founderName||'Dr. Founder'}</div>
              <div style={{color:p,fontSize:13,fontWeight:600,marginTop:4}}>{s.founderTitle||'Founder & Medical Director'}</div>
              <div style={{color:'#9ca3af',fontSize:12,marginTop:3}}>{s.founderQual||'MBBS, MD, FRCS'}</div>
            </div>
            <div>
              <div style={{fontSize:60,color:`${p}20`,lineHeight:0.8,marginBottom:16,fontFamily:'Georgia,serif'}}>"</div>
              <p style={{fontSize:'1.1rem',color:'#374151',lineHeight:1.8,fontStyle:'italic',marginBottom:20}}>{s.message||'When I founded this clinic, my vision was simple: to provide the highest quality of care to every patient who walks through our doors, treating each person with the dignity and compassion they deserve.'}</p>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:24,fontSize:14}}>{s.description||'Today, with a team of over 50 specialists, we continue to honor that commitment every single day.'}</p>
              <div style={{display:'flex',gap:24}}>
                {[{v:s.stat1Val||'20+',l:'Years Leading'},{v:s.stat2Val||'50K+',l:'Lives Impacted'}].map((st,i)=>(
                  <div key={i}><div style={{fontWeight:800,color:p,fontSize:'1.5rem'}}>{st.v}</div><div style={{fontSize:12,color:'#9ca3af'}}>{st.l}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'medical-excellence') {
    return (
      <div style={{...css,background:p,overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',top:0,right:0,width:'40%',height:'100%',background:'rgba(255,255,255,0.06)'}}/>
        <div style={{...padding,position:'relative',zIndex:1}}>
          <div className={wrapperClass}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
              <div>
                <p style={{fontSize:12,letterSpacing:'0.15em',color:'rgba(255,255,255,0.7)',fontWeight:700,textTransform:'uppercase',marginBottom:16}}>Medical Excellence</p>
                <h2 style={{fontFamily:theme.fontHeading,fontSize:'2.2rem',fontWeight:700,color:'#fff',marginBottom:20,lineHeight:1.2}}>{s.title||'Setting the Standard in Healthcare'}</h2>
                <p style={{color:'rgba(255,255,255,0.8)',lineHeight:1.8,marginBottom:28,fontSize:15}}>{s.description||'Our commitment to excellence drives everything we do — from our expert team to our cutting-edge facilities.'}</p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:28}}>
                  {(s.badges||['ISO 9001:2015','NABH Accredited','JCI Certified']).map((b:string,i:number)=>(
                    <span key={i} style={{padding:'5px 12px',borderRadius:999,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',fontSize:11,color:'#fff',fontWeight:600}}>✓ {b}</span>
                  ))}
                </div>
                {s.ctaText && <button style={{padding:'12px 28px',borderRadius:8,background:'#fff',color:p,fontWeight:700,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {[{icon:'🏆',t:s.achieve1||'5x Award Winner',d:'Best Healthcare Provider'},{icon:'👨‍⚕️',t:s.achieve2||'50+ Specialists',d:'Board Certified Experts'},{icon:'🔬',t:s.achieve3||'Latest Technology',d:'State-of-the-art facilities'},{icon:'⭐',t:s.achieve4||'98% Satisfaction',d:'From 10,000+ patients'}].map((item,i)=>(
                  <div key={i} style={{display:'flex',gap:14,alignItems:'center',background:'rgba(255,255,255,0.1)',borderRadius:14,padding:'14px 18px',border:'1px solid rgba(255,255,255,0.15)'}}>
                    <span style={{fontSize:24,flexShrink:0}}>{item.icon}</span>
                    <div><div style={{fontWeight:700,color:'#fff',fontSize:14}}>{item.t}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.65)'}}>{item.d}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'split-image-content') {
    return (
      <div style={{...css,display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:480}}>
        <div style={{background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          {s.image ? <img src={resolveImg(s.image)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{textAlign:'center',opacity:0.4}}><Building2 size={80} color={p}/></div>}
        </div>
        <div style={{...padding,display:'flex',alignItems:'center'}}>
          <div>
            {s.badge && <span style={{fontSize:11,fontWeight:700,color:p,background:`${p}12`,padding:'4px 12px',borderRadius:999,marginBottom:14,display:'inline-block'}}>{s.badge}</span>}
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16,lineHeight:1.3}}>{s.title||'About Our Clinic'}</h2>
            <p style={{color:'#6b7280',lineHeight:1.8,marginBottom:24,fontSize:14}}>{s.description||'Dedicated to excellence in patient care since 2008.'}</p>
            <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:24}}>
              {[{v:s.stat1Val||'15+',l:'Years'},{v:s.stat2Val||'10K+',l:'Patients'},{v:s.stat3Val||'50+',l:'Doctors'}].map((st,i)=>(
                <div key={i}><div style={{fontWeight:800,color:p,fontSize:'1.4rem'}}>{st.v}</div><div style={{fontSize:12,color:'#9ca3af'}}>{st.l}</div></div>
              ))}
            </div>
            {s.ctaText && <button style={{padding:'11px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-column-overview') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Why Choose Us'} subtitle={s.subtitle||s.description} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20}}>
            {[{icon:'🏥',title:s.col1Title||'Modern Facilities',desc:s.col1Desc||'State-of-the-art equipment and clean, comfortable treatment rooms.'},{icon:'👨‍⚕️',title:s.col2Title||'Expert Team',desc:s.col2Desc||'Board-certified specialists with decades of combined experience.'},{icon:'❤️',title:s.col3Title||'Patient Focus',desc:s.col3Desc||'Every decision centers on your wellbeing and comfort.'},{icon:'📅',title:s.col4Title||'Easy Booking',desc:s.col4Desc||'Online and phone booking with flexible appointment slots.'}].map((col,i)=>(
              <div key={i} style={{background:'white',borderRadius:18,padding:'24px 20px',textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',borderTop:`4px solid ${p}`}}>
                <div style={{fontSize:36,marginBottom:14}}>{col.icon}</div>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:8,fontSize:14}}>{col.title}</h3>
                <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.6}}>{col.desc}</p>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:8,flexWrap:'wrap',marginTop:28}}>
            {(s.badges||['ISO Certified','NABH Accredited','5-Star Rated']).map((b:string,i:number)=>(
              <span key={i} style={{padding:'6px 14px',borderRadius:999,background:`${p}10`,border:`1px solid ${p}20`,fontSize:12,color:p,fontWeight:600}}>✓ {b}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline-history') {
    const timeline = s.timeline || [
      {year:'2008',event:'Clinic founded with 3 doctors and a vision for accessible healthcare.'},
      {year:'2013',event:'Expanded to 20+ specialists. Added Cardiology and Orthopedics departments.'},
      {year:'2018',event:'Achieved NABH accreditation. Opened second branch downtown.'},
      {year:'2022',event:'Launched digital health platform. Served 50,000+ patients.'},
      {year:'2025',event:'Celebrating 17 years. 5 branches, 50+ doctors, and growing.'},
    ];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Journey'} subtitle={s.subtitle} theme={theme}/>
          <div style={{position:'relative',paddingLeft:56}}>
            <div style={{position:'absolute',left:20,top:8,bottom:8,width:2,background:`linear-gradient(to bottom,${p},${p}40)`}}/>
            {timeline.map((item:any,i:number)=>(
              <div key={i} style={{position:'relative',marginBottom:32,paddingLeft:20}}>
                <div style={{position:'absolute',left:-46,top:4,width:24,height:24,borderRadius:'50%',background:i===0?p:`${p}20`,border:`3px solid ${i===0?'#fff':p}`,boxShadow:i===0?`0 0 0 4px ${p}30`:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {i===0 && <div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                </div>
                <div style={{display:'inline-block',padding:'3px 12px',borderRadius:999,background:`${p}12`,color:p,fontSize:12,fontWeight:700,marginBottom:8}}>{item.year}</div>
                <p style={{color:'#4b5563',lineHeight:1.7,fontSize:14}}>{item.event}</p>
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
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
          <div>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:14}}>{s.title||'About Our Clinic'}</h2>
            <p style={{color:'#6b7280',lineHeight:1.8,fontSize:14}}>{s.description||'We provide world-class healthcare with compassion and precision.'}</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[{v:'15+',l:'Years'},{v:'10K+',l:'Patients'},{v:'50+',l:'Doctors'},{v:'98%',l:'Satisfaction'}].map((st,i)=>(
              <div key={i} style={{background:`${p}08`,borderRadius:14,padding:'16px',textAlign:'center'}}>
                <div style={{fontWeight:800,color:p,fontSize:'1.3rem'}}>{st.v}</div>
                <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{st.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
