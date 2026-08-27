'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import type { PreviewProps } from './types';

export function DividerPreview({ s }: { s: Record<string, any> }) {
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
