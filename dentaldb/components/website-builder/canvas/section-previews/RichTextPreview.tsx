'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { PreviewProps } from './types';

export function RichTextPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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
