'use client';

import React from 'react';
import { Phone, MapPin, Mail, CheckCircle } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function ContactPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'classic';
  const p = theme.primaryColor;

  const Fields = ({compact=false}:{compact?:boolean}) => (
    <div style={{display:'flex',flexDirection:'column',gap:compact?10:12}}>
      {['Your Name','Email Address','Phone Number','Message'].map(f=>(
        <div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:compact?'9px 12px':'11px 16px',fontSize:13,color:'#9ca3af',height:f==='Message'?72:'auto'}}>{f}</div>
      ))}
      <button style={{padding:compact?'11px':'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Send Message</button>
    </div>
  );

  if (variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
            {s.showForm!==false && <Fields/>}
            {s.showDetails!==false && (
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                {s.address && <div style={{display:'flex',gap:14}}><div style={{width:40,height:40,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><MapPin size={18} color={p}/></div><div><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>Address</div><div style={{fontSize:13,color:'#6b7280'}}>{s.address}</div></div></div>}
                {s.phone && <div style={{display:'flex',gap:14}}><div style={{width:40,height:40,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Phone size={18} color={p}/></div><div><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>Phone</div><div style={{fontSize:13,color:'#6b7280'}}>{s.phone}</div></div></div>}
                {s.email && <div style={{display:'flex',gap:14}}><div style={{width:40,height:40,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Mail size={18} color={p}/></div><div><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>Email</div><div style={{fontSize:13,color:'#6b7280'}}>{s.email}</div></div></div>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:0,background:'white',borderRadius:24,overflow:'hidden',boxShadow:'0 8px 48px rgba(0,0,0,0.1)'}}>
            <div style={{background:`linear-gradient(135deg,${p},${theme.secondaryColor})`,padding:40,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
              <div>
                <h3 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:'#fff',marginBottom:12}}>Get in Touch</h3>
                <p style={{color:'rgba(255,255,255,0.75)',fontSize:14,lineHeight:1.7,marginBottom:32}}>We'd love to hear from you. Send us a message and our team will respond promptly.</p>
                {[['📍',s.address||'123 Medical Avenue'],['📞',s.phone||'+1 800 CLINIC'],['✉️',s.email||'info@clinic.com']].map(([icon,val])=>(
                  <div key={val} style={{display:'flex',gap:12,alignItems:'center',marginBottom:16}}>
                    <span style={{fontSize:18}}>{icon}</span><span style={{color:'rgba(255,255,255,0.85)',fontSize:14}}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{padding:40}}><Fields/></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div style={{maxWidth:640,margin:'0 auto',padding:'0 32px'}}>
          <SectionTitle title={s.title||'Contact Us'} subtitle={s.subtitle} theme={theme}/>
          <Fields compact/>
          <div style={{display:'flex',gap:32,marginTop:28,flexWrap:'wrap'}}>
            {s.phone && <span style={{fontSize:14,color:'#6b7280'}}>📞 {s.phone}</span>}
            {s.email && <span style={{fontSize:14,color:'#6b7280'}}>✉️ {s.email}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444',boxShadow:'0 0 0 3px rgba(239,68,68,0.3)'}}/>
                <span style={{color:'#ef4444',fontSize:13,fontWeight:600,letterSpacing:'0.1em'}}>24/7 EMERGENCY LINE</span>
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2.5rem',fontWeight:700,color:'#fff',marginBottom:16}}>{s.emergencyPhone||'1-800-CLINIC'}</h2>
              <p style={{color:'rgba(255,255,255,0.6)',marginBottom:28,fontSize:14}}>{s.title||'Emergency Contact'}</p>
              {[['📍',s.address||'123 Medical Ave'],['✉️',s.email||'emergency@clinic.com']].map(([ic,v])=>(
                <div key={v} style={{display:'flex',gap:10,marginBottom:12}}><span style={{fontSize:16}}>{ic}</span><span style={{fontSize:14,color:'rgba(255,255,255,0.7)'}}>{v}</span></div>
              ))}
            </div>
            <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:32}}>
              {['Your Name','Phone Number','Describe Urgency'].map(f=>(
                <div key={f} style={{border:'1.5px solid rgba(255,255,255,0.15)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:10}}>{f}</div>
              ))}
              <button style={{width:'100%',padding:'13px',borderRadius:10,background:'#ef4444',color:'#fff',fontWeight:700,border:'none',cursor:'pointer',marginTop:4}}>Send Emergency Request</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-location') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Contact Our Locations'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:32}}>
            {[{name:'Main Branch',addr:s.address||'123 Medical Ave',ph:s.phone||'+1 234 567 890'},{name:'Downtown Clinic',addr:'456 Health Street',ph:'+1 234 567 891'}].map((loc,i)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',borderLeft:`4px solid ${p}`}}>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:10}}>{loc.name}</h3>
                <div style={{fontSize:13,color:'#6b7280',marginBottom:6}}>📍 {loc.addr}</div>
                <div style={{fontSize:13,color:'#6b7280'}}>📞 {loc.ph}</div>
              </div>
            ))}
          </div>
          <div style={{background:'white',borderRadius:20,padding:32,boxShadow:'0 4px 20px rgba(0,0,0,0.07)'}}>
            <Fields compact/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'consultation') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
            <div>
              <p style={{fontSize:13,color:p,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12}}>Free Consultation</p>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'Request a Free Consultation'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:24}}>{s.subtitle||'Speak with our experts at no cost. We\'ll help you understand your options.'}</p>
              {['No commitment required','Certified specialists','Confidential consultation'].map(pt=>(
                <div key={pt} style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                  <CheckCircle size={16} color={p}/><span style={{fontSize:14,color:'#374151'}}>{pt}</span>
                </div>
              ))}
            </div>
            <div style={{background:'white',borderRadius:20,padding:32,boxShadow:'0 8px 40px rgba(0,0,0,0.1)'}}>
              <Fields/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // dept-inquiry
  if (variant === 'dept-inquiry') {
    const depts = ['General Medicine','Cardiology','Dermatology','Orthopedics','Pediatrics','Gynecology'];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Department Inquiry'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#6b7280',marginBottom:12}}>Select Department</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
                {depts.map((d,i)=>(
                  <div key={i} style={{padding:'10px 12px',borderRadius:10,border:`1.5px solid ${i===0?p:'#e5e7eb'}`,background:i===0?`${p}08`:'white',cursor:'pointer',fontSize:13,fontWeight:i===0?700:500,color:i===0?p:theme.textColor,display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:i===0?p:'#d1d5db',flexShrink:0}}/>{d}
                  </div>
                ))}
              </div>
              {s.phone && <div style={{background:`${p}08`,borderRadius:12,padding:'14px 18px',display:'flex',gap:10,alignItems:'center'}}>
                <Phone size={16} color={p}/><div><div style={{fontSize:11,color:'#9ca3af'}}>Call Department</div><div style={{fontWeight:700,color:theme.textColor}}>{s.phone}</div></div>
              </div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {['Your Name','Email Address','Phone','Message'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af',height:f==='Message'?80:'auto'}}>{f}</div>)}
              <button style={{padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Send Inquiry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // contact-faq
  if (variant === 'contact-faq') {
    const faqItems = [{q:'How do I book?',a:'Book online or call us.'},{q:'What are your hours?',a:'Mon–Sat 9am–6pm.'},{q:'Do you accept insurance?',a:'Yes, most major plans.'},{q:'How long is a consultation?',a:'Typically 20–30 minutes.'}];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Contact & FAQ'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
            <div>
              <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:20,fontSize:16}}>Send a Message</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {['Your Name','Email Address','Message'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af',height:f==='Message'?80:'auto'}}>{f}</div>)}
                <button style={{padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Send</button>
              </div>
            </div>
            <div>
              <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:20,fontSize:16}}>Common Questions</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {faqItems.map((item,i)=>(
                  <div key={i} style={{border:'1.5px solid #e5e7eb',borderRadius:12,overflow:'hidden'}}>
                    <div style={{padding:'12px 16px',background:i===0?`${p}08`:'#fafafa',fontWeight:600,color:theme.textColor,fontSize:13}}>{item.q}</div>
                    {i===0 && <div style={{padding:'8px 16px 12px',fontSize:13,color:'#6b7280'}}>{item.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // contact-map
  if (variant === 'contact-map') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Contact & Location'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {['Your Name','Email Address','Phone','Message'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af',height:f==='Message'?72:'auto'}}>{f}</div>)}
              <button style={{padding:'12px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Send Message</button>
            </div>
            <div style={{background:'#e2e8f0',borderRadius:20,minHeight:360,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              {s.embedUrl ? <iframe src={s.embedUrl} width="100%" height="360" style={{border:0}} allowFullScreen/>
                : <div style={{textAlign:'center',color:'#94a3b8'}}><MapPin size={40} style={{margin:'0 auto 10px'}}/><div style={{fontSize:13}}>Map Preview</div></div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // doctor-inquiry
  if (variant === 'doctor-inquiry') {
    return (
      <div style={{...css,...padding,background:`${p}06`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Request a Doctor'} subtitle={s.subtitle||"Tell us your needs and we'll match you with the right specialist."} theme={theme}/>
          <div style={{maxWidth:640,margin:'0 auto',background:'white',borderRadius:24,padding:36,boxShadow:'0 8px 40px rgba(0,0,0,0.08)',border:`1px solid ${p}15`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {['Your Name','Phone Number','Email Address','Preferred Doctor'].map(f=><div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af'}}>{f}</div>)}
            </div>
            <div style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9ca3af',height:80,marginBottom:12}}>Describe your condition or query</div>
            <button style={{width:'100%',padding:'13px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>Submit Inquiry</button>
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
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40}}>
          {s.showForm!==false && <Fields/>}
          {s.showDetails!==false && (
            <div>
              {s.address && <div style={{display:'flex',gap:10,marginBottom:14}}><MapPin size={18} color="#9ca3af"/><span style={{fontSize:14,color:'#6b7280'}}>{s.address}</span></div>}
              {s.phone && <div style={{display:'flex',gap:10,marginBottom:14}}><Phone size={18} color="#9ca3af"/><span style={{fontSize:14,color:'#6b7280'}}>{s.phone}</span></div>}
              {s.email && <div style={{display:'flex',gap:10}}><Mail size={18} color="#9ca3af"/><span style={{fontSize:14,color:'#6b7280'}}>{s.email}</span></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
