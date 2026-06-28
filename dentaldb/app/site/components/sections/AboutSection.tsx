'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function AboutSection({ s, theme, containerClass }: SecProps) {
  const variant = (s.variant as string) ?? 'split';
  const p = theme.primaryColor;
  const imgUrl = resolveImageUrl(s.image as string | undefined);
  const Img = ({ style }: { style: React.CSSProperties }) => imgUrl
    ? <img src={imgUrl} alt={(s.title as string) || 'About'} style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
    : <div style={{ width: '100%', height: '100%', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🏥</div>;

  if (variant === 'timeline') {
    const milestones: any[] = (s.milestones as any[]) || [
      { year: '2008', title: 'Clinic Founded', desc: 'Opened our first branch with a dedicated team.' },
      { year: '2013', title: 'Expanded Services', desc: 'Added specialist departments and advanced equipment.' },
      { year: '2019', title: 'Accreditation', desc: 'Achieved national accreditation for quality standards.' },
      { year: '2024', title: '10,000+ Patients', desc: 'Proudly serving thousands of families.' },
    ];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ position: 'relative', paddingLeft: 40 }}>
            <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: `${p}30` }} />
            {milestones.map((m, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 32, paddingLeft: 32 }}>
                <div style={{ position: 'absolute', left: -10, top: 4, width: 20, height: 20, borderRadius: '50%', background: p, border: '3px solid #fff', boxShadow: `0 0 0 3px ${p}30` }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: p, marginBottom: 4 }}>{m.year}</div>
                <div style={{ fontWeight: 700, color: theme.textColor, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mission-vision') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Mission & Vision'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[{ icon: '🎯', title: 'Our Mission', text: (s.mission as string) || 'To provide exceptional, patient-centered healthcare.' },
              { icon: '👁️', title: 'Our Vision', text: (s.vision as string) || 'To be the most trusted healthcare provider.' },
              { icon: '❤️', title: 'Our Values', text: (s.values as string) || 'Compassion, excellence, integrity and innovation.' }
            ].map((item, i) => (
              <div key={i} style={{ background: '#f8faff', borderRadius: 16, padding: 28, borderTop: `4px solid ${p}` }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: theme.textColor, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'founder-spotlight') {
    const founderImg = resolveImageUrl(s.founderImage as string | undefined);
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p}08 0%,white 100%)` }}>
        <div className={containerClass}>
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 items-center">
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 180, height: 180, borderRadius: '50%', background: `${p}15`, margin: '0 auto 16px', overflow: 'hidden', border: `4px solid ${p}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {founderImg ? <img src={founderImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 64 }}>👨‍⚕️</span>}
              </div>
              <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 18 }}>{(s.founderName as string) || 'Dr. Founder'}</div>
              <div style={{ color: p, fontSize: 13, fontWeight: 600 }}>{(s.founderTitle as string) || 'Founder & Chief Physician'}</div>
            </div>
            <div>
              <p style={{ fontSize: 13, color: p, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>A Message From Our Founder</p>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16 }}>{(s.title as string) || 'Our Clinic, Our Promise'}</h2>
              <p style={{ color: '#4b5563', lineHeight: 1.8, fontStyle: 'italic', borderLeft: `3px solid ${p}`, paddingLeft: 20, marginBottom: 16 }}>
                &ldquo;{(s.founderQuote as string) || 'Every patient deserves the very best in care.'}&rdquo;
              </p>
              <p style={{ color: '#6b7280', lineHeight: 1.7 }}>{s.body as string}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stats-integrated') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              {s.subtitle && <p style={{ color: p, fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{s.subtitle as string}</p>}
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 18 }}>{(s.title as string) || 'About Our Clinic'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>{s.body as string}</p>
              <div className="grid grid-cols-2 gap-4">
                {[{ val: '15+', lbl: 'Years Experience', icon: '🏥' }, { val: '10K+', lbl: 'Patients Treated', icon: '👥' }, { val: '50+', lbl: 'Specialists', icon: '👨‍⚕️' }, { val: '98%', lbl: 'Satisfaction', icon: '⭐' }].map((st, i) => (
                  <div key={i} style={{ background: `${p}08`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{st.icon}</span>
                    <div><div style={{ fontWeight: 800, color: p, fontSize: 20 }}>{st.val}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{st.lbl}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ aspectRatio: '3/4', borderRadius: 20, overflow: 'hidden' }}><Img style={{}} /></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-column') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[{ icon: '🏥', title: 'World-Class Facilities', text: 'State-of-the-art equipment and modern treatment rooms.' },
              { icon: '👨‍⚕️', title: 'Expert Medical Team', text: 'Board-certified specialists with decades of combined experience.' },
              { icon: '❤️', title: 'Patient-First Approach', text: 'Every decision we make puts your wellbeing first.' }
            ].map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
          {s.body && <p style={{ color: '#6b7280', lineHeight: 1.7, maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>{s.body as string}</p>}
        </div>
      </div>
    );
  }

  if (variant === 'awards') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              {s.subtitle && <p style={{ color: p, fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{s.subtitle as string}</p>}
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16 }}>{(s.title as string) || 'Recognized Excellence'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>{s.body as string}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['ISO 9001:2015', 'NABH Accredited', 'Best Clinic 2023', 'Patient Choice Award'].map(aw => (
                  <span key={aw} style={{ padding: '6px 14px', borderRadius: 999, background: `${p}10`, color: p, fontSize: 12, fontWeight: 600 }}>{aw}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{ icon: '🏆', title: 'Best Hospital', sub: '2023 Regional Award' }, { icon: '⭐', title: 'Top Rated', sub: '4.9 Patient Score' }, { icon: '🛡️', title: 'ISO Certified', sub: 'Quality Management' }, { icon: '🎓', title: 'Training Centre', sub: 'Medical Education' }].map((aw, i) => (
                <div key={i} style={{ background: '#f8faff', borderRadius: 16, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{aw.icon}</div>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13 }}>{aw.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{aw.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'story-layout') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p style={{ fontSize: 13, color: p, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Our Story</p>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, color: theme.textColor, lineHeight: 1.2, marginBottom: 20 }}>{(s.title as string) || 'How We Started'}</h2>
              <div style={{ width: 48, height: 3, background: p, marginBottom: 20 }} />
              <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: 16 }}>{s.body as string}</p>
              {s.ctaText && <a href="#booking" style={{ display: 'inline-block', marginTop: 24, padding: '11px 28px', borderRadius: 8, background: p, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>{s.ctaText as string}</a>}
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ aspectRatio: '4/5', borderRadius: 24, overflow: 'hidden' }}><Img style={{}} /></div>
              <div style={{ position: 'absolute', bottom: -20, right: -20, background: 'white', borderRadius: 16, padding: '18px 22px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                <div style={{ fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 800, color: p }}>{(s.yearsExp as string) || '15'}+</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Years of Care</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'split' || variant === 'classic') {
    const isRight2 = s.layout !== 'image-left';
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexDirection: isRight2 ? 'row' : 'row-reverse', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 45%', aspectRatio: '4/3', borderRadius: 16, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {imgUrl ? <img src={imgUrl} alt={(s.title as string) || 'About'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48 }}>🏥</span>}
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              {s.subtitle && <p style={{ color: p, fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{s.subtitle as string}</p>}
              {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16 }}>{s.title as string}</h2>}
              <p style={{ color: '#6b7280', lineHeight: 1.7 }}>{(s.body as string) || ''}</p>
              {s.showStats && (s.stats as any[])?.length > 0 && (
                <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
                  {(s.stats as any[]).map((st: any, i: number) => (
                    <div key={i}><div style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 800, color: p }}>{st.value}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{st.label}</div></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'image-gallery-style') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ aspectRatio: '4/3', borderRadius: 14, overflow: 'hidden', background: `${p}${15 + i * 8}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 36, opacity: 0.4 }}>🏥</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,3vw,40px)', alignItems: 'center' }}>
            <p style={{ color: '#6b7280', lineHeight: 1.8, fontSize: 15 }}>{(s.body as string) || 'We believe in delivering world-class care in a welcoming environment.'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{ v: '10K+', l: 'Patients' }, { v: '15+', l: 'Specialists' }, { v: '98%', l: 'Satisfaction' }].map((st, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontWeight: 800, color: p, fontSize: 20, minWidth: 50 }}>{st.v}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{st.l}</div>
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
    <div className="py-14 sm:py-20" style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
      <div className={containerClass}>
        <div className={`flex flex-col md:flex-row gap-8 sm:gap-12 items-center ${!isRight ? 'md:flex-row-reverse' : ''}`}>
          {imgUrl && (
            <div className="w-full md:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <Img style={{ borderRadius: 16 }} />
            </div>
          )}
          <div className="flex-1">
            {s.subtitle && <p style={{ color: p, fontWeight: 600, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{s.subtitle as string}</p>}
            {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16 }}>{s.title as string}</h2>}
            {s.body && <p style={{ color: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.65)' : '#4b5563', lineHeight: 1.7 }}>{s.body as string}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}