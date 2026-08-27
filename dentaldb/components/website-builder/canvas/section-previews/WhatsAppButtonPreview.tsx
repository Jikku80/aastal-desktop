'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { PreviewProps } from './types';

export function WhatsAppButtonPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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
