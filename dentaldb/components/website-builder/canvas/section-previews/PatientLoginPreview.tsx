'use client';

import React from 'react';
import type { PreviewProps } from './types';

export function PatientLoginPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
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
