'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function FaqPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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
