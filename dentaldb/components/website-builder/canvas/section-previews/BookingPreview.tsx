'use client';

import React from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function BookingPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'classic';
  const p = theme.primaryColor;

  const Cal = () => (
    <div style={{background:'white',borderRadius:12,border:'1.5px solid #e5e7eb',padding:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:13,color:theme.textColor}}>June 2025</span>
        <div style={{display:'flex',gap:4}}>
          {['‹','›'].map(ch=><button key={ch} style={{width:22,height:22,borderRadius:'50%',border:'1px solid #e5e7eb',background:'none',cursor:'pointer',fontSize:11}}>{ch}</button>)}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:'#9ca3af',padding:'3px 0',fontWeight:600}}>{d}</div>)}
        {Array(35).fill(0).map((_,i)=>{const day=i-2;const av=day>0&&day<=30&&day%5!==0;return(
          <div key={i} style={{textAlign:'center',fontSize:11,padding:'4px 2px',borderRadius:5,cursor:av?'pointer':'default',background:day===10?p:'transparent',color:day===10?'#fff':day>0&&day<=30?(av?'#374151':'#d1d5db'):'transparent'}}>
            {day>0&&day<=30?day:''}
          </div>
        );})}
      </div>
    </div>
  );

  if (variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{maxWidth:800,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:28}}>
            <Cal/>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {['Full Name','Phone','Email'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#9ca3af'}}>{f}</div>)}
              <button style={{padding:'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Confirm Appointment</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'full-width') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Book Your Appointment'} subtitle={s.subtitle} theme={theme}/>
          <div style={{background:'white',borderRadius:24,padding:40,boxShadow:'0 8px 48px rgba(0,0,0,0.1)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:24}}>
              {['Select Doctor','Select Service','Select Branch'].map(f=>(
                <div key={f}>
                  <label style={{fontSize:12,fontWeight:600,color:'#6b7280',display:'block',marginBottom:6}}>{f}</label>
                  <div style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'9px 14px',fontSize:13,color:'#9ca3af',display:'flex',justifyContent:'space-between'}}>{f}<ChevronDown size={16}/></div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              <Cal/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:theme.textColor,marginBottom:10}}>Available Slots</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
                  {['9:00','9:30','10:00','10:30','11:00','14:00','14:30'].map(t=>(
                    <span key={t} style={{padding:'6px 14px',borderRadius:6,border:`1.5px solid ${p}40`,color:p,fontSize:12,fontWeight:600,cursor:'pointer'}}>{t}</span>
                  ))}
                </div>
                <div style={{display:'flex',gap:10}}>
                  {['Your Name','Phone'].map(f=><div key={f} style={{flex:1,border:'1.5px solid #e5e7eb',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#9ca3af'}}>{f}</div>)}
                </div>
                <button style={{width:'100%',marginTop:14,padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Book Appointment</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'sidebar-card') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:48,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'Book Your Visit'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:24}}>{s.subtitle||'Choose a convenient time for your appointment.'}</p>
              {[['📞','Call Us','Speak to reception directly'],['💬','WhatsApp','Message us anytime'],['📧','Email','Get a confirmation email']].map(([ic,ti,de])=>(
                <div key={ti} style={{display:'flex',gap:14,alignItems:'center',background:'white',borderRadius:14,padding:'14px 18px',marginBottom:10,boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                  <span style={{fontSize:24}}>{ic}</span>
                  <div><div style={{fontWeight:700,fontSize:14,color:theme.textColor}}>{ti}</div><div style={{fontSize:12,color:'#9ca3af'}}>{de}</div></div>
                </div>
              ))}
            </div>
            <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 8px 40px rgba(0,0,0,0.1)',border:`1px solid ${p}15`}}>
              <h3 style={{fontFamily:theme.fontHeading,fontWeight:700,color:theme.textColor,marginBottom:18,fontSize:15}}>Schedule Appointment</h3>
              <Cal/>
              <div style={{marginTop:14}}>
                {['Patient Name','Phone Number'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'9px 14px',fontSize:12,color:'#9ca3af',marginBottom:10}}>{f}</div>)}
                <button style={{width:'100%',padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Confirm Booking</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'luxury') {
    return (
      <div style={{...css,minHeight:500,background:`linear-gradient(135deg,${p} 0%,${theme.secondaryColor} 100%)`,display:'flex',alignItems:'center'}}>
        <div style={{width:'100%',maxWidth:1100,margin:'0 auto',padding:'60px 32px',display:'grid',gridTemplateColumns:'1fr 420px',gap:64,alignItems:'center'}}>
          <div>
            <div style={{width:40,height:2,background:'rgba(255,255,255,0.6)',marginBottom:20}}/>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2.5rem',fontWeight:300,color:'#fff',lineHeight:1.2,marginBottom:18}}>{s.title||'Reserve Your Appointment'}</h2>
            <p style={{color:'rgba(255,255,255,0.75)',lineHeight:1.7,marginBottom:28}}>{s.subtitle||'Experience world-class care.'}</p>
            {['✓ Expert consultation','✓ State-of-art facilities','✓ Flexible scheduling'].map(t=>(
              <div key={t} style={{color:'rgba(255,255,255,0.85)',fontSize:14,marginBottom:8}}>{t}</div>
            ))}
          </div>
          <div style={{background:'rgba(255,255,255,0.97)',borderRadius:20,padding:32}}>
            <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:18,fontSize:15}}>Book a Consultation</h3>
            {['Full Name','Phone Number','Email Address','Select Service'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af',marginBottom:10}}>{f}</div>)}
            <button style={{width:'100%',padding:'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Request Appointment</button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-step') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Book in 3 Easy Steps'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',justifyContent:'center',gap:0,marginBottom:32}}>
            {['Choose Service','Pick a Time','Your Details'].map((step,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:i===0?p:`${p}30`,color:i===0?'#fff':p,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16}}>{i+1}</div>
                  <div style={{fontSize:12,fontWeight:600,color:i===0?p:'#9ca3af',textAlign:'center',maxWidth:80}}>{step}</div>
                </div>
                {i<2 && <div style={{width:60,height:2,background:`${p}30`,margin:'0 4px',marginBottom:24}}/>}
              </div>
            ))}
          </div>
          <div style={{maxWidth:480,margin:'0 auto',background:'#f8faff',borderRadius:20,padding:32}}>
            <div style={{fontWeight:700,color:theme.textColor,marginBottom:16,fontSize:15}}>Step 1: Choose a Service</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {['General Consultation','Specialist Appointment','Diagnostic Services'].map((svc,i)=>(
                <div key={i} style={{background:'white',border:`2px solid ${i===0?p:'#e5e7eb'}`,borderRadius:12,padding:'12px 16px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:i===0?700:500,color:i===0?p:theme.textColor,fontSize:14}}>{svc}</span>
                  {i===0 && <CheckCircle size={18} color={p}/>}
                </div>
              ))}
            </div>
            <button style={{width:'100%',marginTop:20,padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Continue →</button>
          </div>
        </div>
      </div>
    );
  }

  // doctor-first
  if (variant === 'doctor-first') {
    const doctors = ['Dr. Smith — Cardiology','Dr. Patel — Dermatology','Dr. Chen — Orthopedics','Dr. Lee — Pediatrics'];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Book by Doctor'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#6b7280',marginBottom:12}}>Select a Doctor</div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                {doctors.map((doc,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:12,border:`2px solid ${i===0?p:'#e5e7eb'}`,background:i===0?`${p}06`:'white',cursor:'pointer'}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p,flexShrink:0}}>{doc[3]}</div>
                    <span style={{fontSize:14,fontWeight:i===0?700:500,color:i===0?p:theme.textColor}}>{doc}</span>
                    {i===0 && <CheckCircle size={16} color={p} style={{marginLeft:'auto'}}/>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#6b7280',marginBottom:12}}>Pick Date & Time</div>
              <Cal/>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14,marginBottom:14}}>
                {['10:00','10:30','11:00','14:00','15:00'].map(t=>(
                  <button key={t} style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${p}35`,color:p,fontSize:12,fontWeight:600,background:'white',cursor:'pointer'}}>{t}</button>
                ))}
              </div>
              <button style={{width:'100%',padding:'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Confirm Appointment</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // treatment-first
  if (variant === 'treatment-first') {
    const treatments = ['General Consultation','Dental Checkup','Eye Examination','Skin Treatment','Physiotherapy'];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Book by Treatment'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:28}}>
            {treatments.map((t,i)=>(
              <div key={i} style={{background:i===0?p:'white',borderRadius:14,padding:'14px 16px',textAlign:'center',cursor:'pointer',boxShadow:i===0?`0 6px 20px ${p}40`:'0 2px 8px rgba(0,0,0,0.05)',border:i!==0?`1px solid ${p}15`:'none'}}>
                <div style={{fontSize:13,fontWeight:700,color:i===0?'#fff':theme.textColor}}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 20px rgba(0,0,0,0.07)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              <Cal/>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {['Your Name','Phone Number','Email'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af'}}>{f}</div>)}
                <button style={{padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Book Now</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // emergency-booking
  if (variant === 'emergency-booking') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444',boxShadow:'0 0 0 3px rgba(239,68,68,0.3)'}}/>
                <span style={{color:'#ef4444',fontSize:13,fontWeight:600,letterSpacing:'0.1em'}}>EMERGENCY BOOKING</span>
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:16}}>{s.title||'Need Urgent Care?'}</h2>
              <p style={{color:'rgba(255,255,255,0.6)',marginBottom:28,lineHeight:1.6}}>{s.subtitle||'Book an emergency slot or call us now for immediate assistance.'}</p>
              <div style={{display:'flex',gap:12}}>
                <button style={{padding:'13px 24px',borderRadius:8,background:'#ef4444',color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>📞 Call Now</button>
                <button style={{padding:'13px 24px',borderRadius:8,background:'rgba(255,255,255,0.1)',color:'#fff',fontWeight:600,border:'1px solid rgba(255,255,255,0.2)',cursor:'pointer'}}>WhatsApp</button>
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:28}}>
              <h3 style={{fontWeight:700,color:'#fff',marginBottom:18,fontSize:15}}>Quick Booking Form</h3>
              {['Patient Name','Phone Number','Emergency Type'].map(f=><div key={f} style={{border:'1.5px solid rgba(255,255,255,0.15)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:10}}>{f}</div>)}
              <button style={{width:'100%',padding:'13px',borderRadius:10,background:'#ef4444',color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Request Emergency Slot</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // quick-consult
  if (variant === 'quick-consult') {
    return (
      <div style={{...css,...padding,background:`${p}08`}}>
        <div className={wrapperClass}>
          <div style={{maxWidth:640,margin:'0 auto',background:'white',borderRadius:24,padding:36,boxShadow:'0 8px 40px rgba(0,0,0,0.1)',border:`1px solid ${p}15`}}>
            <div style={{textAlign:'center',marginBottom:24}}>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.6rem',fontWeight:700,color:theme.textColor,marginBottom:8}}>{s.title||'Quick Consultation'}</h2>
              <p style={{color:'#6b7280',fontSize:14}}>{s.subtitle||'Book a 15-minute online or in-person consultation'}</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              {[['💻','Online',true],['🏥','In-Person',false]].map(([ic,lb,sel])=>(
                <div key={lb as string} style={{border:`2px solid ${sel?p:'#e5e7eb'}`,borderRadius:12,padding:'12px 16px',textAlign:'center',cursor:'pointer',background:sel?`${p}08`:'white'}}>
                  <div style={{fontSize:24,marginBottom:4}}>{ic}</div>
                  <div style={{fontWeight:700,color:sel?p:theme.textColor,fontSize:13}}>{lb as string}</div>
                </div>
              ))}
            </div>
            {['Your Name','Phone / WhatsApp','Concern (optional)'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af',marginBottom:10}}>{f}</div>)}
            <button style={{width:'100%',padding:'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Book Quick Consult</button>
          </div>
        </div>
      </div>
    );
  }

  // sticky-cta
  if (variant === 'sticky-cta') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{background:`linear-gradient(135deg,${p},${theme.secondaryColor})`,borderRadius:24,padding:'36px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:32,flexWrap:'wrap',boxShadow:`0 20px 60px ${p}30`}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Book Your Appointment Today'}</h2>
              <p style={{color:'rgba(255,255,255,0.8)',fontSize:15}}>{s.subtitle||'Available Mon–Sat, 9am–6pm. Same-day slots available.'}</p>
              <div style={{display:'flex',gap:20,marginTop:12}}>
                {[['📅','Same-day slots'],['⭐','4.9 rated'],['✓','Certified doctors']].map(([ic,lb])=>(
                  <div key={lb} style={{display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.85)',fontSize:13}}><span>{ic}</span><span>{lb}</span></div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',flexShrink:0}}>
              <button style={{padding:'14px 32px',borderRadius:10,background:'#fff',color:p,fontWeight:700,border:'none',cursor:'pointer',fontSize:15}}>{s.ctaText||'Book Now'}</button>
              <button style={{padding:'14px 24px',borderRadius:10,background:'transparent',color:'#fff',fontWeight:600,border:'2px solid rgba(255,255,255,0.6)',cursor:'pointer'}}>📞 Call Us</button>
            </div>
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
        <div style={{maxWidth:800,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:28}}>
          <Cal/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {['Full Name','Phone','Email'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#9ca3af'}}>{f}</div>)}
            <button style={{padding:'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Confirm Appointment</button>
          </div>
        </div>
      </div>
    </div>
  );
}
