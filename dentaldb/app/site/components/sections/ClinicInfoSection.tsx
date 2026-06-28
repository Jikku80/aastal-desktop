'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';
import { resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function ClinicInfoSection({ s, theme, containerClass }: SecProps) {
  const variant = (s.variant as string) ?? 'modern-card';
  const p = theme.primaryColor;

  if (variant === 'premium-overview') {
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p}06,${p}12)` }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,3vw,40px)', alignItems: 'start' }}>
            <div>
              <div style={{ width: 48, height: 3, background: p, marginBottom: 20 }} />
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16, lineHeight: 1.2 }}>{(s.title as string) || 'Excellence in Healthcare'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: 24, fontSize: 14 }}>{(s.description as string) || 'Delivering premium healthcare with compassion and precision.'}</p>
              {s.ctaText && <a href="#booking" style={{ display: 'inline-block', padding: '11px 24px', borderRadius: 6, background: p, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>{s.ctaText as string}</a>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { icon: '🏆', title: (s.achieve1 as string) || 'Award Winning',   desc: 'Recognized for clinical excellence.' },
                { icon: '🎓', title: (s.achieve2 as string) || 'Certified Doctors', desc: 'Board-certified specialists.' },
                { icon: '🔬', title: (s.achieve3 as string) || 'Advanced Tech',   desc: 'Latest diagnostic technology.' },
                { icon: '❤️', title: (s.achieve4 as string) || 'Patient Care',    desc: 'Compassionate, tailored care.' },
                { icon: '🌐', title: (s.achieve5 as string) || 'Global Standards', desc: 'ISO and accredited quality.' },
                { icon: '📅', title: (s.achieve6 as string) || 'Easy Access',     desc: 'Online booking available.' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 5 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'medical-excellence') {
    return (
      <div style={{ background: p, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: 'rgba(255,255,255,0.06)' }} />
        <div className="py-14 sm:py-20 relative z-10">
          <div className={containerClass}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(24px,5vw,64px)', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 12, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>Medical Excellence</p>
                <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, color: '#fff', marginBottom: 20, lineHeight: 1.2 }}>{(s.title as string) || 'Setting the Standard in Healthcare'}</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: 28, fontSize: 15 }}>{(s.description as string) || 'Our commitment to excellence drives everything we do.'}</p>
                {s.ctaText && <a href="#booking" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 8, background: '#fff', color: p, fontWeight: 700, textDecoration: 'none' }}>{s.ctaText as string}</a>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: '🏆', t: (s.achieve1 as string) || '5x Award Winner',    d: 'Best Healthcare Provider' },
                  { icon: '👨‍⚕️', t: (s.achieve2 as string) || '50+ Specialists',   d: 'Board Certified Experts' },
                  { icon: '🔬', t: (s.achieve3 as string) || 'Latest Technology',  d: 'State-of-the-art facilities' },
                  { icon: '⭐', t: (s.achieve4 as string) || '98% Satisfaction',   d: 'From thousands of patients' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{item.t}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{item.d}</div>
                    </div>
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
    const imgUrl = resolveImageUrl(s.image as string | undefined);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', minHeight: 480 }}>
        <div style={{ background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {imgUrl ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 80 }}>🏥</div>}
        </div>
        <div className="py-14 sm:py-20 px-8 sm:px-12 flex items-center">
          <div>
            {s.badge && <span style={{ fontSize: 11, fontWeight: 700, color: p, background: `${p}12`, padding: '4px 12px', borderRadius: 999, marginBottom: 14, display: 'inline-block' }}>{s.badge as string}</span>}
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16, lineHeight: 1.3 }}>{(s.title as string) || 'About Our Clinic'}</h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: 24, fontSize: 14 }}>{(s.description as string) || 'Dedicated to excellence in patient care.'}</p>
            {s.ctaText && <a href="#booking" style={{ display: 'inline-block', padding: '11px 24px', borderRadius: 8, background: p, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{s.ctaText as string}</a>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-column-overview') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Why Choose Us'} subtitle={(s.subtitle as string) || (s.description as string)} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { icon: '🏥', title: (s.col1Title as string) || 'Modern Facilities', desc: (s.col1Desc as string) || 'State-of-the-art equipment and comfortable treatment rooms.' },
              { icon: '👨‍⚕️', title: (s.col2Title as string) || 'Expert Team',      desc: (s.col2Desc as string) || 'Board-certified specialists with decades of experience.' },
              { icon: '❤️', title: (s.col3Title as string) || 'Patient Focus',    desc: (s.col3Desc as string) || 'Every decision centers on your wellbeing and comfort.' },
              { icon: '📅', title: (s.col4Title as string) || 'Easy Booking',     desc: (s.col4Desc as string) || 'Online and phone booking with flexible appointment slots.' },
            ].map((col, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 18, padding: '24px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: `4px solid ${p}` }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{col.icon}</div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 8, fontSize: 14 }}>{col.title}</h3>
                <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>{col.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline-history') {
    const timeline: any[] = (s.timeline as any[]) || [
      { year: '2008', event: 'Clinic founded with a vision for accessible healthcare.' },
      { year: '2013', event: 'Expanded to 20+ specialists and additional departments.' },
      { year: '2018', event: 'Achieved national accreditation. Opened second branch.' },
      { year: '2022', event: 'Launched digital health platform. Served 50,000+ patients.' },
    ];
    return (
      <div className="py-14 sm:py-20" style={{ background: 'white' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Journey'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ position: 'relative', paddingLeft: 56, maxWidth: 700, margin: '0 auto' }}>
            <div style={{ position: 'absolute', left: 20, top: 8, bottom: 8, width: 2, background: `linear-gradient(to bottom,${p},${p}40)` }} />
            {timeline.map((item: any, i: number) => (
              <div key={i} style={{ position: 'relative', marginBottom: 32, paddingLeft: 20 }}>
                <div style={{ position: 'absolute', left: -46, top: 4, width: 24, height: 24, borderRadius: '50%', background: i === 0 ? p : `${p}20`, border: `3px solid ${i === 0 ? '#fff' : p}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i === 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 999, background: `${p}12`, color: p, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{item.year}</div>
                <p style={{ color: '#4b5563', lineHeight: 1.7, fontSize: 14 }}>{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'founder-message') {
    return (
      <div className="py-14 sm:py-20" style={{ background: 'white' }}>
        <div className={containerClass}>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 56, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 160, height: 160, borderRadius: '50%', background: `${p}15`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, border: `4px solid ${p}25` }}>👨‍⚕️</div>
              <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 17 }}>{(s.founderName as string) || 'Dr. Founder'}</div>
              <div style={{ color: p, fontSize: 13, fontWeight: 600, marginTop: 4 }}>{(s.founderTitle as string) || 'Founder & Medical Director'}</div>
            </div>
            <div>
              <div style={{ fontSize: 60, color: `${p}20`, lineHeight: 0.8, marginBottom: 16, fontFamily: 'Georgia,serif' }}>&ldquo;</div>
              <p style={{ fontSize: '1.1rem', color: theme.textColor, lineHeight: 1.8, fontStyle: 'italic', marginBottom: 20 }}>{(s.message as string) || 'When I founded this clinic, my vision was simple: to provide the highest quality of care to every patient who walks through our doors.'}</p>
              <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 24, fontSize: 14 }}>{(s.description as string) || 'Today, with a dedicated team of specialists, we continue to honor that commitment every single day.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default: modern-card
  return (
    <div className="py-14 sm:py-20" style={{ background: 'white' }}>
      <div className={containerClass}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'center' }}>
          <div>
            {s.badge && <span style={{ fontSize: 11, fontWeight: 700, color: p, background: `${p}12`, padding: '4px 12px', borderRadius: 999, marginBottom: 14, display: 'inline-block' }}>{(s.badge as string) || 'About Us'}</span>}
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 14, lineHeight: 1.3 }}>{(s.title as string) || 'About Our Clinic'}</h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: 24, fontSize: 15 }}>{(s.description as string) || 'We provide world-class healthcare services with a patient-first approach. Our team of certified specialists is dedicated to your wellbeing.'}</p>
            {s.ctaText && <a href="#booking" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 8, background: p, color: '#fff', fontWeight: 700, border: 'none', textDecoration: 'none' }}>{s.ctaText as string}</a>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {[
              { v: (s.stat1Val as string) || '15+',  l: (s.stat1Lbl as string) || 'Years Experience', icon: '🏥' },
              { v: (s.stat2Val as string) || '10K+', l: (s.stat2Lbl as string) || 'Patients Treated',  icon: '👥' },
              { v: (s.stat3Val as string) || '50+',  l: (s.stat3Lbl as string) || 'Specialists',       icon: '👨‍⚕️' },
              { v: (s.stat4Val as string) || '98%',  l: (s.stat4Lbl as string) || 'Satisfaction',      icon: '⭐' },
            ].map((st, i) => (
              <div key={i} style={{ background: `${p}08`, borderRadius: 16, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{st.icon}</div>
                <div style={{ fontWeight: 800, color: p, fontSize: '1.4rem' }}>{st.v}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{st.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}