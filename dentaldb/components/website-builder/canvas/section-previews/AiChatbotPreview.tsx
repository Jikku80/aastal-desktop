'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function AiChatbotPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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
