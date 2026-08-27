'use client';

import React from 'react';
import { Stethoscope, Users, ArrowRight, Zap } from 'lucide-react';
import type { PreviewProps } from './types';
import { resolveImg } from './shared';

export function HeroPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'classic';
  const MIN_H: Record<string,string> = { small:'200px', medium:'360px', large:'480px', 'full-screen':'600px', fullscreen:'600px' };
  const minH = MIN_H[s.minHeight ?? 'large'] ?? '480px';
  const hasCover = !!s.coverImage;
  const bg = hasCover ? `url(${resolveImg(s.coverImage)}) center/cover`
    : s.backgroundType === 'gradient' ? s.backgroundValue
    : s.backgroundType === 'image' ? `url(${resolveImg(s.backgroundValue)}) center/cover`
    : s.backgroundValue || theme.primaryColor;
  const rawOv = hasCover ? (s.coverOverlay ?? 40) : (s.backgroundOverlay ?? 0);
  const ov = hasCover && s.forceDarkOverlay ? Math.max(rawOv,55)/100 : rawOv/100;
  const hl = s.headline || 'Welcome to Our Clinic';
  const sub = s.subheadline as string;
  const cta = s.ctaText as string;
  const sec = s.secondaryCtaText as string;
  const p = theme.primaryColor; const a = theme.accentColor;

  const Overlay = () => ov > 0 ? <div style={{position:'absolute',inset:0,background:`rgba(0,0,0,${ov})`}} /> : null;
  const PBtn = ({label,bg:b,color:c}:{label:string;bg?:string;color?:string}) => (
    <span style={{display:'inline-block',padding:'12px 28px',borderRadius:8,background:b||a,color:c||'#fff',fontWeight:700,fontSize:15,cursor:'pointer',flexShrink:0}}>{label}</span>
  );
  const OBtn = ({label}:{label:string}) => (
    <span style={{display:'inline-block',padding:'11px 28px',borderRadius:8,border:'2px solid rgba(255,255,255,0.7)',color:'#fff',fontWeight:600,fontSize:15,cursor:'pointer',flexShrink:0}}>{label}</span>
  );

  // 1. classic
  if (variant === 'classic') {
    const ALIGN: Record<string,string> = {center:'items-center text-center',left:'items-start text-left',right:'items-end text-right'};
    const align = ALIGN[s.layout ?? 'center'] ?? 'items-center text-center';
    return (
      <div style={{...css,...padding,background:bg,minHeight:minH,position:'relative'}} className="flex items-center justify-center overflow-hidden">
        <Overlay />
        <div className={`relative z-10 flex flex-col ${align} gap-4 px-8 py-12 w-full max-w-4xl mx-auto`}>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'2.5rem',fontWeight:700,color:s.headlineColor??'#fff'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.25rem',color:'rgba(255,255,255,0.9)',maxWidth:'36rem'}}>{sub}</p>}
          <div className="flex flex-wrap gap-3 mt-2">{cta&&<PBtn label={cta}/>}{sec&&<OBtn label={sec}/>}</div>
        </div>
      </div>
    );
  }

  // 2. split-screen
  if (variant === 'split-screen') {
    return (
      <div style={{...css,minHeight:minH,display:'flex',overflow:'hidden'}}>
        <div style={{flex:1,background:p,display:'flex',alignItems:'center',padding:'60px 48px'}}>
          <div>
            {s.badge && <span style={{display:'inline-block',padding:'4px 14px',borderRadius:999,background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:12,fontWeight:600,marginBottom:16}}>{s.badge}</span>}
            <h1 style={{fontFamily:theme.fontHeading,fontSize:'2.8rem',fontWeight:800,color:'#fff',lineHeight:1.15,marginBottom:16}}>{hl}</h1>
            {sub && <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.8)',lineHeight:1.6,marginBottom:28,maxWidth:420}}>{sub}</p>}
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {cta && <span style={{padding:'13px 30px',borderRadius:8,background:'#fff',color:p,fontWeight:700,fontSize:15,cursor:'pointer'}}>{cta}</span>}
              {sec && <OBtn label={sec}/>}
            </div>
            {s.trustLine && <p style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:20}}>✓ {s.trustLine}</p>}
          </div>
        </div>
        <div style={{flex:1,background:hasCover?bg:`${theme.secondaryColor}22`,backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {!hasCover && <div style={{opacity:0.3}}><Stethoscope size={80} color={p}/></div>}
        </div>
      </div>
    );
  }

  // 3. appointment-focused
  if (variant === 'appointment-focused') {
    return (
      <div style={{...css,...padding,background:bg,minHeight:minH,position:'relative',display:'flex',alignItems:'center'}}>
        <Overlay/>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:48,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:300}}>
            <h1 style={{fontFamily:theme.fontHeading,fontSize:'3rem',fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:16}}>{hl}</h1>
            {sub && <p style={{fontSize:'1.15rem',color:'rgba(255,255,255,0.85)',marginBottom:24}}>{sub}</p>}
            <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
              {[['⭐','4.9/5 Rating'],['👥','10,000+ Patients'],['🏆','Certified']].map(([ic,tx])=>(
                <div key={tx} style={{display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.9)',fontSize:13}}><span>{ic}</span><span>{tx}</span></div>
              ))}
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.97)',borderRadius:16,padding:'28px 24px',width:320,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',flexShrink:0}}>
            <h3 style={{fontFamily:theme.fontHeading,fontSize:18,fontWeight:700,color:theme.textColor,marginBottom:16}}>Book Appointment</h3>
            {['Your Name','Phone Number','Service'].map(f=>(
              <div key={f} style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:13,color:'#9ca3af'}}>{f}</div>
            ))}
            <div style={{border:'1.5px solid #e5e7eb',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#9ca3af'}}>Select Date</div>
            <button style={{width:'100%',padding:'13px',borderRadius:8,background:p,color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>{cta||'Confirm Booking'}</button>
          </div>
        </div>
      </div>
    );
  }

  // 4. doctor-spotlight
  if (variant === 'doctor-spotlight') {
    return (
      <div style={{...css,minHeight:minH,background:`linear-gradient(135deg,${p} 0%,${theme.secondaryColor} 100%)`,display:'flex',alignItems:'center',overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',right:0,top:0,width:'45%',height:'100%',background:'rgba(255,255,255,0.06)'}}/>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1200,margin:'0 auto',padding:'60px 32px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
          <div>
            <div style={{display:'inline-block',padding:'4px 14px',borderRadius:999,background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:12,fontWeight:600,marginBottom:20}}>⚕️ Expert Medical Care</div>
            <h1 style={{fontFamily:theme.fontHeading,fontSize:'2.8rem',fontWeight:800,color:'#fff',lineHeight:1.15,marginBottom:18}}>{hl}</h1>
            {sub && <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.8)',lineHeight:1.6,marginBottom:28}}>{sub}</p>}
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {cta && <span style={{padding:'13px 30px',borderRadius:8,background:'#fff',color:p,fontWeight:700,cursor:'pointer'}}>{cta}</span>}
              {sec && <OBtn label={sec}/>}
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'center'}}>
            <div style={{width:280,height:320,borderRadius:20,background:'rgba(255,255,255,0.15)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.2)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24}}>
              <div style={{width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><Users size={40} color="rgba(255,255,255,0.8)"/></div>
              <div style={{textAlign:'center'}}>
                <div style={{fontWeight:700,color:'#fff',fontSize:16}}>{s.doctorName||'Dr. Expert'}</div>
                <div style={{color:'rgba(255,255,255,0.7)',fontSize:13}}>{s.doctorTitle||'Chief Medical Officer'}</div>
              </div>
              <div style={{display:'flex',gap:16}}>
                {[['15+','Yrs Exp'],['5K+','Patients']].map(([v,l])=>(
                  <div key={l} style={{textAlign:'center'}}><div style={{fontWeight:800,color:'#fff',fontSize:18}}>{v}</div><div style={{color:'rgba(255,255,255,0.6)',fontSize:11}}>{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. luxury-cosmetic
  if (variant === 'luxury-cosmetic') {
    return (
      <div style={{...css,minHeight:minH,background:bg,position:'relative',overflow:'hidden',display:'flex',alignItems:'center'}}>
        <Overlay/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,rgba(0,0,0,0.7) 50%,transparent)',zIndex:1}}/>
        <div style={{position:'relative',zIndex:10,maxWidth:700,padding:'80px 64px'}}>
          <div style={{width:40,height:2,background:a,marginBottom:24}}/>
          <p style={{fontSize:13,letterSpacing:'0.2em',textTransform:'uppercase',color:a,fontWeight:600,marginBottom:16}}>Premium Aesthetic Medicine</p>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3.5rem',fontWeight:300,color:'#fff',lineHeight:1.1,marginBottom:20,letterSpacing:'-0.02em'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.75)',lineHeight:1.7,marginBottom:36,maxWidth:480}}>{sub}</p>}
          <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
            {cta && <span style={{padding:'14px 36px',background:a,color:'#fff',fontWeight:600,borderRadius:2,cursor:'pointer',letterSpacing:'0.05em',fontSize:14}}>{cta}</span>}
            {sec && <span style={{color:'rgba(255,255,255,0.8)',fontSize:14,cursor:'pointer'}}>{sec} →</span>}
          </div>
        </div>
      </div>
    );
  }

  // 6. gradient-saas
  if (variant === 'gradient-saas') {
    return (
      <div style={{...css,...padding,minHeight:minH,background:`radial-gradient(ellipse at 70% 50%,${p}22 0%,transparent 60%),linear-gradient(135deg,#f8faff 0%,#eef4ff 100%)`,display:'flex',alignItems:'center'}}>
        <div style={{width:'100%',maxWidth:1100,margin:'0 auto',padding:'0 32px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:999,background:`${p}15`,border:`1px solid ${p}30`,marginBottom:24}}>
            <Zap size={14} color={p}/><span style={{fontSize:13,color:p,fontWeight:600}}>Trusted by 10,000+ Patients</span>
          </div>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3.5rem',fontWeight:800,color:theme.textColor,lineHeight:1.1,marginBottom:20,maxWidth:800,margin:'0 auto 20px'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.2rem',color:'#6b7280',lineHeight:1.6,marginBottom:36,maxWidth:560,margin:'0 auto 36px'}}>{sub}</p>}
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            {cta && <span style={{padding:'14px 32px',borderRadius:10,background:p,color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer',boxShadow:`0 8px 24px ${p}40`}}>{cta}</span>}
            {sec && <span style={{padding:'14px 32px',borderRadius:10,border:`2px solid ${p}40`,color:p,fontWeight:600,fontSize:16,cursor:'pointer'}}>{sec}</span>}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:32,marginTop:48,flexWrap:'wrap'}}>
            {[['10,000+','Patients'],['50+','Specialists'],['15+','Years'],['98%','Satisfaction']].map(([v,l])=>(
              <div key={l} style={{textAlign:'center'}}><div style={{fontSize:'1.8rem',fontWeight:800,color:p}}>{v}</div><div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 7. emergency-care
  if (variant === 'emergency-care') {
    return (
      <div style={{...css,minHeight:minH,background:'#0f172a',position:'relative',overflow:'hidden',display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'#ef4444'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 30% 50%,rgba(239,68,68,0.1) 0%,transparent 50%)'}}/>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1100,margin:'0 auto',padding:'60px 32px',display:'grid',gridTemplateColumns:'1fr auto',gap:48,alignItems:'center'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444',boxShadow:'0 0 0 3px rgba(239,68,68,0.3)'}}/>
              <span style={{color:'#ef4444',fontSize:13,fontWeight:600,letterSpacing:'0.1em'}}>24/7 EMERGENCY CARE</span>
            </div>
            <h1 style={{fontFamily:theme.fontHeading,fontSize:'3rem',fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:18}}>{hl}</h1>
            {sub && <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.7)',lineHeight:1.6,marginBottom:32}}>{sub}</p>}
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {cta && <span style={{padding:'14px 32px',borderRadius:8,background:'#ef4444',color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer'}}>{cta}</span>}
              {sec && <span style={{padding:'14px 32px',borderRadius:8,border:'2px solid rgba(255,255,255,0.3)',color:'#fff',fontWeight:600,cursor:'pointer'}}>{sec}</span>}
            </div>
          </div>
          <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:16,padding:'28px 24px',textAlign:'center',minWidth:200}}>
            <div style={{fontSize:40,marginBottom:8}}>🚨</div>
            <div style={{color:'#ef4444',fontWeight:800,fontSize:22}}>Call Now</div>
            <div style={{color:'#fff',fontSize:20,fontWeight:700,marginTop:4}}>{s.emergencyPhone||'1-800-CLINIC'}</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:8}}>Available 24 hours</div>
          </div>
        </div>
      </div>
    );
  }

  // 8. children-clinic
  if (variant === 'children-clinic') {
    return (
      <div style={{...css,...padding,minHeight:minH,background:'linear-gradient(135deg,#fef9ec 0%,#fce7f3 50%,#eff6ff 100%)',display:'flex',alignItems:'center'}}>
        <div style={{width:'100%',maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
          <div>
            <div style={{fontSize:48,marginBottom:16}}>👶🏽</div>
            <h1 style={{fontFamily:theme.fontHeading,fontSize:'2.8rem',fontWeight:800,color:'#1e293b',lineHeight:1.15,marginBottom:18}}>{hl}</h1>
            {sub && <p style={{fontSize:'1.1rem',color:'#64748b',lineHeight:1.6,marginBottom:28}}>{sub}</p>}
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {cta && <span style={{padding:'13px 28px',borderRadius:999,background:p,color:'#fff',fontWeight:700,cursor:'pointer',boxShadow:`0 6px 20px ${p}40`}}>{cta}</span>}
              {sec && <span style={{padding:'13px 28px',borderRadius:999,border:`2px solid ${p}`,color:p,fontWeight:600,cursor:'pointer'}}>{sec}</span>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[['🩺','Pediatric Care'],['💊','Vaccinations'],['🧸','Friendly Doctors'],['📋','Health Checkups']].map(([ic,tx])=>(
              <div key={tx} style={{background:'#fff',borderRadius:16,padding:'20px 16px',textAlign:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.06)'}}>
                <div style={{fontSize:28,marginBottom:8}}>{ic}</div><div style={{fontSize:13,fontWeight:600,color:'#374151'}}>{tx}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 9. trust-focused
  if (variant === 'trust-focused') {
    return (
      <div style={{...css,minHeight:minH,background:bg,position:'relative',overflow:'hidden',display:'flex',alignItems:'center'}}>
        <Overlay/>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1100,margin:'0 auto',padding:'60px 32px',textAlign:'center'}}>
          <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
            {['ISO Certified','NABH Accredited','Award Winning'].map(t=>(
              <span key={t} style={{padding:'5px 14px',borderRadius:999,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',fontSize:12,fontWeight:600}}>✓ {t}</span>
            ))}
          </div>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3rem',fontWeight:800,color:'#fff',lineHeight:1.1,maxWidth:800,margin:'0 auto 18px'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.15rem',color:'rgba(255,255,255,0.8)',maxWidth:560,margin:'0 auto 32px'}}>{sub}</p>}
          <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
            {cta && <span style={{padding:'14px 32px',borderRadius:8,background:a,color:'#fff',fontWeight:700,cursor:'pointer'}}>{cta}</span>}
            {sec && <span style={{padding:'14px 32px',borderRadius:8,border:'2px solid rgba(255,255,255,0.5)',color:'#fff',fontWeight:600,cursor:'pointer'}}>{sec}</span>}
          </div>
        </div>
      </div>
    );
  }

  // 10. minimal-premium
  if (variant === 'minimal-premium') {
    return (
      <div style={{...css,...padding,minHeight:minH,background:'#fafafa',display:'flex',alignItems:'center'}}>
        <div style={{width:'100%',maxWidth:900,margin:'0 auto',padding:'0 48px'}}>
          <div style={{width:48,height:3,background:p,marginBottom:28}}/>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3.5rem',fontWeight:700,color:'#0f172a',lineHeight:1.05,marginBottom:20,letterSpacing:'-0.03em'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.2rem',color:'#64748b',lineHeight:1.7,marginBottom:36,maxWidth:560}}>{sub}</p>}
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            {cta && <span style={{padding:'13px 32px',borderRadius:6,background:p,color:'#fff',fontWeight:700,cursor:'pointer'}}>{cta}</span>}
            {sec && <span style={{color:p,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>{sec} <ArrowRight size={16}/></span>}
          </div>
        </div>
      </div>
    );
  }

  // 11. hospital-enterprise
  if (variant === 'hospital-enterprise') {
    return (
      <div style={{...css,minHeight:minH,background:bg,position:'relative',overflow:'hidden',display:'flex',alignItems:'center'}}>
        <Overlay/>
        <div style={{position:'absolute',top:0,left:0,right:0,background:'rgba(0,0,0,0.4)',padding:'12px 48px',display:'flex',alignItems:'center',gap:24,zIndex:20}}>
          <span style={{color:'#fff',fontSize:13,opacity:0.8}}>📞 {s.phone||'+1-800-HOSPITAL'}</span>
          <span style={{color:'#fff',fontSize:13,opacity:0.8}}>📍 {s.location||'Multiple Locations'}</span>
          <span style={{marginLeft:'auto',color:'#fff',fontSize:13,opacity:0.8}}>🕐 Emergency 24/7</span>
        </div>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1100,margin:'0 auto',padding:'80px 32px 60px'}}>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3.2rem',fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:18,maxWidth:700}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.15rem',color:'rgba(255,255,255,0.8)',marginBottom:32,maxWidth:560}}>{sub}</p>}
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:40}}>
            {cta && <span style={{padding:'14px 32px',borderRadius:6,background:a,color:'#fff',fontWeight:700,cursor:'pointer'}}>{cta}</span>}
            {sec && <span style={{padding:'14px 32px',borderRadius:6,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',fontWeight:600,cursor:'pointer'}}>{sec}</span>}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['General Medicine','Cardiology','Orthopedics','Neurology','Pediatrics'].map(d=>(
              <span key={d} style={{padding:'6px 14px',background:'rgba(255,255,255,0.1)',borderRadius:4,color:'rgba(255,255,255,0.8)',fontSize:12,fontWeight:500}}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 12. ai-healthcare
  if (variant === 'ai-healthcare') {
    return (
      <div style={{...css,...padding,minHeight:minH,background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',display:'flex',alignItems:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(circle at 20% 50%,${p}20 0%,transparent 40%),radial-gradient(circle at 80% 20%,${a}15 0%,transparent 40%)`}}/>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1100,margin:'0 auto',padding:'0 32px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 18px',borderRadius:999,background:'rgba(139,92,246,0.2)',border:'1px solid rgba(139,92,246,0.4)',marginBottom:24}}>
            <Zap size={14} color="#a78bfa"/><span style={{fontSize:13,color:'#a78bfa',fontWeight:600}}>AI-Powered Healthcare</span>
          </div>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3.5rem',fontWeight:800,color:'#fff',lineHeight:1.1,maxWidth:800,margin:'0 auto 20px'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.2rem',color:'rgba(255,255,255,0.65)',lineHeight:1.6,maxWidth:560,margin:'0 auto 36px'}}>{sub}</p>}
          <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
            {cta && <span style={{padding:'14px 32px',borderRadius:10,background:`linear-gradient(135deg,${p},${a})`,color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer'}}>{cta}</span>}
            {sec && <span style={{padding:'14px 32px',borderRadius:10,border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontWeight:600,cursor:'pointer'}}>{sec}</span>}
          </div>
        </div>
      </div>
    );
  }

  // 13. full-screen-premium
  if (variant === 'full-screen-premium') {
    return (
      <div style={{...css,minHeight:'100vh',background:bg,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Overlay/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'35%',background:'linear-gradient(to top,rgba(0,0,0,0.7),transparent)',zIndex:1}}/>
        <div style={{position:'relative',zIndex:10,textAlign:'center',padding:'0 32px',maxWidth:900,width:'100%'}}>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'4.5rem',fontWeight:300,color:'#fff',lineHeight:1.05,marginBottom:24,letterSpacing:'-0.03em'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.3rem',color:'rgba(255,255,255,0.75)',maxWidth:600,margin:'0 auto 40px'}}>{sub}</p>}
          <div style={{display:'flex',justifyContent:'center',gap:16,flexWrap:'wrap'}}>
            {cta && <span style={{padding:'16px 40px',borderRadius:4,background:'#fff',color:p,fontWeight:700,fontSize:16,cursor:'pointer'}}>{cta}</span>}
            {sec && <span style={{padding:'16px 40px',borderRadius:4,border:'2px solid rgba(255,255,255,0.6)',color:'#fff',fontWeight:600,fontSize:16,cursor:'pointer'}}>{sec}</span>}
          </div>
        </div>
      </div>
    );
  }

  // 14. dental-clinic
  if (variant === 'dental-clinic') {
    return (
      <div style={{...css,...padding,minHeight:minH,background:'linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 100%)',display:'flex',alignItems:'center'}}>
        <div style={{width:'100%',maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:999,background:`${p}15`,marginBottom:20}}>
              <span style={{fontSize:14}}>🦷</span><span style={{fontSize:12,color:p,fontWeight:600}}>Premium Dental Care</span>
            </div>
            <h1 style={{fontFamily:theme.fontHeading,fontSize:'2.8rem',fontWeight:800,color:'#0f172a',lineHeight:1.1,marginBottom:16}}>{hl}</h1>
            {sub && <p style={{fontSize:'1.05rem',color:'#64748b',lineHeight:1.7,marginBottom:28}}>{sub}</p>}
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:28}}>
              {cta && <span style={{padding:'13px 28px',borderRadius:8,background:p,color:'#fff',fontWeight:700,cursor:'pointer',boxShadow:`0 6px 20px ${p}30`}}>{cta}</span>}
              {sec && <span style={{padding:'13px 28px',borderRadius:8,border:`2px solid ${p}`,color:p,fontWeight:600,cursor:'pointer'}}>{sec}</span>}
            </div>
            <div style={{display:'flex',gap:20}}>
              {[['4.9 ★','500+ Reviews'],['15+','Years Exp']].map(([v,l])=>(
                <div key={l}><div style={{fontWeight:800,color:p,fontSize:18}}>{v}</div><div style={{fontSize:12,color:'#94a3b8'}}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{aspectRatio:'4/3',borderRadius:20,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {hasCover ? <img src={resolveImg(s.coverImage)} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:20}}/> : <span style={{fontSize:80}}>🦷</span>}
          </div>
        </div>
      </div>
    );
  }

  // 15. image-collage (default fallback)
  // 15. video-background
  if (variant === 'video-background') {
    return (
      <div style={{...css,minHeight:minH,position:'relative',overflow:'hidden',display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${p} 0%,${theme.secondaryColor} 100%)`,zIndex:0}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 30% 60%,rgba(255,255,255,0.08) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.05) 0%,transparent 40%)',zIndex:1}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:2,overflow:'hidden',lineHeight:0}}>
          <svg viewBox="0 0 1200 80" fill="white" preserveAspectRatio="none" style={{width:'100%',height:50,display:'block'}}><path d="M0,40 C400,80 800,0 1200,40 L1200,80 L0,80 Z"/></svg>
        </div>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1100,margin:'0 auto',padding:'80px 32px 100px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:999,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',marginBottom:24}}>
            <span style={{fontSize:12}}>▶</span><span style={{fontSize:12,color:'#fff',fontWeight:600}}>Watch Our Story</span>
          </div>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3.5rem',fontWeight:800,color:'#fff',lineHeight:1.05,marginBottom:20,letterSpacing:'-0.02em'}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.2rem',color:'rgba(255,255,255,0.8)',lineHeight:1.6,marginBottom:36,maxWidth:600,margin:'0 auto 36px'}}>{sub}</p>}
          <div style={{display:'flex',justifyContent:'center',gap:14,flexWrap:'wrap'}}>
            {cta && <span style={{padding:'14px 32px',borderRadius:10,background:'#fff',color:p,fontWeight:700,fontSize:16,cursor:'pointer',boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>{cta}</span>}
            <span style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'2px solid rgba(255,255,255,0.5)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}><span style={{color:'#fff',fontSize:18,marginLeft:3}}>▶</span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{...css,...padding,minHeight:minH,background:bg,position:'relative',display:'flex',alignItems:'center'}}>
      <Overlay/>
      <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:48,alignItems:'center'}}>
        <div>
          <h1 style={{fontFamily:theme.fontHeading,fontSize:'3rem',fontWeight:800,color:'#fff',lineHeight:1.1,marginBottom:20}}>{hl}</h1>
          {sub && <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.8)',lineHeight:1.7,marginBottom:32}}>{sub}</p>}
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {cta && <PBtn label={cta}/>}{sec && <OBtn label={sec}/>}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'180px 120px',gap:10}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{borderRadius:12,background:`${p}${15+i*8}`,display:'flex',alignItems:'center',justifyContent:'center',gridColumn:i===0?'span 2':undefined}}>
              <Stethoscope size={i===0?48:28} color={p} opacity={0.4}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
