'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

// Leaflet is client-side only
const PublicLeafletMap = dynamic(() => import('./PublicLeafletMap'), { ssr: false });

export function ContactSection({ s, theme, subdomain, clinic, branches, containerClass }: SecProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [formError, setFormError] = useState('');

  // Always fetch live branches for the map / multi-location variant
  const { data: liveBranches } = useQuery<any[]>({
    queryKey:  ['branches', subdomain],
    queryFn:   () => websitePublicApi.getBranches(subdomain),
    staleTime: 300_000,
    enabled:   !!subdomain,
  });

  const allBranches = liveBranches?.length ? liveBranches : (branches ?? []);

  const contactMutation = useMutation({
    mutationFn: (dto: typeof form) => websitePublicApi.submitContact(subdomain, dto),
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Failed to send message. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim())    { setFormError('Name is required.'); return; }
    if (!form.email.trim())   { setFormError('Email is required.'); return; }
    if (!form.message.trim()) { setFormError('Message is required.'); return; }
    contactMutation.mutate(form);
  };

  const variant = (s.variant as string) ?? 'split';
  const p = theme.primaryColor;
  const isDark = isColorDark(theme.backgroundColor);

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, width: '100%', outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
    color: isDark ? 'rgba(255,255,255,0.9)' : '#1f2937',
    boxSizing: 'border-box' as const,
  };

  const InputField = ({ placeholder, value, onChange, type = 'text' }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
  );

  const SubmitBtn = ({ label = 'Send Message' }: { label?: string }) => (
    contactMutation.isSuccess
      ? <p style={{ color: '#22c55e', fontWeight: 600, textAlign: 'center' }}>✓ Message sent! We'll be in touch soon.</p>
      : <button type="submit" disabled={contactMutation.isPending}
          style={{ padding: '12px 24px', width: '100%', borderRadius: 10, background: p, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: contactMutation.isPending ? 0.6 : 1 }}>
          {contactMutation.isPending ? 'Sending…' : ((s.ctaText as string) || label)}
        </button>
  );

  const ContactForm = ({ compact = false }: { compact?: boolean }) => (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }} noValidate>
      <InputField placeholder="Your Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
      <InputField placeholder="Email Address *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
      {!compact && <InputField placeholder="Phone Number" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />}
      {!compact && <InputField placeholder="Subject" value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} />}
      <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Your message *"
        rows={compact ? 3 : 4} style={{ ...inputStyle, resize: 'none' }} />
      {formError && <p style={{ color: '#ef4444', fontSize: 12 }}>{formError}</p>}
      <SubmitBtn />
    </form>
  );

  const Details = ({ dark = false }: { dark?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(s.address || clinic?.address) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <MapPin size={16} color={dark ? 'rgba(255,255,255,0.5)' : p} style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,0.7)' : '#6b7280', lineHeight: 1.5 }}>
            {(s.address || clinic?.address) as string}
          </span>
        </div>
      )}
      {(s.phone || clinic?.phone) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Phone size={16} color={dark ? 'rgba(255,255,255,0.5)' : p} />
          <a href={`tel:${(s.phone || clinic?.phone) as string}`} style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,0.7)' : '#6b7280', textDecoration: 'none' }}>
            {(s.phone || clinic?.phone) as string}
          </a>
        </div>
      )}
      {(s.email || clinic?.email) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Mail size={16} color={dark ? 'rgba(255,255,255,0.5)' : p} />
          <a href={`mailto:${(s.email || clinic?.email) as string}`} style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,0.7)' : '#6b7280', textDecoration: 'none' }}>
            {(s.email || clinic?.email) as string}
          </a>
        </div>
      )}
    </div>
  );

  // ── Shared map widget that uses PublicLeafletMap when coords available ──────
  const BranchMap = ({ height = 360, showList = false }: { height?: number; showList?: boolean }) => {
    // Gather all pins: prefer branches with coords, fall back to clinic coords
    const branchPins = allBranches
      .filter((b: any) => b?.latitude != null && b?.longitude != null)
      .map((b: any) => ({
        id: b.id,
        latitude: Number(b.latitude),
        longitude: Number(b.longitude),
        label: b.name,
      }));

    const clinicLat = s.latitude != null ? Number(s.latitude) : clinic?.latitude != null ? Number(clinic.latitude) : null;
    const clinicLng = s.longitude != null ? Number(s.longitude) : clinic?.longitude != null ? Number(clinic.longitude) : null;
    const hasClinicCoords = clinicLat !== null && clinicLng !== null && !isNaN(clinicLat) && !isNaN(clinicLng);

    const markers = branchPins.length > 0
      ? branchPins
      : hasClinicCoords
      ? [{ latitude: clinicLat as number, longitude: clinicLng as number, label: (clinic?.name as string) || 'Clinic' }]
      : [];

    const embedUrl = (s.embedUrl as string | undefined)?.trim();
    const address  = ((s.address as string) || (clinic?.address as string) || '').trim();
    const directionsBase = address || (markers[0] ? `${markers[0].latitude},${markers[0].longitude}` : '');
    const directionsUrl = directionsBase
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsBase)}`
      : '#';

    return (
      <div>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height }}>
          {embedUrl ? (
            <iframe src={embedUrl} width="100%" height={height} style={{ border: 0, display: 'block' }} loading="lazy" title="Clinic map" />
          ) : markers.length > 0 ? (
            <PublicLeafletMap markers={markers} height={height} />
          ) : address ? (
            <GeocodedMap address={address} height={height} />
          ) : (
            <div style={{ height, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <MapPin size={32} color="#cbd5e1" />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>No location configured</span>
            </div>
          )}
          {directionsBase && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
              style={{ position: 'absolute', bottom: 12, right: 12, background: 'white', fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: p }}>
              <ExternalLink size={10} />Get Directions
            </a>
          )}
        </div>

        {/* Branch list below map */}
        {showList && allBranches.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allBranches.map((b: any, i: number) => (
              <div key={b.id || i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8faff', borderRadius: 12, border: `1px solid ${p}15` }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={16} color={p} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 2 }}>{b.name}</div>
                  {b.address && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{b.address}</div>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                    {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: 11, color: p, fontWeight: 600, textDecoration: 'none' }}>📞 {b.phone}</a>}
                    {(b.address || (b.latitude && b.longitude)) && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address || `${b.latitude},${b.longitude}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: '#6b7280', textDecoration: 'none' }}>📍 Directions</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Geocoded iframe fallback ─────────────────────────────────────────────────
  const GeocodedMap = ({ address, height }: { address: string; height: number }) => {
    const [src, setSrc] = React.useState('');
    React.useEffect(() => {
      const ctrl = new AbortController();
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'Accept-Language': 'en' }, signal: ctrl.signal })
        .then(r => r.json())
        .then((results: any[]) => {
          if (results?.length) {
            const rlat = parseFloat(results[0].lat), rlon = parseFloat(results[0].lon), d = 0.012;
            setSrc(`https://www.openstreetmap.org/export/embed.html?bbox=${rlon-d}%2C${rlat-d}%2C${rlon+d}%2C${rlat+d}&layer=mapnik&marker=${rlat}%2C${rlon}`);
          } else {
            setSrc(`https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(address)}`);
          }
        }).catch(() => setSrc(`https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(address)}`));
      return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (!src) return (
      <div style={{ height, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MapPin size={28} color="#cbd5e1" />
      </div>
    );
    return <iframe src={src} width="100%" height={height} style={{ border: 0, display: 'block' }} loading="lazy" title="Map" />;
  };

  // ── Branch cards grid ────────────────────────────────────────────────────────
  const BranchCards = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
      {allBranches.map((b: any, i: number) => (
        <div key={b.id || i} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', borderRadius: 16, padding: '18px 20px', border: `1px solid ${p}15`, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={18} color={p} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14 }}>{b.name}</div>
              {b.address && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4, marginTop: 2 }}>{b.address}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {b.phone && (
              <a href={`tel:${b.phone}`} style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={12} color={p} />{b.phone}
              </a>
            )}
            {b.email && (
              <a href={`mailto:${b.email}`} style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} color={p} />{b.email}
              </a>
            )}
            {b.hours && (
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color={p} />{b.hours}
              </div>
            )}
          </div>
          {(b.address || (b.latitude && b.longitude)) && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address || `${b.latitude},${b.longitude}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: p, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, background: `${p}12` }}>
              <ExternalLink size={10} />Get Directions
            </a>
          )}
        </div>
      ))}
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // VARIANTS
  // ────────────────────────────────────────────────────────────────────────────

  if (variant === 'minimal') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'white' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '0 24px' }}>
          <SectionTitle title={(s.title as string) || 'Contact Us'} subtitle={s.subtitle as string} theme={theme} />
          <ContactForm compact />
          <div style={{ display: 'flex', gap: 28, marginTop: 24, flexWrap: 'wrap' }}>
            {(s.phone || clinic?.phone) && <a href={`tel:${(s.phone || clinic?.phone) as string}`} style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>📞 {(s.phone || clinic?.phone) as string}</a>}
            {(s.email || clinic?.email) && <a href={`mailto:${(s.email || clinic?.email) as string}`} style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>✉️ {(s.email || clinic?.email) as string}</a>}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'classic') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid md:grid-cols-2 gap-10 sm:gap-14">
            <ContactForm />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Details />
              {allBranches.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 12 }}>Our Locations</div>
                  <BranchCards />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? '#0f172a' : '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid md:grid-cols-[2fr_3fr] overflow-hidden rounded-3xl shadow-2xl">
            <div style={{ background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})`, padding: 'clamp(28px,5vw,48px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontFamily: theme.fontHeading, fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Get in Touch</h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7 }}>We'd love to hear from you.</p>
              <Details dark />
              {allBranches.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Locations</div>
                  {allBranches.slice(0, 3).map((b: any, i: number) => (
                    <div key={b.id || i} style={{ marginBottom: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{b.name}</div>
                      {b.address && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{b.address}</div>}
                      {b.phone && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{b.phone}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: 'white', padding: 'clamp(24px,4vw,40px)' }}>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'emergency') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          <div className="grid md:grid-cols-2 gap-10 sm:gap-14 items-center">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.3)' }} />
                <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>24/7 EMERGENCY LINE</span>
              </div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, color: '#fff', marginBottom: 16, lineHeight: 1.2 }}>
                {(s.emergencyPhone as string) || (s.phone || clinic?.phone) as string || '1-800-CLINIC'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>{(s.subtitle as string) || 'Available around the clock for urgent care.'}</p>
              <Details dark />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 'clamp(20px,4vw,32px)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }} noValidate>
                <InputField placeholder="Your Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                <InputField placeholder="Phone Number *" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your urgency *"
                  rows={3} style={{ ...inputStyle, resize: 'none' }} />
                {formError && <p style={{ color: '#ef4444', fontSize: 12 }}>{formError}</p>}
                {contactMutation.isSuccess
                  ? <p style={{ color: '#22c55e', fontWeight: 600 }}>✓ Request received!</p>
                  : <button type="submit" disabled={contactMutation.isPending} style={{ width: '100%', padding: 13, borderRadius: 10, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 4 }}>
                      {contactMutation.isPending ? 'Sending…' : 'Send Emergency Request'}
                    </button>
                }
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'consultation') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : `${p}08` }}>
        <div className={containerClass}>
          <div className="grid md:grid-cols-2 gap-10 sm:gap-14 items-start">
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{(s.title as string) || 'Free Consultation'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>{(s.subtitle as string) || 'Talk to our specialists today.'}</p>
              <Details />
            </div>
            <div style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', borderRadius: 20, padding: 'clamp(20px,4vw,32px)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 16, marginBottom: 18 }}>Book Free Consultation</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'contact-map') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Details />
              <ContactForm />
            </div>
            <div>
              <BranchMap height={400} showList={allBranches.length > 1} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'contact-faq') {
    const faqs = (s.faqs as any[]) || [{ question: 'How do I book?', answer: 'Use our online booking form.' }, { question: 'What insurance do you accept?', answer: 'Most major plans accepted.' }];
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', borderRadius: 20, padding: 'clamp(20px,4vw,32px)', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15, marginBottom: 18 }}>Send a Message</h3>
              <ContactForm compact />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15, marginBottom: 18 }}>Common Questions</h3>
              {faqs.map((faq: any, i: number) => (
                <div key={i} style={{ marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: theme.textColor, fontSize: 14, marginBottom: 6 }}>{faq.question}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{faq.answer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dept-inquiry') {
    const depts = (s.departments as any[]) || ['General Medicine', 'Dermatology', 'Orthopedics', 'Cardiology'];
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Department Inquiry'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8faff', borderRadius: 20, padding: 'clamp(20px,4vw,32px)', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
              <select style={{ ...inputStyle }}>
                <option value="">Select Department</option>
                {(Array.isArray(depts) ? depts : []).map((d: any) => <option key={d} value={d}>{typeof d === 'string' ? d : d.name}</option>)}
              </select>
              <InputField placeholder="Your Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
              <InputField placeholder="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
              <InputField placeholder="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Your query *"
                rows={3} style={{ ...inputStyle, resize: 'none' }} />
              {formError && <p style={{ color: '#ef4444', fontSize: 12 }}>{formError}</p>}
              <SubmitBtn label="Submit Inquiry" />
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-inquiry') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : `${p}06` }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Contact a Doctor'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ name: 'Dr. Smith', spec: 'Cardiologist' }, { name: 'Dr. Patel', spec: 'Neurologist' }, { name: 'Dr. Kim', spec: 'Dermatologist' }].map((doc, i) => (
                <div key={i} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'white', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', border: `2px solid ${i === 0 ? p : 'transparent'}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👨‍⚕️</div>
                  <div><div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14 }}>{doc.name}</div><div style={{ fontSize: 12, color: p, fontWeight: 600 }}>{doc.spec}</div></div>
                </div>
              ))}
            </div>
            <div style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', borderRadius: 20, padding: 'clamp(20px,4vw,28px)', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-location') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Locations'} subtitle={s.subtitle as string} theme={theme} />
          {/* Map spanning all branches */}
          <div style={{ marginBottom: 28, borderRadius: 16, overflow: 'hidden' }}>
            <BranchMap height={340} />
          </div>
          {/* Branch cards */}
          {allBranches.length > 0
            ? <BranchCards />
            : (s.locations as any[])?.length
              ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,260px),1fr))', gap: 16 }}>
                  {(s.locations as any[]).map((loc: any, i: number) => (
                    <div key={i} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8faff', borderRadius: 16, padding: 20, border: `1px solid ${p}12` }}>
                      <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 10, fontSize: 14 }}>{loc.name}</h3>
                      {loc.address && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>📍 {loc.address}</div>}
                      {loc.phone && <div style={{ fontSize: 13, color: '#6b7280' }}>📞 <a href={`tel:${loc.phone}`} style={{ color: '#6b7280' }}>{loc.phone}</a></div>}
                    </div>
                  ))}
                </div>
              )
              : null
          }
          <div style={{ maxWidth: 480, margin: '32px auto 0', width: '100%' }}>
            <ContactForm />
          </div>
        </div>
      </div>
    );
  }

  // default: split
  return (
    <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="grid md:grid-cols-2 gap-10 sm:gap-14">
          <ContactForm />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {s.showDetails !== false && <Details />}
            {/* Map */}
            <div style={{ borderRadius: 16, overflow: 'hidden' }}>
              <BranchMap height={260} />
            </div>
            {/* Branch list if multi-branch clinic */}
            {allBranches.length > 1 && (
              <div>
                <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Our Locations</div>
                <BranchCards />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}