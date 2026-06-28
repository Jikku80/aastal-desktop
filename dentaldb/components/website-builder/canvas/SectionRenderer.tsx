'use client';

import React, { useEffect, useState } from 'react';
import { useBuilderStore, type SectionConfig, type ThemeConfig } from '../hooks/useBuilderState';
import { Building2, Phone, MapPin, Stethoscope, Mail, Star, Shield, Clock, ChevronDown, ChevronRight, Award, Heart, Users, CheckCircle, ArrowRight, Calendar, MessageCircle, Zap } from 'lucide-react';

interface Props { section: SectionConfig; }

// ── Live data hooks used by team/branches/etc in builder canvas ───────────────

function useLiveDoctors(subdomain: string, enabled: boolean) {
  const [doctors, setDoctors] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled || !subdomain) return;
    import('@/lib/api/websiteApi').then(({ websitePublicApi }) => {
      websitePublicApi.getDoctors(subdomain).then(setDoctors).catch(() => {});
    });
  }, [subdomain, enabled]);
  return doctors;
}

function useLiveBranches(subdomain: string, enabled: boolean) {
  const [branches, setBranches] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled || !subdomain) return;
    import('@/lib/api/websiteApi').then(({ websitePublicApi }) => {
      websitePublicApi.getBranches(subdomain).then(setBranches).catch(() => {});
    });
  }, [subdomain, enabled]);
  return branches;
}

export function SectionRenderer({ section }: Props) {
  const { theme, subdomain } = useBuilderStore();
  const s: Record<string, any> = section.settings ?? {};

  // Fetch live data for team/branches when dataSource = 'live-api'
  const liveDoctors  = useLiveDoctors(subdomain,  section.type === 'team'     && s.dataSource !== 'manual');
  const liveBranches = useLiveBranches(subdomain, section.type === 'branches' && s.dataSource !== 'manual');

  const RADIUS_MAP: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '9999px' };
  const css = {
    '--primary':   theme.primaryColor,
    '--secondary': theme.secondaryColor,
    '--accent':    theme.accentColor,
    '--bg':        theme.backgroundColor,
    '--text':      theme.textColor,
    '--radius':    RADIUS_MAP[theme.borderRadius] ?? '8px',
    fontFamily:    theme.fontBody,
  } as React.CSSProperties;

  const SPACING_MAP: Record<string, string> = { none: '0px', compact: '40px', normal: '64px', spacious: '96px', large: '128px' };
  const spacingVal = SPACING_MAP[s.sectionSpacing ?? 'normal'] ?? '64px';
  const basePadding = section.padding
    ? { paddingTop: section.padding.top, paddingBottom: section.padding.bottom }
    : { paddingTop: spacingVal, paddingBottom: spacingVal };

  const bgOverride: React.CSSProperties = {};
  if (s.sectionBgType === 'color' && s.sectionBgColor) bgOverride.background = s.sectionBgColor;
  else if (s.sectionBgType === 'gradient' && s.sectionBgGradient) bgOverride.background = s.sectionBgGradient;

  const padding = { ...basePadding };
  const WRAPPER_MAP: Record<string, string> = {
    full: 'w-full', contained: 'w-full max-w-6xl mx-auto px-8',
    wide: 'w-full max-w-7xl mx-auto px-4', narrow: 'w-full max-w-4xl mx-auto px-8',
  };
  const wrapperKey = s.containerWidth ?? section.layout ?? 'contained';
  const wrapperClass = WRAPPER_MAP[wrapperKey] ?? 'w-full max-w-6xl mx-auto px-8';

  const borderStyle: React.CSSProperties = {};
  if (s.sectionBorder && s.sectionBorder !== 'none') {
    const bc = s.sectionBorderColor ?? '#e5e7eb';
    if (s.sectionBorder === 'top')    borderStyle.borderTop    = `1px solid ${bc}`;
    if (s.sectionBorder === 'bottom') borderStyle.borderBottom = `1px solid ${bc}`;
    if (s.sectionBorder === 'both')   { borderStyle.borderTop = `1px solid ${bc}`; borderStyle.borderBottom = `1px solid ${bc}`; }
    if (s.sectionBorder === 'all')    borderStyle.border = `1px solid ${bc}`;
  }
  const mergedCss = { ...css, ...bgOverride, ...borderStyle } as React.CSSProperties;

  switch (section.type) {
    case 'hero':                return <HeroPreview           s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'about':               return <AboutPreview          s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'services':            return <ServicesPreview       s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'team':                return <TeamPreview           s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} liveDoctors={liveDoctors} />;
    case 'testimonials':        return <TestimonialsPreview   s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'appointment-booking': return <BookingPreview        s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'working-hours':       return <WorkingHoursPreview   s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'contact':             return <ContactPreview        s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'gallery':             return <GalleryPreview        s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'faq':                 return <FaqPreview            s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'stats':               return <StatsPreview          s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'cta-banner':          return <CtaBannerPreview      s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'rich-text':           return <RichTextPreview       s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'divider':             return <DividerPreview        s={s} />;
    case 'spacer':              return <SpacerPreview         s={s} />;
    case 'map':                 return <MapPreview            s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'social-proof':        return <SocialProofPreview    s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'video':               return <VideoPreview          s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'branches':            return <BranchesPreview       s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} liveBranches={liveBranches} />;
    case 'available-slots':     return <SlotsPreview          s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'products':            return <ProductsPreview       s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'ai-chatbot':          return <AiChatbotPreview      s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'whatsapp-button':     return <WhatsAppButtonPreview s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'blog-articles':       return <BlogPreview           s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'clinic-info':         return <ClinicInfoPreview     s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    case 'patient-login':       return <PatientLoginPreview   s={s} css={mergedCss} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
    default:
      return <div className="p-8 text-center text-gray-400 text-sm">Unknown section: {section.type}</div>;
  }
}

// ── Shared types ──────────────────────────────────────────────────────────────
type PreviewProps = { s: Record<string, any>; css: React.CSSProperties; padding: React.CSSProperties; theme: ThemeConfig; wrapperClass: string; liveDoctors?: any[]; liveBranches?: any[]; };

// ── Shared helpers ────────────────────────────────────────────────────────────
const resolveImg = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

function SectionTitle({ title, subtitle, theme, light = false, centered = true }: { title?: string; subtitle?: string; theme: ThemeConfig; light?: boolean; centered?: boolean; }) {
  if (!title) return null;
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''}`}>
      <h2 className="text-3xl font-bold mb-3" style={{ color: light ? '#fff' : theme.textColor, fontFamily: theme.fontHeading }}>{title}</h2>
      {subtitle && <p className="text-lg max-w-2xl mx-auto" style={{ color: light ? 'rgba(255,255,255,0.75)' : '#6b7280' }}>{subtitle}</p>}
    </div>
  );
}

function StarRating({ rating = 5, color }: { rating?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array(5).fill(0).map((_, i) => <Star key={i} size={14} fill={i < rating ? color : 'none'} stroke={color} />)}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO — 15 variants
// ══════════════════════════════════════════════════════════════════════════════
function HeroPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// ABOUT — 8 variants
// ══════════════════════════════════════════════════════════════════════════════
function AboutPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES — 10 variants
// ══════════════════════════════════════════════════════════════════════════════
function ServicesPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// TEAM — 8 variants
// ══════════════════════════════════════════════════════════════════════════════
function TeamPreview({ s, css, padding, theme, wrapperClass, liveDoctors = [] }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// TESTIMONIALS — 8 variants
// ══════════════════════════════════════════════════════════════════════════════
function TestimonialsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// STATS — 7 variants
// ══════════════════════════════════════════════════════════════════════════════
function StatsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'banner';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[])?.length ? s.items
    : [{value:'10+',label:'Years Experience'},{value:'5000+',label:'Happy Patients'},{value:'15+',label:'Expert Doctors'},{value:'98%',label:'Satisfaction Rate'}];

  if (variant === 'banner' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:p}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:24}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',color:'#fff'}}>
                <div style={{fontSize:'2.5rem',fontWeight:800}}>{item.value}</div>
                <div style={{fontSize:13,opacity:0.8,marginTop:4}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating-cards') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:20}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:20,padding:28,textAlign:'center',boxShadow:`0 8px 32px ${p}15`,border:`1px solid ${p}10`}}>
                <div style={{fontSize:'2.2rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                <div style={{fontSize:13,color:'#6b7280'}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {items.slice(0,4).map((item:any,i:number)=>(
              <div key={i} style={{borderRadius:20,padding:28,textAlign:'center',background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:'#f8faff',color:i===0?'#fff':theme.textColor,gridColumn:i===0?'span 2':undefined,boxShadow:i===0?`0 8px 32px ${p}30`:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:i===0?'3rem':'2.2rem',fontWeight:800}}>{item.value}</div>
                <div style={{fontSize:13,opacity:i===0?0.85:0.6,marginTop:4}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'with-icons') {
    const icons = ['🏥','👥','👨‍⚕️','⭐','🏆','💊'];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,4)},1fr)`,gap:24}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{fontSize:32,marginBottom:12}}>{icons[i%icons.length]}</div>
                <div style={{fontSize:'2rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                <div style={{fontSize:13,color:'#6b7280'}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark-premium') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:1,background:'rgba(255,255,255,0.08)',borderRadius:20,overflow:'hidden'}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',padding:'36px 24px',background:'#0f172a'}}>
                <div style={{fontSize:'2.8rem',fontWeight:800,color:p}}>{item.value}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:6}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'gradient-bg') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p},${theme.secondaryColor})`}}>
        <div className={wrapperClass}>
          {s.title && <h2 style={{textAlign:'center',fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:32}}>{s.title}</h2>}
          <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:1}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center',padding:'28px 20px',borderRight:i<items.length-1?'1px solid rgba(255,255,255,0.2)':'none'}}>
                <div style={{fontSize:'2.5rem',fontWeight:800,color:'#fff'}}>{item.value}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',marginTop:4}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(items.length,4)},1fr)`,gap:24}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{width:110,height:110,borderRadius:'50%',border:`8px solid ${p}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',background:`${p}06`}}>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:p}}>{item.value}</div>
                </div>
                <div style={{fontSize:13,color:'#6b7280',fontWeight:600}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // dashboard
  if (variant === 'dashboard') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{background:'white',borderRadius:24,padding:32,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:'#f1f5f9',borderRadius:12,overflow:'hidden',marginBottom:24}}>
              {items.slice(0,4).map((item:any,i:number)=>(
                <div key={i} style={{padding:'20px 16px',background:'white',textAlign:'center'}}>
                  <div style={{fontSize:'1.8rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                  <div style={{fontSize:11,color:'#9ca3af',fontWeight:600}}>{item.label}</div>
                  <div style={{marginTop:8,height:3,borderRadius:2,background:`${p}20`}}>
                    <div style={{height:'100%',borderRadius:2,background:p,width:`${60+i*10}%`}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap'}}>
              {[['🏆','Award Winning'],['✓','Accredited'],['🌟','Top Rated']].map(([ic,lb])=>(
                <div key={lb} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#6b7280'}}>
                  <span>{ic}</span><span>{lb}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // timeline-stats
  if (variant === 'timeline-stats') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Growth'} subtitle={s.subtitle} theme={theme}/>
          <div style={{position:'relative',padding:'0 32px'}}>
            <div style={{position:'absolute',top:24,left:32,right:32,height:2,background:`${p}20`}}/>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:16,position:'relative',zIndex:1}}>
              {items.map((item:any,i:number)=>(
                <div key={i} style={{textAlign:'center'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:i===0?p:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:i===0?`0 4px 16px ${p}40`:'none',border:i!==0?`2px solid ${p}30`:'none'}}>
                    <span style={{fontWeight:800,color:i===0?'#fff':p,fontSize:12}}>{i+1}</span>
                  </div>
                  <div style={{fontSize:'1.5rem',fontWeight:800,color:p,marginBottom:4}}>{item.value}</div>
                  <div style={{fontSize:12,color:'#6b7280'}}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:p}}>
      <div className={wrapperClass}>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:24}}>
          {items.map((item:any,i:number)=>(
            <div key={i} style={{textAlign:'center',color:'#fff'}}>
              <div style={{fontSize:'2.5rem',fontWeight:800}}>{item.value}</div>
              <div style={{fontSize:13,opacity:0.8,marginTop:4}}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOKING — 6 variants
// ══════════════════════════════════════════════════════════════════════════════
function BookingPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// WORKING HOURS — 5 variants
// ══════════════════════════════════════════════════════════════════════════════
function WorkingHoursPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'table';
  const p = theme.primaryColor;
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const hours = (s.hours as Record<string,any>) || {};
  const today = new Date().toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();

  if (variant === 'table' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} theme={theme}/>
          <div style={{maxWidth:480,margin:'0 auto',background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',border:`1px solid ${p}15`}}>
            {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today&&s.showTodayHighlight;if(!slot&&!s.showClosedDays)return null;return(
              <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'12px 24px',borderBottom:'1px solid #f1f5f9',background:isT?`${p}08`:'transparent'}}>
                <span style={{fontSize:14,color:isT?p:'#374151',fontWeight:isT?700:500}}>{day}</span>
                {slot?<span style={{fontSize:14,fontWeight:600,color:isT?p:'#374151'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:13,color:'#ef4444'}}>Closed</span>}
              </div>
            );})}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
            {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today;return(
              <div key={day} style={{borderRadius:14,padding:'14px 8px',textAlign:'center',background:isT?p:'#f8faff',color:isT?'#fff':theme.textColor,boxShadow:isT?`0 6px 20px ${p}40`:'none'}}>
                <div style={{fontSize:10,fontWeight:700,opacity:isT?0.9:0.5,marginBottom:6}}>{day.slice(0,3).toUpperCase()}</div>
                {slot?(<><div style={{fontSize:11,fontWeight:700}}>{slot.open}</div><div style={{fontSize:9,opacity:0.7}}>to</div><div style={{fontSize:11,fontWeight:700}}>{slot.close}</div></>):<div style={{fontSize:10,opacity:0.5,marginTop:6}}>Closed</div>}
              </div>
            );})}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:12}}>{s.title||'Opening Hours'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.6,marginBottom:24,fontSize:14}}>We're here when you need us. Book at your convenience.</p>
              <div style={{background:p,borderRadius:16,padding:24,color:'#fff'}}>
                <div style={{fontSize:13,opacity:0.8,marginBottom:4}}>Today's Hours</div>
                <div style={{fontSize:'1.5rem',fontWeight:800}}>{hours[today]?.open||'9:00'} – {hours[today]?.close||'5:00'}</div>
                <div style={{fontSize:12,opacity:0.7,marginTop:4}}>Currently open</div>
              </div>
            </div>
            <div style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
              {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today;return(
                <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'11px 22px',borderBottom:'1px solid #f1f5f9',background:isT?`${p}05`:'transparent'}}>
                  <span style={{fontSize:13,fontWeight:isT?700:400,color:isT?p:'#374151'}}>{day}</span>
                  {slot?<span style={{fontSize:13,fontWeight:600,color:'#374151'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:12,color:'#ef4444'}}>Closed</span>}
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:12}}>{s.title||'Opening Hours'}</h2>
              <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:14,padding:20,marginBottom:20}}>
                <div style={{color:'#ef4444',fontSize:13,fontWeight:600,marginBottom:4}}>🚨 Emergency Line</div>
                <div style={{color:'#fff',fontSize:22,fontWeight:800}}>{s.emergencyPhone||'+1-800-CLINIC'}</div>
                <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:4}}>Available 24/7</div>
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,overflow:'hidden'}}>
              {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today;return(
                <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'11px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:isT?`${p}15`:'transparent'}}>
                  <span style={{fontSize:13,color:isT?'#fff':'rgba(255,255,255,0.6)'}}>{day}</span>
                  {slot?<span style={{fontSize:13,fontWeight:600,color:isT?p:'rgba(255,255,255,0.8)'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:12,color:'#ef4444'}}>Closed</span>}
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // timeline
  if (variant === 'timeline') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Schedule'} theme={theme}/>
          <div style={{maxWidth:600,margin:'0 auto'}}>
            {DAYS.map(day=>{
              const key=day.toLowerCase();const slot=hours[key];const isT=key===today;
              if(!slot&&!s.showClosedDays)return null;
              return(
                <div key={day} style={{display:'flex',gap:16,alignItems:'center',marginBottom:12}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:isT?p:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:700,color:isT?'#fff':p}}>{day.slice(0,2)}</span>
                  </div>
                  <div style={{flex:1,height:1,background:isT?p:`${p}20`}}/>
                  <div style={{background:isT?p:'#f8faff',borderRadius:8,padding:'6px 14px',border:`1px solid ${isT?p:p+'20'}`}}>
                    {slot ? <span style={{fontSize:13,fontWeight:600,color:isT?'#fff':theme.textColor}}>{slot.open} – {slot.close}</span>
                      : <span style={{fontSize:12,color:'#ef4444'}}>Closed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title} theme={theme}/>
        <div style={{maxWidth:480,margin:'0 auto',background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,0.07)'}}>
          {DAYS.map(day=>{const key=day.toLowerCase();const slot=hours[key];const isT=key===today&&s.showTodayHighlight;if(!slot&&!s.showClosedDays)return null;return(
            <div key={day} style={{display:'flex',justifyContent:'space-between',padding:'11px 22px',borderBottom:'1px solid #f8f9fa'}}>
              <span style={{fontSize:14,color:'#374151'}}>{day}</span>
              {slot?<span style={{fontSize:14,fontWeight:600,color:isT?p:'#374151'}}>{slot.open} – {slot.close}</span>:<span style={{fontSize:13,color:'#ef4444'}}>Closed</span>}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACT — 6 variants
// ══════════════════════════════════════════════════════════════════════════════
function ContactPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// GALLERY — 8 variants
// ══════════════════════════════════════════════════════════════════════════════
function GalleryPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'grid';
  const cols = (s.columns as number) || 3;
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[]) || [];

  const Box = ({i,style={}}:{i:number;style?:React.CSSProperties}) => {
    const item = items[i];
    return (
      <div style={{borderRadius:12,overflow:'hidden',background:`${p}${12+(i%4)*8}`,display:'flex',alignItems:'center',justifyContent:'center',...style}}>
        {item?.url ? <img src={resolveImg(item.url)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:28,opacity:0.4}}>🖼</span>}
      </div>
    );
  };

  if (variant === 'grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:12,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(9).fill(0).map((_,i)=><Box key={i} i={i} style={{aspectRatio:'1'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'masonry') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{columns:cols,gap:12}}>
            {Array(9).fill(0).map((_,i)=>(
              <div key={i} style={{marginBottom:12,breakInside:'avoid'}}>
                <Box i={i} style={{height:i%3===0?200:i%3===1?140:160}}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gridTemplateRows:'200px 160px',gap:12}}>
            <Box i={0} style={{gridColumn:'span 2',gridRow:'span 2'}}/>
            <Box i={1} style={{height:undefined}}/><Box i={2} style={{height:undefined}}/>
            <Box i={3} style={{height:undefined}}/><Box i={4} style={{height:undefined}}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'before-after') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Before & After'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{borderRadius:16,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
                  <div>
                    <div style={{background:'#64748b20',height:160,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:20,opacity:0.5}}>🖼</span></div>
                    <div style={{textAlign:'center',padding:'8px 0',fontSize:11,fontWeight:600,background:'#f1f5f9',color:'#6b7280'}}>BEFORE</div>
                  </div>
                  <div>
                    <div style={{background:`${p}20`,height:160,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:20,opacity:0.5}}>🖼</span></div>
                    <div style={{textAlign:'center',padding:'8px 0',fontSize:11,fontWeight:600,background:`${p}15`,color:p}}>AFTER</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'clinic-tour') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Clinic Tour'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gridTemplateRows:'240px 180px',gap:12}}>
            <Box i={0} style={{gridRow:'span 2'}}/><Box i={1} style={{height:undefined}}/><Box i={2} style={{height:undefined}}/>
            <Box i={3} style={{height:undefined}}/><Box i={4} style={{height:undefined}}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'lightbox') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Gallery'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)'}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gap:8,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(9).fill(0).map((_,i)=>(
              <div key={i} style={{borderRadius:8,overflow:'hidden',position:'relative',cursor:'pointer',aspectRatio:'1',background:`${p}${15+i*6}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:24,opacity:0.3}}>🖼</span>
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>
                  <span style={{color:'rgba(255,255,255,0)',fontSize:20,fontWeight:700}}>⊕</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'luxury') {
    return (
      <div style={{...css,...padding,background:'#fafaf9'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{width:40,height:1,background:theme.accentColor||p,margin:'0 auto 16px'}}/>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:300,color:theme.textColor,letterSpacing:'-0.02em',marginBottom:8}}>{s.title||'Our Gallery'}</h2>
            {s.subtitle && <p style={{color:'#9ca3af',fontSize:14}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <Box i={0} style={{aspectRatio:'16/9'}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[1,2,3,4].map(i=><Box key={i} i={i} style={{aspectRatio:'1'}}/>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'equipment') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Equipment'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gap:20,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(6).fill(0).map((_,i)=>(
              <div key={i} style={{borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}>
                <div style={{height:140,background:`${p}${12+i*7}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:36,opacity:0.5}}>🔬</span>
                </div>
                <div style={{padding:'12px 16px',background:'white'}}>
                  <div style={{fontWeight:600,color:theme.textColor,fontSize:13}}>{['MRI Scanner','X-Ray','Ultrasound','ECG','Endoscope','Lab Analyzer'][i]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // carousel-gallery
  if (variant === 'carousel-gallery') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>
            {Array(8).fill(0).map((_,i)=>(
              <div key={i} style={{minWidth:240,flexShrink:0,borderRadius:16,overflow:'hidden'}}>
                <Box i={i} style={{height:180}}/>
                {items[i]?.caption && <div style={{padding:'8px 12px',fontSize:12,color:'#6b7280'}}>{items[i].caption}</div>}
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:16}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===0?24:8,height:8,borderRadius:4,background:i===0?p:'#e5e7eb'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  // department-gallery
  if (variant === 'department-gallery') {
    const depts = [{name:'Reception',icon:'🏥'},{name:'Consultation Rooms',icon:'🩺'},{name:'Lab',icon:'🔬'},{name:'Equipment',icon:'💊'}];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Facilities'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:24}}>
            {depts.map((d,i)=>(
              <button key={i} style={{padding:'7px 16px',borderRadius:999,border:`1.5px solid ${i===0?p:'#e5e7eb'}`,background:i===0?p:'white',color:i===0?'#fff':theme.textColor,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <span>{d.icon}</span>{d.name}
              </button>
            ))}
          </div>
          <div style={{display:'grid',gap:12,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {Array(9).fill(0).map((_,i)=><Box key={i} i={i} style={{aspectRatio:'4/3'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  // stacked-modern
  if (variant === 'stacked-modern') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Box i={0} style={{height:280,borderRadius:16}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Box i={1} style={{height:140,borderRadius:14}}/>
                <Box i={2} style={{height:140,borderRadius:14}}/>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Box i={3} style={{height:140,borderRadius:14}}/>
                <Box i={4} style={{height:140,borderRadius:14}}/>
              </div>
              <Box i={5} style={{height:280,borderRadius:16}}/>
            </div>
          </div>
          {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:theme.textColor,textAlign:'center',marginTop:24}}>{s.title}</h2>}
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
        <div style={{display:'grid',gap:12,gridTemplateColumns:`repeat(${cols},1fr)`}}>
          {Array(6).fill(0).map((_,i)=><Box key={i} i={i} style={{aspectRatio:'4/3'}}/>)}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FAQ — 6 variants
// ══════════════════════════════════════════════════════════════════════════════
function FaqPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'accordion';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[])?.length ? s.items : [
    {question:'How do I book an appointment?',answer:'Book online via our website or call us directly.'},
    {question:'What insurance do you accept?',answer:'We accept most major insurance providers.'},
    {question:'What are your opening hours?',answer:'Mon–Fri 9am–5pm, Sat 9am–1pm.'},
    {question:'Do I need a referral?',answer:'No referral needed for most of our services.'},
    {question:'How long does a consultation take?',answer:'Typically 20–30 minutes for an initial consultation.'},
  ];

  if (variant === 'accordion' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{maxWidth:720,margin:'0 auto',display:'flex',flexDirection:'column',gap:10}}>
            {items.slice(0,5).map((item:any,i:number)=>(
              <div key={i} style={{border:'1.5px solid #e5e7eb',borderRadius:14,overflow:'hidden'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:i===0?`${p}08`:'#fafafa',cursor:'pointer'}}>
                  <span style={{fontWeight:600,color:theme.textColor,fontSize:14}}>{item.question}</span>
                  <ChevronDown size={18} color={p} style={{transform:i===0?'rotate(180deg)':'none'}}/>
                </div>
                {i===0 && <div style={{padding:'0 20px 16px',fontSize:14,color:'#6b7280',lineHeight:1.6,background:`${p}08`}}>{item.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'modern-cards') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {items.slice(0,4).map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',borderLeft:`4px solid ${p}`}}>
                <h4 style={{fontWeight:700,color:theme.textColor,marginBottom:10,fontSize:14}}>{item.question}</h4>
                <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>{item.answer||'Our team is ready to help you with this.'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'two-column') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:64,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,marginBottom:12}}>{s.title||'FAQ'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:24,fontSize:14}}>{s.subtitle||'Common questions answered.'}</p>
              <button style={{padding:'10px 22px',borderRadius:8,background:p,color:'#fff',fontWeight:600,border:'none',cursor:'pointer',fontSize:13}}>Contact Us</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {items.slice(0,5).map((item:any,i:number)=>(
                <div key={i} style={{borderBottom:'1px solid #f1f5f9',paddingBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:i===0?10:0,cursor:'pointer'}}>
                    <span style={{fontWeight:600,color:theme.textColor,fontSize:14}}>{item.question}</span>
                    <ChevronRight size={16} color={p} style={{flexShrink:0,transform:i===0?'rotate(90deg)':'none'}}/>
                  </div>
                  {i===0 && <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>{item.answer}</p>}
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
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}06,${p}12)`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} subtitle={s.subtitle} theme={theme}/>
          <div style={{maxWidth:720,margin:'0 auto',background:'white',borderRadius:24,overflow:'hidden',boxShadow:'0 8px 40px rgba(0,0,0,0.1)'}}>
            {items.slice(0,5).map((item:any,i:number)=>(
              <div key={i} style={{borderBottom:i<4?'1px solid #f1f5f9':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 28px',cursor:'pointer',background:i===0?`${p}06`:'transparent'}}>
                  <span style={{fontWeight:600,color:i===0?p:theme.textColor,fontSize:14}}>{item.question}</span>
                  <div style={{width:24,height:24,borderRadius:'50%',background:i===0?p:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:i===0?'#fff':p,fontSize:16,lineHeight:1}}>{i===0?'−':'+'}</span>
                  </div>
                </div>
                {i===0 && <div style={{padding:'0 28px 18px',fontSize:14,color:'#6b7280',lineHeight:1.7}}>{item.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category') {
    const cats = [{label:'Appointments',icon:'📅',items:items.slice(0,2)},{label:'Services',icon:'🏥',items:items.slice(2,4)},{label:'Insurance',icon:'🛡️',items:items.slice(1,3)}];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Help Center'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {cats.map((cat,ci)=>(
              <div key={ci} style={{background:'#f8faff',borderRadius:20,padding:24}}>
                <div style={{fontSize:32,marginBottom:12}}>{cat.icon}</div>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:16,fontSize:15}}>{cat.label}</h3>
                {cat.items.map((item:any,i:number)=>(
                  <div key={i} style={{borderBottom:'1px solid #e5e7eb',paddingBottom:10,marginBottom:10,cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:13,color:'#374151',fontWeight:500}}>{item.question}</span>
                      <ChevronRight size={14} color={p}/>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Frequently Asked Questions'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)'}}>{s.subtitle}</p>}
          </div>
          <div style={{maxWidth:720,margin:'0 auto',display:'flex',flexDirection:'column',gap:8}}>
            {items.slice(0,5).map((item:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',cursor:'pointer'}}>
                  <span style={{fontWeight:600,color:i===0?p:'rgba(255,255,255,0.8)',fontSize:14}}>{item.question}</span>
                  <ChevronDown size={16} color={i===0?p:'rgba(255,255,255,0.4)'} style={{transform:i===0?'rotate(180deg)':'none'}}/>
                </div>
                {i===0 && <div style={{padding:'0 20px 14px',fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6}}>{item.answer}</div>}
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
        <div style={{maxWidth:720,margin:'0 auto',display:'flex',flexDirection:'column',gap:10}}>
          {items.slice(0,5).map((item:any,i:number)=>(
            <div key={i} style={{border:'1.5px solid #e5e7eb',borderRadius:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',cursor:'pointer'}}>
                <span style={{fontWeight:600,color:theme.textColor,fontSize:14}}>{item.question}</span>
                <span style={{color:p,fontSize:20,lineHeight:1}}>+</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CTA BANNER — 8 variants
// ══════════════════════════════════════════════════════════════════════════════
function CtaBannerPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'horizontal';
  const p = theme.primaryColor; const a = theme.accentColor;

  if (variant === 'horizontal' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:s.background||p}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
          <div>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading}}>{s.title||'Ready to Book?'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',marginTop:4}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'12px 28px',background:'#fff',color:p,fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'centered') {
    return (
      <div style={{...css,...padding,background:s.background||`linear-gradient(135deg,${p},${theme.secondaryColor})`}}>
        <div style={{textAlign:'center',maxWidth:700,margin:'0 auto',padding:'0 32px'}}>
          <h2 style={{fontSize:'2rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading,marginBottom:12}}>{s.title||'Take the Next Step'}</h2>
          {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',marginBottom:28,fontSize:16}}>{s.subtitle}</p>}
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            {s.ctaText && <button style={{padding:'13px 32px',background:'#fff',color:p,fontWeight:700,borderRadius:10,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
            {s.secondaryCtaText && <button style={{padding:'13px 32px',background:'transparent',color:'#fff',fontWeight:600,borderRadius:10,border:'2px solid rgba(255,255,255,0.6)',cursor:'pointer'}}>{s.secondaryCtaText}</button>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
          <div>
            <h2 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading}}>{s.title||'Book Your Appointment'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.6)',marginTop:6}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'13px 32px',background:p,color:'#fff',fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',boxShadow:`0 6px 20px ${p}50`,flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div style={{...css,...padding,background:'#ef4444'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
          <span style={{fontSize:32,flexShrink:0}}>🚨</span>
          <div style={{flex:1}}>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff'}}>{s.title||'Emergency? Call Now'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.85)',fontSize:14}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'14px 32px',background:'#fff',color:'#ef4444',fontWeight:800,borderRadius:10,border:'none',cursor:'pointer',fontSize:16,flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'whatsapp') {
    return (
      <div style={{...css,...padding,background:'#dcfce7'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <div style={{flex:1}}>
            <h3 style={{fontWeight:700,color:'#166534',fontSize:16}}>{s.title||'Chat with us on WhatsApp'}</h3>
            {s.subtitle && <p style={{fontSize:13,color:'#16a34a'}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'12px 28px',background:'#25D366',color:'#fff',fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',flexShrink:0}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'gradient-card') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 32px'}}>
          <div style={{background:`linear-gradient(135deg,${p},${a||theme.secondaryColor})`,borderRadius:24,padding:'40px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24,boxShadow:`0 20px 60px ${p}30`}}>
            <div>
              <h2 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading,marginBottom:8}}>{s.title||'Ready to Get Started?'}</h2>
              {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',maxWidth:400}}>{s.subtitle}</p>}
            </div>
            {s.ctaText && <button style={{padding:'13px 32px',background:'#fff',color:p,fontWeight:700,borderRadius:12,border:'none',cursor:'pointer',flexShrink:0}}>{s.ctaText}</button>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{...css,...padding,background:'white',borderTop:`1px solid ${p}20`,borderBottom:`1px solid ${p}20`}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <h3 style={{fontWeight:700,color:theme.textColor,fontSize:18}}>{s.title||'Book an Appointment Today'}</h3>
            {s.subtitle && <p style={{color:'#6b7280',fontSize:14,marginTop:4}}>{s.subtitle}</p>}
          </div>
          {s.ctaText && <button style={{padding:'11px 28px',background:'transparent',color:p,fontWeight:700,borderRadius:8,border:`2px solid ${p}`,cursor:'pointer'}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (variant === 'split-color') {
    return (
      <div style={{...css,display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:160}}>
        <div style={{background:p,padding:'40px 48px',display:'flex',alignItems:'center'}}>
          <div>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff',fontFamily:theme.fontHeading}}>{s.title||'Book Appointment'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)',marginTop:6,fontSize:14}}>{s.subtitle}</p>}
          </div>
        </div>
        <div style={{background:`${p}12`,padding:'40px 48px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {s.ctaText && <button style={{padding:'14px 36px',background:p,color:'#fff',fontWeight:700,borderRadius:10,border:'none',cursor:'pointer',fontSize:16,boxShadow:`0 6px 20px ${p}40`}}>{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  // download-brochure
  if (variant === 'download-brochure') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <div style={{background:'white',borderRadius:20,padding:'32px 40px',display:'flex',alignItems:'center',gap:32,boxShadow:'0 4px 24px rgba(0,0,0,0.08)',border:`1px solid ${p}15`,flexWrap:'wrap'}}>
            <div style={{width:64,height:64,borderRadius:16,background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:28}}>📋</span>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <h3 style={{fontWeight:700,color:theme.textColor,fontSize:18,marginBottom:6}}>{s.title||'Download Our Services Brochure'}</h3>
              <p style={{color:'#6b7280',fontSize:14}}>{s.subtitle||'Get a complete overview of our services, doctors, and packages.'}</p>
            </div>
            <button style={{padding:'13px 28px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:8}}>
              ↓ {s.ctaText||'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // insurance-verify
  if (variant === 'insurance-verify') {
    return (
      <div style={{...css,...padding,background:'#eff6ff'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:32,alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <Shield size={20} color={p}/><span style={{fontSize:13,fontWeight:700,color:p}}>Insurance Verification</span>
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.6rem',fontWeight:700,color:theme.textColor,marginBottom:8}}>{s.title||'Check Your Insurance Coverage'}</h2>
              <p style={{color:'#6b7280',fontSize:14}}>{s.subtitle||'We accept most major insurance plans. Verify coverage in seconds.'}</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}>
                {['Aetna','Blue Cross','Cigna','UnitedHealth'].map(ins=><span key={ins} style={{padding:'4px 12px',borderRadius:999,background:'white',border:`1px solid ${p}25`,fontSize:12,color:theme.textColor,fontWeight:600}}>{ins}</span>)}
                <span style={{padding:'4px 12px',borderRadius:999,background:'white',border:'1px solid #e5e7eb',fontSize:12,color:'#9ca3af'}}>+more</span>
              </div>
            </div>
            <button style={{padding:'13px 28px',borderRadius:10,background:p,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>{s.ctaText||'Verify Coverage'}</button>
          </div>
        </div>
      </div>
    );
  }

  // health-checkup
  if (variant === 'health-checkup') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p},${theme.secondaryColor})`}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                {['Basic','Premium','Executive','Comprehensive'].map((pkg,i)=>(
                  <span key={pkg} style={{padding:'4px 12px',borderRadius:999,background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:12,fontWeight:600}}>{pkg}</span>
                ))}
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:'#fff',marginBottom:10}}>{s.title||'Book a Health Checkup'}</h2>
              <p style={{color:'rgba(255,255,255,0.8)',fontSize:15,marginBottom:24}}>{s.subtitle||'Comprehensive health screenings starting at affordable prices.'}</p>
              <button style={{padding:'13px 32px',borderRadius:10,background:'#fff',color:p,fontWeight:700,border:'none',cursor:'pointer'}}>{s.ctaText||'View Packages'}</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[['🩸','Blood Tests'],['❤️','Cardiac Check'],['👁️','Eye Exam'],['🦷','Dental Screen']].map(([ic,lb])=>(
                <div key={lb} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:14,padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:28,marginBottom:8}}>{ic}</div>
                  <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{lb}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:s.background||p}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
        <div>
          <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff'}}>{s.title}</h2>
          {s.subtitle && <p style={{color:'rgba(255,255,255,0.8)'}}>{s.subtitle}</p>}
        </div>
        {s.ctaText && <button style={{padding:'12px 28px',background:'#fff',color:p,fontWeight:700,borderRadius:10,border:'none',cursor:'pointer'}}>{s.ctaText}</button>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL PROOF / TRUST BADGES — 6 variants
// ══════════════════════════════════════════════════════════════════════════════
function SocialProofPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'logos';
  const p = theme.primaryColor;
  const items: any[] = (s.items as any[])?.length ? s.items
    : [{name:'ISO Certified'},{name:'NABH Accredited'},{name:'JCI Certified'},{name:'JCAHO'},{name:'WHO Partner'}];

  if (variant === 'logos' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title} theme={theme}/>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:20}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,background:'white',borderRadius:14,padding:'18px 22px',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',minWidth:100}}>
                {item.image ? <img src={item.image} alt={item.name} style={{height:40,objectFit:'contain'}}/> : <div style={{width:48,height:48,background:`${p}15`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}><Shield size={22} color={p}/></div>}
                <span style={{fontSize:11,fontWeight:600,color:'#6b7280',textAlign:'center'}}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'award-showcase') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}06,${p}12)`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Awards & Certifications'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:20}}>
            {items.slice(0,5).map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:24,textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',border:`1px solid ${p}10`}}>
                <Award size={36} color={i===0?'#f59e0b':p} style={{margin:'0 auto 12px'}}/>
                <div style={{fontSize:12,fontWeight:700,color:theme.textColor}}>{item.name}</div>
                {item.year && <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>{item.year}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'strip') {
    return (
      <div style={{...css,...padding,background:'white',borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:32,flexWrap:'wrap'}}>
            {s.title && <span style={{fontSize:13,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.title}</span>}
            <div style={{display:'flex',gap:32,alignItems:'center',flexWrap:'wrap'}}>
              {items.map((item:any,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,opacity:0.6}}>
                  <Shield size={16} color={p}/><span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'insurance') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Insurance We Accept'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:16}}>
            {(items.length?items:['Aetna','Blue Cross','Cigna','UnitedHealth','Humana','Medicare'].map(n=>({name:n}))).map((item:any,i:number)=>(
              <div key={i} style={{background:'#f8faff',border:'1px solid #e5e7eb',borderRadius:12,padding:'14px 22px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,background:`${p}15`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><Shield size={16} color={p}/></div>
                <span style={{fontSize:13,fontWeight:600,color:theme.textColor}}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:32}}>
            {s.title && <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:'#fff',marginBottom:6}}>{s.title}</h2>}
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:16}}>
            {items.map((item:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:10}}>
                <Shield size={18} color={p}/><span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.8)'}}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'interactive') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Certifications'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {items.slice(0,4).map((item:any,i:number)=>(
              <div key={i} style={{background:'white',borderRadius:20,padding:28,textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',cursor:'pointer',border:`2px solid transparent`,transition:'border-color 0.2s'}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                  <Award size={30} color={p}/>
                </div>
                <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:4}}>{item.name}</div>
                {item.desc && <div style={{fontSize:11,color:'#9ca3af'}}>{item.desc}</div>}
                {item.year && <div style={{fontSize:11,color:p,fontWeight:600,marginTop:6}}>Since {item.year}</div>}
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
        <SectionTitle title={s.title} theme={theme}/>
        <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:20}}>
          {items.map((item:any,i:number)=>(
            <div key={i} style={{background:'white',borderRadius:12,padding:'16px 20px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
              <div style={{width:40,height:40,background:`${p}12`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><Shield size={18} color={p}/></div>
              <span style={{fontSize:11,color:'#6b7280'}}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BRANCHES — 6 variants
// ══════════════════════════════════════════════════════════════════════════════
function BranchesPreview({ s, css, padding, theme, wrapperClass, liveBranches = [] }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// SLOTS — 5 variants
// ══════════════════════════════════════════════════════════════════════════════
function SlotsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'grid';
  const p = theme.primaryColor;
  const slots = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30'];

  if (variant === 'grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Available Slots'} theme={theme}/>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
            {slots.map(slot=>(
              <button key={slot} style={{padding:'10px 20px',border:`2px solid ${p}40`,borderRadius:10,fontSize:13,fontWeight:600,color:p,background:'white',cursor:'pointer'}}>{slot}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'day-cards') {
    const days = ['Mon','Tue','Wed','Thu','Fri'];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Book a Slot'} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14}}>
            {days.map((day,i)=>(
              <div key={day} style={{borderRadius:14,border:`1.5px solid ${i===0?p:'#e5e7eb'}`,padding:16,background:i===0?`${p}08`:'white'}}>
                <div style={{fontWeight:700,color:i===0?p:theme.textColor,marginBottom:12,fontSize:14}}>{day}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {slots.slice(0,4).map(t=>(
                    <span key={t} style={{display:'block',textAlign:'center',padding:'6px 4px',borderRadius:6,background:i===0&&t==='09:00'?p:'#f8faff',color:i===0&&t==='09:00'?'#fff':'#6b7280',fontSize:12,fontWeight:600,cursor:'pointer'}}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Today\'s Available Slots'} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:24}}>
            {[{label:'Morning',slots:slots.slice(0,5)},{label:'Afternoon',slots:slots.slice(6)}].map(({label,slots:ss})=>(
              <div key={label} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:16,fontSize:14}}>☀️ {label}</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {ss.map(t=>(
                    <button key={t} style={{padding:'8px 16px',borderRadius:8,border:`1.5px solid ${p}35`,color:p,fontSize:12,fontWeight:600,background:'transparent',cursor:'pointer'}}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-wise') {
    const doctors = ['Dr. Smith','Dr. Patel','Dr. Chen'];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Available Slots by Doctor'} theme={theme}/>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {doctors.map((doc,di)=>(
              <div key={doc} style={{background:'#f8faff',borderRadius:16,padding:'18px 24px'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p,fontSize:14}}>{doc[3]}</div>
                  <div style={{fontWeight:700,color:theme.textColor,fontSize:14}}>{doc}</div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {slots.slice(di,di+5).map(t=>(
                    <button key={t} style={{padding:'6px 14px',borderRadius:6,border:`1.5px solid ${p}35`,color:p,fontSize:12,fontWeight:600,background:'white',cursor:'pointer'}}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div style={{...css,...padding,background:`${p}08`}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <h3 style={{fontFamily:theme.fontHeading,fontWeight:700,color:theme.textColor,fontSize:16}}>{s.title||'Quick Book'}</h3>
              <p style={{fontSize:13,color:'#6b7280',marginTop:2}}>Select a slot and book instantly</p>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {slots.slice(0,6).map(t=>(
                <button key={t} style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${p}40`,color:p,fontSize:12,fontWeight:700,background:'white',cursor:'pointer'}}>{t}</button>
              ))}
            </div>
            <button style={{padding:'10px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',flexShrink:0}}>Confirm</button>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title||'Available Slots'} theme={theme}/>
        <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
          {slots.map(slot=>(
            <button key={slot} style={{padding:'10px 20px',border:`2px solid ${p}40`,borderRadius:10,fontSize:13,fontWeight:600,color:p,background:'white',cursor:'pointer'}}>{slot}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RICH TEXT — 5 variants
// ══════════════════════════════════════════════════════════════════════════════
function RichTextPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'article';
  const p = theme.primaryColor;
  const content = (s.content as string) || '<p style="color:#6b7280;line-height:1.7">Add your content here. You can include text, lists, headings, and more.</p>';

  if (variant === 'article' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div style={{maxWidth:740,margin:'0 auto',padding:'0 32px'}}>
          <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
        </div>
      </div>
    );
  }

  if (variant === 'two-column') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48}}>
            <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
            <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'editorial') {
    return (
      <div style={{...css,...padding,background:'#fafaf9'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:48}}>
            <div style={{borderRight:`2px solid ${p}20`,paddingRight:32,paddingTop:8}}>
              {s.label && <div style={{fontSize:11,fontWeight:700,color:p,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12}}>{s.label}</div>}
              {s.author && <div style={{fontSize:13,color:'#374151',fontWeight:600}}>{s.author}</div>}
              {s.date && <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>{s.date}</div>}
              {s.readTime && <div style={{fontSize:11,color:'#9ca3af',marginTop:8}}>⏱ {s.readTime} min read</div>}
            </div>
            <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'medical-guide') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:40,alignItems:'start'}}>
            <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
            <div style={{background:`${p}08`,borderRadius:16,padding:24,border:`1px solid ${p}15`}}>
              <h4 style={{fontWeight:700,color:theme.textColor,marginBottom:12,fontSize:14}}>Quick Summary</h4>
              {['Key information','Important notes','Next steps'].map((pt,i)=>(
                <div key={i} style={{display:'flex',gap:8,marginBottom:10,alignItems:'flex-start'}}>
                  <CheckCircle size={14} color={p} style={{marginTop:2,flexShrink:0}}/>
                  <span style={{fontSize:13,color:'#6b7280'}}>{pt}</span>
                </div>
              ))}
              <button style={{marginTop:14,width:'100%',padding:'10px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer'}}>Book Consultation</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'highlight') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <div style={{borderLeft:`4px solid ${p}`,paddingLeft:24,marginBottom:24}}>
            <p style={{fontSize:'1.1rem',color:theme.textColor,fontStyle:'italic',lineHeight:1.7,fontFamily:theme.fontHeading}}>
              {s.highlight||'Key insight or important medical information goes here.'}
            </p>
          </div>
          <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'white'}}>
      <div className={wrapperClass}>
        <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{__html:content}}/>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIDEO — 5 variants
// ══════════════════════════════════════════════════════════════════════════════
function VideoPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// MAP — 5 variants
// ══════════════════════════════════════════════════════════════════════════════
function MapPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'full-width';
  const p = theme.primaryColor;
  const address = (s.address as string) || '';
  const h = (s.height as number) || 400;

  const MapBox = ({height=400,rounded=true}:{height?:number;rounded?:boolean}) => (
    <div style={{background:'#e2e8f0',height,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:rounded?16:0,overflow:'hidden'}}>
      {s.embedUrl
        ? <iframe src={s.embedUrl as string} width="100%" height={height} style={{border:0}} allowFullScreen loading="lazy"/>
        : <div style={{textAlign:'center',color:'#94a3b8'}}><MapPin size={40} style={{margin:'0 auto 10px'}}/><div style={{fontSize:13}}>Map Preview</div>{address&&<div style={{fontSize:11,marginTop:4,opacity:0.7,maxWidth:200,textAlign:'center'}}>{address}</div>}</div>}
    </div>
  );

  if (variant === 'full-width' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        {s.title && <div className={wrapperClass} style={{marginBottom:16}}><h2 style={{fontSize:'1.5rem',fontWeight:700,color:theme.textColor}}>{s.title}</h2></div>}
        <div style={{borderRadius:0,overflow:'hidden'}}><MapBox height={h} rounded={false}/></div>
      </div>
    );
  }

  if (variant === 'contact-map') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:0,borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            <div style={{background:p,padding:36,display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <h3 style={{fontWeight:700,color:'#fff',fontSize:18,marginBottom:20}}>{s.title||'Find Us'}</h3>
              {address && <div style={{display:'flex',gap:10,marginBottom:14}}><MapPin size={16} color="rgba(255,255,255,0.7)" style={{flexShrink:0,marginTop:2}}/><span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{address}</span></div>}
              {s.phone && <div style={{display:'flex',gap:10,marginBottom:14}}><Phone size={16} color="rgba(255,255,255,0.7)"/><span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{s.phone}</span></div>}
              {s.email && <div style={{display:'flex',gap:10}}><Mail size={16} color="rgba(255,255,255,0.7)"/><span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{s.email}</span></div>}
              <button style={{marginTop:28,padding:'10px 20px',borderRadius:8,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer'}}>Get Directions →</button>
            </div>
            <MapBox height={360} rounded={false}/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating-card') {
    return (
      <div style={{...css,position:'relative',overflow:'hidden'}}>
        <MapBox height={480} rounded={false}/>
        <div style={{position:'absolute',top:'50%',right:48,transform:'translateY(-50%)',background:'white',borderRadius:20,padding:'28px 24px',width:280,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
          <h3 style={{fontWeight:700,color:theme.textColor,marginBottom:16,fontSize:16}}>{s.title||'Visit Us'}</h3>
          {address && <div style={{display:'flex',gap:10,marginBottom:10}}><MapPin size={15} color={p} style={{flexShrink:0,marginTop:2}}/><span style={{fontSize:13,color:'#374151'}}>{address}</span></div>}
          {s.phone && <div style={{display:'flex',gap:10,marginBottom:10}}><Phone size={15} color={p}/><span style={{fontSize:13,color:'#374151'}}>{s.phone}</span></div>}
          {s.hours && <div style={{display:'flex',gap:10,marginBottom:16}}><Clock size={15} color={p}/><span style={{fontSize:13,color:'#374151'}}>{s.hours}</span></div>}
          <button style={{width:'100%',padding:'10px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer'}}>Get Directions</button>
        </div>
      </div>
    );
  }

  if (variant === 'multi-location') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Our Locations'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
            {[{name:'Main Branch',addr:address||'123 Medical Ave'},{name:'Downtown',addr:'456 Health Street'}].map((loc,i)=>(
              <div key={i} style={{background:i===0?p:'white',borderRadius:14,padding:'14px 18px',cursor:'pointer',border:i===0?'none':`1px solid ${p}20`}}>
                <div style={{fontWeight:700,color:i===0?'#fff':theme.textColor,marginBottom:4,fontSize:14}}>{loc.name}</div>
                <div style={{fontSize:12,color:i===0?'rgba(255,255,255,0.8)':'#9ca3af'}}>{loc.addr}</div>
              </div>
            ))}
          </div>
          <MapBox height={320}/>
        </div>
      </div>
    );
  }

  if (variant === 'directions') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:40,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'How to Find Us'}</h2>
              {address && <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}><MapPin size={16} color={p} style={{flexShrink:0,marginTop:2}}/><span style={{fontSize:14,color:'#374151'}}>{address}</span></div>}
              {s.phone && <div style={{display:'flex',gap:10,marginBottom:12}}><Phone size={16} color={p}/><span style={{fontSize:14,color:'#374151'}}>{s.phone}</span></div>}
              {s.parkingInfo && <div style={{background:`${p}08`,borderRadius:12,padding:'12px 14px',marginTop:16}}><div style={{fontSize:12,fontWeight:700,color:p,marginBottom:4}}>🅿 Parking</div><div style={{fontSize:13,color:'#6b7280'}}>{s.parkingInfo}</div></div>}
              <button style={{marginTop:20,padding:'11px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer',width:'100%'}}>Open in Maps →</button>
            </div>
            <MapBox height={380}/>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'white'}}>
      <div className={wrapperClass}>
        {s.title && <h2 style={{fontSize:'1.5rem',fontWeight:700,color:theme.textColor,marginBottom:14}}>{s.title}</h2>}
        <MapBox height={h}/>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS — live data + 4 visual variants
// ══════════════════════════════════════════════════════════════════════════════
function ProductsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'grid';
  const [products, setProducts] = React.useState<any[]>([]);
  const [loadError, setLoadError] = React.useState(false);
  const p = theme.primaryColor;

  React.useEffect(() => {
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getProductsForBuilder()
        .then((data: any) => {
          const all = Array.isArray(data) ? data : (data?.products || data?.data || []);
          const active = all.filter((pr: any) => pr.isActive !== false);
          const branchIds: string[] = s.branchIds || [];
          const bf = branchIds.length > 0 ? active.filter((pr:any) => !pr.branchId || branchIds.includes(pr.branchId)) : active;
          const hiddenIds: string[] = s.hiddenProductIds || [];
          setProducts(bf.filter((pr:any) => !hiddenIds.includes(pr.id)));
        })
        .catch(() => setLoadError(true));
    });
  }, [JSON.stringify(s.branchIds), JSON.stringify(s.hiddenProductIds)]);

  const sample = [
    {id:'1',name:'Vitamin C 500mg',price:350,unit:'tablet',inStock:true},
    {id:'2',name:'Face Moisturizer',price:1200,unit:'piece',inStock:true},
    {id:'3',name:'Omega-3 Capsules',price:850,unit:'capsule',inStock:false},
    {id:'4',name:'Antiseptic Cream',price:180,unit:'tube',inStock:true},
    {id:'5',name:'Blood Pressure Monitor',price:3500,unit:'piece',inStock:true},
    {id:'6',name:'Paracetamol 500mg',price:120,unit:'strip',inStock:true},
  ];
  const display = products.length > 0 ? products : sample;
  const isLive = products.length > 0;
  const cols = s.columns || 3;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/,'') ?? (typeof window!=='undefined'?window.location.origin:'');
  const imgSrc = (pr:any) => pr.imageUrl ? (pr.imageUrl.startsWith('/')?`${baseUrl}${pr.imageUrl}`:pr.imageUrl) : null;

  const ProductCard = ({pr}:{pr:any}) => (
    <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.07)',border:`1px solid ${p}15`,background:'white'}}>
      <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',background:`${p}10`,overflow:'hidden'}}>
        {imgSrc(pr)
          ? <img src={imgSrc(pr)!} alt={pr.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>
          : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={`${p}80`} strokeWidth="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
      </div>
      <div style={{padding:'14px 16px'}}>
        <div style={{display:'flex',alignItems:'start',justifyContent:'space-between',gap:8,marginBottom:4}}>
          <p style={{fontWeight:600,fontSize:13,color:theme.textColor,lineHeight:1.3}}>{pr.name}</p>
          {s.showStockBadge!==false && <span style={{fontSize:10,padding:'2px 7px',borderRadius:999,fontWeight:600,flexShrink:0,background:pr.inStock?'#dcfce7':'#fee2e2',color:pr.inStock?'#16a34a':'#dc2626'}}>{pr.inStock?'In Stock':'Out'}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
          <span style={{fontWeight:800,color:p,fontSize:14}}>NPR {pr.price?.toLocaleString?.()}</span>
          <button style={{padding:'6px 14px',borderRadius:8,background:pr.inStock?p:'#d1d5db',color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:pr.inStock?'pointer':'not-allowed'}}>{pr.inStock?(s.ctaText||'Order'):'Unavailable'}</button>
        </div>
      </div>
    </div>
  );

  if (variant === 'grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Our Products'} subtitle={(s.subtitle as string)||'Browse our clinic inventory'} theme={theme}/>
          {s.showSearch!==false && <div style={{marginBottom:24,display:'flex',justifyContent:'center'}}><div style={{width:'100%',maxWidth:360,padding:'10px 16px',borderRadius:10,border:`1.5px solid ${p}40`,color:'#9ca3af',background:'white',fontSize:14}}>Search products…</div></div>}
          <div style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    const [first,...rest] = display;
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Featured Products'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:16}}>
            {first && (
              <div style={{borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.1)',background:'white',gridRow:'span 2'}}>
                <div style={{height:240,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {imgSrc(first) ? <img src={imgSrc(first)!} alt={first.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:48,opacity:0.4}}>💊</span>}
                </div>
                <div style={{padding:24}}>
                  <span style={{fontSize:11,background:`${p}15`,color:p,padding:'3px 10px',borderRadius:999,fontWeight:700}}>Featured</span>
                  <h3 style={{fontWeight:700,color:theme.textColor,margin:'10px 0 6px',fontSize:16}}>{first.name}</h3>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
                    <span style={{fontWeight:800,color:p,fontSize:18}}>NPR {first.price?.toLocaleString?.()}</span>
                    <button style={{padding:'8px 20px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer'}}>{s.ctaText||'Order'}</button>
                  </div>
                </div>
              </div>
            )}
            {rest.slice(0,4).map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pharmacy') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:theme.textColor}}>{s.title||'Pharmacy'}</h2>
              {s.subtitle && <p style={{fontSize:14,color:'#6b7280',marginTop:4}}>{s.subtitle}</p>}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['All','Vitamins','Skincare','Equipment','Medicine'].map(cat=>(
                <button key={cat} style={{padding:'6px 14px',borderRadius:999,fontSize:12,fontWeight:600,border:`1px solid ${cat==='All'?p:'#e5e7eb'}`,background:cat==='All'?p:'white',color:cat==='All'?'#fff':theme.textColor,cursor:'pointer'}}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gap:14,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category-tabs') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title as string||'Shop'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap',justifyContent:'center'}}>
            {['All Products','Supplements','Skincare','Devices','OTC Medicine'].map((cat,i)=>(
              <button key={cat} style={{padding:'8px 18px',borderRadius:999,fontSize:13,fontWeight:600,border:'none',background:i===0?p:'white',color:i===0?'#fff':theme.textColor,cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>{cat}</button>
            ))}
          </div>
          <div style={{display:'grid',gap:14,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.slice(0,cols*2).map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  // carousel
  if (variant === 'carousel') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Our Products'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>
            {display.map((pr:any)=>(
              <div key={pr.id} style={{minWidth:200,flexShrink:0}}><ProductCard pr={pr}/></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // supplement-showcase
  if (variant === 'supplement-showcase') {
    return (
      <div style={{...css,...padding,background:`${p}06`}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Supplements & Wellness'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {display.slice(0,8).map((pr:any)=>(
              <div key={pr.id} style={{background:'white',borderRadius:20,padding:20,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:`1px solid ${p}10`}}>
                <div style={{width:80,height:80,borderRadius:16,background:`${p}10`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',overflow:'hidden'}}>
                  {imgSrc(pr) ? <img src={imgSrc(pr)!} alt={pr.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:28}}>💊</span>}
                </div>
                <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:4}}>{pr.name}</div>
                <div style={{fontWeight:800,color:p,fontSize:15,marginBottom:10}}>NPR {pr.price?.toLocaleString?.()}</div>
                <button style={{width:'100%',padding:'7px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:'pointer'}}>{pr.inStock?(s.ctaText||'Order'):'Out'}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // premium-layout
  if (variant === 'premium-layout') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Premium Products'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)'}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.map((pr:any)=>(
              <div key={pr.id} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,overflow:'hidden'}}>
                <div style={{height:140,background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {imgSrc(pr) ? <img src={imgSrc(pr)!} alt={pr.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:36,opacity:0.5}}>💊</span>}
                </div>
                <div style={{padding:'14px 16px'}}>
                  <div style={{fontWeight:600,color:'#fff',fontSize:13,marginBottom:4}}>{pr.name}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                    <span style={{fontWeight:800,color:p,fontSize:14}}>NPR {pr.price?.toLocaleString?.()}</span>
                    <button style={{padding:'6px 12px',borderRadius:6,background:p,color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:'pointer'}}>{pr.inStock?'Order':'Out'}</button>
                  </div>
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
    <div style={{...css,...padding}}>
      <div className={wrapperClass}>
        <SectionTitle title={(s.title as string)||'Our Products'} subtitle={s.subtitle as string} theme={theme}/>
        <div style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${cols},1fr)`}}>
          {display.map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
        </div>
        <p style={{textAlign:'center',fontSize:11,marginTop:16,color:`${theme.textColor}50`}}>
          {isLive?`Showing ${display.length} products`:loadError?'Preview mode':'Loading…'}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI CHATBOT — 5 variants
// ══════════════════════════════════════════════════════════════════════════════
function AiChatbotPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'floating';
  const accent = (s.accentColor as string) || theme.primaryColor;
  const botName = (s.botName as string) || 'Clinic Assistant';
  const welcomeMsg = (s.welcomeMessage as string) || 'Hello! 👋 How can I help you today?';
  const p = theme.primaryColor;

  const msgs = [
    {from:'bot',text:welcomeMsg},
    {from:'user',text:'What are your opening hours?'},
    {from:'bot',text:(s.openingHours as string)||'Mon–Fri 9am–5pm, Sat 9am–1pm, Sunday Closed'},
    {from:'user',text:'How do I book an appointment?'},
    {from:'bot',text:'You can book online or call us. Would you like to go to the booking page?'},
  ];

  const ChatWindow = ({compact=false}:{compact?:boolean}) => (
    <div style={{background:'#fff',borderRadius:20,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.15)',border:'1px solid rgba(0,0,0,0.08)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:accent,color:'#fff'}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🤖</div>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>{botName}</div>
          <div style={{fontSize:11,opacity:0.85}}>● Online · AI Powered</div>
        </div>
        <div style={{marginLeft:'auto',opacity:0.7,fontSize:20,cursor:'pointer'}}>×</div>
      </div>
      <div style={{padding:'14px',display:'flex',flexDirection:'column',gap:10,minHeight:compact?160:200,maxHeight:compact?200:260,overflowY:'auto',background:'#f9fafb'}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.from==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'78%',padding:'9px 13px',borderRadius:m.from==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.from==='user'?accent:'#fff',color:m.from==='user'?'#fff':'#1f2937',fontSize:13,lineHeight:1.5,boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>{m.text}</div>
          </div>
        ))}
        <div style={{display:'flex',gap:4,padding:'8px 12px',width:'fit-content',background:'#fff',borderRadius:'18px 18px 18px 4px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
          {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:accent,opacity:0.4+i*0.2}}/>)}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderTop:'1px solid #e5e7eb',background:'#fff'}}>
        <input readOnly placeholder="Type your message…" style={{flex:1,padding:'9px 14px',borderRadius:20,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',background:'#f9fafb',color:'#6b7280'}}/>
        <button style={{width:36,height:36,borderRadius:'50%',background:accent,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,flexShrink:0}}>➤</button>
      </div>
    </div>
  );

  if (variant === 'floating' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)'}}>
        <div className={wrapperClass}>
          {(s.title||s.subtitle) && (
            <div style={{textAlign:'center',marginBottom:32}}>
              {s.title && <h2 style={{fontSize:28,fontWeight:700,color:theme.textColor,marginBottom:8}}>{s.title}</h2>}
              {s.subtitle && <p style={{fontSize:15,color:`${theme.textColor}aa`}}>{s.subtitle}</p>}
            </div>
          )}
          <div style={{maxWidth:440,margin:'0 auto'}}><ChatWindow/></div>
          <p style={{textAlign:'center',fontSize:11,color:`${theme.textColor}55`,marginTop:14}}>🤖 AI-powered · Knows your clinic hours, doctors & services</p>
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:48,alignItems:'start'}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:theme.textColor,marginBottom:16}}>{s.title||'Chat with Our AI Assistant'}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:24}}>{s.subtitle||'Get instant answers about appointments, services, opening hours, and more.'}</p>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[['🕐','Available 24/7','Get answers anytime'],['⚡','Instant Responses','No waiting on hold'],['🏥','Clinic Knowledge','Knows all our services & doctors']].map(([ic,ti,de])=>(
                  <div key={ti} style={{display:'flex',gap:14,alignItems:'center',background:'#f8faff',borderRadius:14,padding:'14px 18px'}}>
                    <span style={{fontSize:24}}>{ic}</span>
                    <div><div style={{fontWeight:700,fontSize:14,color:theme.textColor}}>{ti}</div><div style={{fontSize:12,color:'#9ca3af'}}>{de}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <ChatWindow/>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'full-panel') {
    return (
      <div style={{...css,...padding,background:`linear-gradient(135deg,${p}08,${p}15)`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Healthcare AI Assistant'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
            <ChatWindow/>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:'white',borderRadius:16,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
                <div style={{fontWeight:700,color:theme.textColor,marginBottom:12,fontSize:14}}>💬 Common Questions</div>
                {['What services do you offer?','How do I cancel an appointment?','Do you accept insurance?','What are your rates?'].map(q=>(
                  <div key={q} style={{padding:'8px 12px',background:'#f8faff',borderRadius:8,marginBottom:6,fontSize:13,color:'#374151',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {q}<span style={{color:p,fontSize:16}}>›</span>
                  </div>
                ))}
              </div>
              <div style={{background:accent,borderRadius:16,padding:20,color:'#fff'}}>
                <div style={{fontWeight:700,marginBottom:8,fontSize:14}}>📞 Prefer to Talk?</div>
                <div style={{fontSize:13,opacity:0.85,marginBottom:12}}>Our team is available during working hours.</div>
                <div style={{fontWeight:800,fontSize:18}}>{s.phone||'+1-800-CLINIC'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-ai') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:999,background:'rgba(139,92,246,0.2)',border:'1px solid rgba(139,92,246,0.4)',marginBottom:20}}>
                <span style={{fontSize:14}}>🤖</span><span style={{fontSize:13,color:'#a78bfa',fontWeight:600}}>AI-Powered Assistant</span>
              </div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:16}}>{s.title||'Meet Your AI Health Assistant'}</h2>
              <p style={{color:'rgba(255,255,255,0.65)',lineHeight:1.7,marginBottom:24}}>{s.subtitle||'Powered by advanced AI to answer your medical questions instantly.'}</p>
              {['Appointment scheduling','Symptom guidance','Doctor availability','Service information'].map(f=>(
                <div key={f} style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                  <CheckCircle size={14} color={accent}/><span style={{fontSize:14,color:'rgba(255,255,255,0.75)'}}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{maxWidth:380}}><ChatWindow compact/></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <SectionTitle title={s.title||'Chat with Us'} subtitle={s.subtitle} theme={theme}/>
            <ChatWindow compact/>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)'}}>
      <div className={wrapperClass}>
        <div style={{maxWidth:440,margin:'0 auto'}}><ChatWindow/></div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WHATSAPP BUTTON — 4 variants
// ══════════════════════════════════════════════════════════════════════════════
function WhatsAppButtonPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const accent = (s.accentColor as string) || '#25D366';
  const bannerText = (s.bannerText as string) || 'How can I help you?';
  const bannerSub = (s.bannerSubText as string) || 'Chat with us on WhatsApp';

  const WAIcon = ({size=26}:{size?:number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  const variant = s.variant ?? 'floating-circle';

  if (variant === 'floating-circle' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:28}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#1f2937',marginBottom:6}}>{s.title||'WhatsApp Chat Button'}</h2>
            <p style={{color:'#6b7280',fontSize:13}}>A floating WhatsApp button will appear on your website.</p>
          </div>
          <div style={{position:'relative',maxWidth:360,margin:'0 auto',background:'#f3f4f6',borderRadius:20,minHeight:260,border:'2px dashed #d1d5db',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{color:'#9ca3af',fontSize:13,textAlign:'center'}}>Your website content</div>
            <div style={{position:'absolute',bottom:20,right:20,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
              <div style={{background:'#fff',borderRadius:12,padding:'12px 16px',boxShadow:'0 8px 24px rgba(0,0,0,0.12)',maxWidth:220,border:'1px solid rgba(37,211,102,0.2)'}}>
                <div style={{position:'absolute',top:-6,right:10,color:'#9ca3af',cursor:'pointer',fontSize:12}}>×</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><WAIcon size={18}/></div>
                  <div><div style={{fontWeight:700,fontSize:13,color:'#1f2937'}}>{bannerText}</div><div style={{fontSize:11,color:'#6b7280'}}>{bannerSub}</div></div>
                </div>
                <button style={{width:'100%',padding:'8px',background:accent,color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',marginTop:8}}>Chat on WhatsApp</button>
              </div>
              <button style={{width:56,height:56,borderRadius:'50%',background:accent,border:'none',boxShadow:'0 6px 20px rgba(37,211,102,0.45)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><WAIcon size={28}/></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating-pill') {
    return (
      <div style={{...css,...padding,background:'linear-gradient(135deg,#f0fdf4,#dcfce7)'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:28}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#1f2937',marginBottom:6}}>{s.title||'WhatsApp Chat — Pill Style'}</h2>
            <p style={{color:'#6b7280',fontSize:13}}>A pill-shaped chat button appears at the bottom of the page.</p>
          </div>
          <div style={{position:'relative',maxWidth:360,margin:'0 auto',background:'#f3f4f6',borderRadius:20,minHeight:220,border:'2px dashed #d1d5db',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{color:'#9ca3af',fontSize:13}}>Your website content</div>
            <div style={{position:'absolute',bottom:20,right:20}}>
              <button style={{display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderRadius:999,background:accent,border:'none',cursor:'pointer',boxShadow:'0 6px 20px rgba(37,211,102,0.45)'}}>
                <WAIcon size={22}/>
                <span style={{color:'#fff',fontWeight:700,fontSize:14}}>{s.buttonText||'Chat with us'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bottom-bar') {
    return (
      <div style={{...css,...padding,background:'#f0fdf4'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#1f2937',marginBottom:6}}>{s.title||'WhatsApp — Bottom Bar'}</h2>
            <p style={{color:'#6b7280',fontSize:13}}>A full-width WhatsApp bar appears at the bottom of the page.</p>
          </div>
          <div style={{background:accent,borderRadius:12,padding:'14px 24px',display:'flex',alignItems:'center',gap:16}}>
            <WAIcon size={24}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#fff',fontSize:14}}>{bannerText}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>{bannerSub}</div>
            </div>
            <button style={{padding:'8px 20px',borderRadius:8,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.5)',color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer',flexShrink:0}}>Chat Now</button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-avatar') {
    return (
      <div style={{...css,...padding,background:'#f0fdf4'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <h2 style={{fontSize:22,fontWeight:700,color:'#1f2937',marginBottom:6}}>{s.title||'Doctor WhatsApp Chat'}</h2>
            <p style={{color:'#6b7280',fontSize:13}}>Chat directly with our medical team.</p>
          </div>
          <div style={{maxWidth:320,margin:'0 auto',background:'white',borderRadius:20,padding:28,boxShadow:'0 8px 32px rgba(0,0,0,0.1)',textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:`${theme.primaryColor}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',border:`3px solid ${theme.primaryColor}30`}}>
              <Users size={32} color={theme.primaryColor}/>
            </div>
            <div style={{fontWeight:700,color:'#1f2937',fontSize:16,marginBottom:4}}>{s.doctorName||'Dr. Assistant'}</div>
            <div style={{fontSize:13,color:'#6b7280',marginBottom:6}}>{s.doctorTitle||'Medical Team'}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:18}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e'}}/>
              <span style={{fontSize:12,color:'#6b7280'}}>Online now</span>
            </div>
            <button style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'12px',borderRadius:10,background:accent,color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(37,211,102,0.4)'}}>
              <WAIcon size={20}/> Chat on WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'linear-gradient(135deg,#f0fdf4,#dcfce7)'}}>
      <div className={wrapperClass}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <h2 style={{fontSize:22,fontWeight:700,color:'#1f2937',marginBottom:6}}>{s.title||'WhatsApp Chat'}</h2>
        </div>
        <div style={{maxWidth:320,margin:'0 auto',textAlign:'center'}}>
          <button style={{display:'inline-flex',alignItems:'center',gap:12,padding:'14px 32px',borderRadius:12,background:accent,color:'#fff',fontWeight:700,fontSize:16,border:'none',cursor:'pointer',boxShadow:'0 6px 20px rgba(37,211,102,0.4)'}}>
            <WAIcon size={24}/>{s.buttonText||'Chat on WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOG / HEALTH ARTICLES — 10 variants
// ══════════════════════════════════════════════════════════════════════════════
function BlogPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'modern-grid';
  const p = theme.primaryColor;

  const samplePosts = [
    { id:'1', title:'Understanding Heart Health: Tips for a Stronger Cardiovascular System', excerpt:'Learn how lifestyle choices affect your heart and what you can do today to improve cardiovascular health.', category:'Cardiology', author:'Dr. Smith', date:'May 12, 2025', readTime:'5 min', image:'' },
    { id:'2', title:'Skincare Routines: What Dermatologists Actually Recommend', excerpt:'Dermatologists share the evidence-based skincare routines that actually work for different skin types.', category:'Dermatology', author:'Dr. Patel', date:'May 8, 2025', readTime:'4 min', image:'' },
    { id:'3', title:'Managing Diabetes: A Comprehensive Guide for Patients', excerpt:'Practical strategies for managing blood sugar, diet, exercise and medication for type 2 diabetes.', category:'Endocrinology', author:'Dr. Chen', date:'Apr 29, 2025', readTime:'7 min', image:'' },
    { id:'4', title:"Children's Vaccination Schedule: What Every Parent Should Know", excerpt:"An updated guide to childhood vaccinations, timing, and why they matter for your child's long-term health.", category:'Pediatrics', author:'Dr. Lee', date:'Apr 20, 2025', readTime:'6 min', image:'' },
    { id:'5', title:'Mental Health in the Workplace: Recognizing Signs of Burnout', excerpt:'How to identify, address, and prevent burnout before it affects your productivity and relationships.', category:'Mental Health', author:'Dr. Nguyen', date:'Apr 15, 2025', readTime:'5 min', image:'' },
    { id:'6', title:'Physiotherapy After Surgery: Recovery Tips from Specialists', excerpt:'Expert advice on post-surgical physiotherapy to speed recovery and regain full function safely.', category:'Physiotherapy', author:'Dr. Kumar', date:'Apr 10, 2025', readTime:'4 min', image:'' },
  ];

  const posts: any[] = (() => {
    const raw: any[] = (s.posts as any[])?.length ? s.posts : samplePosts;
    const hidden: string[] = (s.hiddenPostIds as string[]) || [];
    const max = s.maxPosts ? Number(s.maxPosts) : 6;
    return raw.filter(p => !hidden.includes(p.id)).slice(0, max);
  })();

  const PostCard = ({ post, horizontal=false }: { post: any; horizontal?: boolean }) => (
    <div style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1px solid ${p}10`, display:horizontal?'flex':'block', cursor:'pointer' }}>
      <div style={{ height:horizontal?'auto':160, width:horizontal?140:'auto', minWidth:horizontal?140:undefined, background:`${p}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {post.image ? <img src={resolveImg(post.image)} alt={post.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:36,opacity:0.4}}>📰</span>}
      </div>
      <div style={{padding:horizontal?'14px 18px':'16px 18px',flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 8px',borderRadius:999}}>{post.category}</span>
          <span style={{fontSize:11,color:'#9ca3af'}}>⏱ {post.readTime} read</span>
        </div>
        <h3 style={{fontWeight:700,color:theme.textColor,fontSize:horizontal?13:14,lineHeight:1.4,marginBottom:6}}>{post.title}</h3>
        {!horizontal && <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5,marginBottom:10}}>{post.excerpt?.slice(0,80)}…</p>}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:p}}>{post.author?.[3]||'D'}</div>
          <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.date}</span>
        </div>
      </div>
    </div>
  );

  if (variant === 'modern-grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Articles'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {posts.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'magazine') {
    const [featured,...rest] = posts;
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Magazine'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:24,marginBottom:24}}>
            <div style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',cursor:'pointer',border:`1px solid ${p}10`}}>
              <div style={{height:280,background:`${p}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {featured?.image ? <img src={resolveImg(featured.image)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:64,opacity:0.3}}>📰</span>}
              </div>
              <div style={{padding:28}}>
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  <span style={{fontSize:11,fontWeight:700,color:p,background:`${p}12`,padding:'3px 10px',borderRadius:999}}>{featured?.category}</span>
                  <span style={{fontSize:11,color:'#9ca3af'}}>⏱ {featured?.readTime} read</span>
                </div>
                <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.4rem',fontWeight:700,color:theme.textColor,marginBottom:10,lineHeight:1.4}}>{featured?.title}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.6,marginBottom:16}}>{featured?.excerpt}</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'#9ca3af'}}>{featured?.author} · {featured?.date}</span>
                  <span style={{fontSize:13,color:p,fontWeight:600}}>Read More →</span>
                </div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {rest.slice(0,3).map((post,i)=><PostCard key={i} post={post} horizontal/>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Tips'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'auto auto',gap:16}}>
            {posts.slice(0,5).map((post,i)=>(
              <div key={i} style={{borderRadius:20,overflow:'hidden',background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:'white',gridColumn:i===0?'span 2':undefined,boxShadow:i===0?`0 8px 32px ${p}30`:'0 2px 12px rgba(0,0,0,0.07)',cursor:'pointer',border:i!==0?`1px solid ${p}10`:'none'}}>
                {i===0 ? (
                  <div style={{padding:32}}>
                    <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.2)',padding:'3px 10px',borderRadius:999,marginBottom:14,display:'inline-block'}}>{post.category}</span>
                    <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.3rem',fontWeight:700,color:'#fff',marginBottom:10,lineHeight:1.4}}>{post.title}</h2>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.8)',lineHeight:1.5,marginBottom:16}}>{post.excerpt?.slice(0,100)}…</p>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>{post.author} · {post.readTime} read</span>
                  </div>
                ) : (
                  <div style={{padding:'18px 20px'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 8px',borderRadius:999,marginBottom:8,display:'inline-block'}}>{post.category}</span>
                    <h3 style={{fontWeight:700,color:theme.textColor,fontSize:13,lineHeight:1.4,marginBottom:6}}>{post.title}</h3>
                    <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.readTime} read</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured-article') {
    const [feat,...rest] = posts;
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Featured Article'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center',marginBottom:40}}>
            <div style={{aspectRatio:'4/3',borderRadius:20,background:`${p}15`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {feat?.image ? <img src={resolveImg(feat.image)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:64,opacity:0.3}}>📰</span>}
            </div>
            <div>
              <span style={{fontSize:11,fontWeight:700,color:p,background:`${p}12`,padding:'3px 10px',borderRadius:999,marginBottom:14,display:'inline-block'}}>{feat?.category}</span>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,lineHeight:1.3,marginBottom:14}}>{feat?.title}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:20,fontSize:15}}>{feat?.excerpt}</p>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p}}>{feat?.author?.[3]||'D'}</div>
                <div><div style={{fontWeight:600,color:theme.textColor,fontSize:13}}>{feat?.author}</div><div style={{fontSize:11,color:'#9ca3af'}}>{feat?.date} · {feat?.readTime} read</div></div>
              </div>
              <button style={{padding:'11px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>Read Full Article</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {rest.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div style={{...css,...padding,background:`${p}08`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Latest Articles'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,overflowX:'auto',paddingBottom:8}}>
            {posts.map((post,i)=>(
              <div key={i} style={{minWidth:280,flexShrink:0,background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}>
                <div style={{height:160,background:`${p}${14+i*5}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:36,opacity:0.4}}>📰</span>
                </div>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 8px',borderRadius:999}}>{post.category}</span>
                    <span style={{fontSize:10,color:'#9ca3af'}}>⏱ {post.readTime}</span>
                  </div>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:13,lineHeight:1.4,marginBottom:8}}>{post.title}</h3>
                  <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.date}</span>
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

  if (variant === 'doctor-articles') {
    const byDoctor = [
      {doc:'Dr. Smith',spec:'Cardiology',posts:posts.slice(0,2)},
      {doc:'Dr. Patel',spec:'Dermatology',posts:posts.slice(2,4)},
    ];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'From Our Doctors'} subtitle={s.subtitle} theme={theme}/>
          {byDoctor.map((group,gi)=>(
            <div key={gi} style={{marginBottom:36}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p,fontSize:16,flexShrink:0}}>{group.doc[3]}</div>
                <div><div style={{fontWeight:700,color:theme.textColor}}>{group.doc}</div><div style={{fontSize:12,color:p,fontWeight:600}}>{group.spec}</div></div>
                <div style={{flex:1,height:1,background:'#e5e7eb',marginLeft:8}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {group.posts.map((post,i)=><PostCard key={i} post={post} horizontal/>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'health-tips') {
    return (
      <div style={{...css,...padding,background:'#f0fdf4'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Tips'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            {posts.slice(0,4).map((post,i)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:'18px 22px',display:'flex',gap:16,alignItems:'flex-start',boxShadow:'0 2px 10px rgba(0,0,0,0.05)',border:`1px solid ${p}10`}}>
                <div style={{width:48,height:48,borderRadius:12,background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22}}>
                  {['❤️','🌿','🩺','🏃'][i%4]}
                </div>
                <div>
                  <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 7px',borderRadius:999,marginBottom:6,display:'inline-block'}}>{post.category}</span>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,lineHeight:1.4,marginBottom:4}}>{post.title}</h3>
                  <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5,marginBottom:8}}>{post.excerpt?.slice(0,70)}…</p>
                  <span style={{fontSize:11,color:p,fontWeight:600}}>Read More →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'latest-articles') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.6rem',fontWeight:700,color:theme.textColor}}>{s.title||'Latest Articles'}</h2>
            <span style={{fontSize:13,color:p,fontWeight:600,cursor:'pointer'}}>View All →</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {posts.slice(0,5).map((post,i)=>(
              <div key={i} style={{display:'flex',gap:16,alignItems:'center',padding:'16px 0',borderBottom:'1px solid #f1f5f9',cursor:'pointer'}}>
                <div style={{width:80,height:60,borderRadius:10,background:`${p}${14+i*4}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20,opacity:0.6}}>📰</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p}}>{post.category}</span>
                    <span style={{fontSize:10,color:'#9ca3af'}}>· {post.readTime} read</span>
                  </div>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,lineHeight:1.4,marginBottom:4}}>{post.title}</h3>
                  <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category-showcase') {
    const cats = ['All','Cardiology','Dermatology','Pediatrics','Mental Health','Physiotherapy'];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Browse by Category'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:28}}>
            {cats.map((cat,i)=>(
              <button key={i} style={{padding:'7px 18px',borderRadius:999,border:'none',background:i===0?p:'white',color:i===0?'#fff':theme.textColor,fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>{cat}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {posts.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'editorial') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{borderBottom:`2px solid ${p}20`,marginBottom:32,paddingBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:300,color:theme.textColor,letterSpacing:'-0.02em'}}>{s.title||'Health Insights'}</h2>
            <span style={{fontSize:12,color:p,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer'}}>All Articles →</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:40}}>
            <div>
              {posts.slice(0,1).map((post,i)=>(
                <div key={i} style={{cursor:'pointer'}}>
                  <div style={{aspectRatio:'16/9',borderRadius:16,background:`${p}18`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                    <span style={{fontSize:48,opacity:0.3}}>📰</span>
                  </div>
                  <div style={{display:'flex',gap:10,marginBottom:10}}>
                    <span style={{fontSize:11,fontWeight:700,color:p,textTransform:'uppercase',letterSpacing:'0.08em'}}>{post.category}</span>
                    <span style={{color:'#e5e7eb'}}>·</span>
                    <span style={{fontSize:11,color:'#9ca3af'}}>{post.date}</span>
                  </div>
                  <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.4rem',fontWeight:700,color:theme.textColor,lineHeight:1.3,marginBottom:10}}>{post.title}</h2>
                  <p style={{color:'#6b7280',lineHeight:1.7,fontSize:14}}>{post.excerpt}</p>
                </div>
              ))}
            </div>
            <div style={{borderLeft:`1px solid #f1f5f9`,paddingLeft:32}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16}}>More Articles</div>
              <div style={{display:'flex',flexDirection:'column',gap:18}}>
                {posts.slice(1,5).map((post,i)=>(
                  <div key={i} style={{cursor:'pointer',paddingBottom:18,borderBottom:i<3?'1px solid #f1f5f9':'none'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p,marginBottom:4,display:'block'}}>{post.category}</span>
                    <h4 style={{fontWeight:700,color:theme.textColor,fontSize:13,lineHeight:1.4,marginBottom:4}}>{post.title}</h4>
                    <span style={{fontSize:11,color:'#9ca3af'}}>{post.readTime} read</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title||'Health Articles'} subtitle={s.subtitle} theme={theme}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {posts.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CLINIC INFO — 8 variants
// ══════════════════════════════════════════════════════════════════════════════
function ClinicInfoPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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


// ══════════════════════════════════════════════════════════════════════════════
// PATIENT LOGIN — builder canvas preview
// ══════════════════════════════════════════════════════════════════════════════
function PatientLoginPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const p = theme.primaryColor || '#0ea5e9';
  const title = (s.title as string) || 'Patient Portal Login';
  const subtitle = (s.subtitle as string) || 'Access your appointments, records, and prescriptions';
  return (
    <div className={wrapperClass} style={{ ...css, ...padding }}>
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: p, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
          Patient Access
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: theme.textColor || '#111827', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{subtitle}</div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input disabled placeholder="Phone or Email" style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#9ca3af', width: '100%', background: 'white' }} />
          <button disabled style={{ background: p, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'default', opacity: 0.7 }}>
            {(s.ctaText as string) || 'Send OTP'}
          </button>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>An OTP will be sent to your phone/email</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DIVIDER — 6 variants
// ══════════════════════════════════════════════════════════════════════════════
function DividerPreview({ s }: { s: Record<string, any> }) {
  const variant = s.variant ?? s.style ?? 'line';
  const color = (s.color as string) || '#e5e7eb';
  const thickness = (s.thickness as number) || 1;

  if (variant === 'wave') {
    return (
      <div style={{overflow:'hidden',lineHeight:0}}>
        <svg viewBox="0 0 1200 60" fill={color} preserveAspectRatio="none" style={{width:'100%',height:40}}>
          <path d="M0,30 C300,60 900,0 1200,30 L1200,60 L0,60 Z"/>
        </svg>
      </div>
    );
  }
  if (variant === 'gradient') {
    return <div style={{padding:'12px 0'}}><div style={{height:thickness,background:`linear-gradient(90deg,transparent,${color},transparent)`}}/></div>;
  }
  if (variant === 'dashed') {
    return <div style={{padding:'12px 32px'}}><hr style={{border:'none',borderTop:`${thickness}px dashed ${color}`}}/></div>;
  }
  if (variant === 'dotted') {
    return <div style={{padding:'10px 32px'}}><hr style={{border:'none',borderTop:`${thickness}px dotted ${color}`}}/></div>;
  }
  if (variant === 'thick') {
    return <div style={{padding:'8px 32px'}}><div style={{height:4,background:color,borderRadius:2}}/></div>;
  }
  if (variant === 'icon') {
    return (
      <div style={{padding:'12px 32px',display:'flex',alignItems:'center',gap:16}}>
        <div style={{flex:1,height:thickness,background:color}}/>
        <Heart size={18} color={color} fill={color}/>
        <div style={{flex:1,height:thickness,background:color}}/>
      </div>
    );
  }
  // line default
  return <div style={{padding:'8px 32px'}}><hr style={{borderColor:color,borderWidth:thickness,borderStyle:'solid'}}/></div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPACER — smart presets
// ══════════════════════════════════════════════════════════════════════════════
function SpacerPreview({ s }: { s: Record<string, any> }) {
  const presetMap: Record<string,number> = {small:20,medium:48,large:80,xl:120,xxl:160};
  const h = (s.presetSize && presetMap[s.presetSize]) ? presetMap[s.presetSize] : (s.height as number) || 80;
  return (
    <div style={{height:h}} className="bg-gray-50/50 border border-dashed border-gray-200 mx-4 my-2 rounded flex items-center justify-center">
      <span className="text-xs text-gray-300">{s.presetSize ? `${s.presetSize} spacer` : `${h}px spacer`}</span>
    </div>
  );
}