'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

export function BookingSection({ s, theme, subdomain, branches: propBranches, containerClass }: SecProps) {
  const [step,           setStep]           = useState(1);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate,   setSelectedDate]   = useState('');
  const [selectedSlot,   setSelectedSlot]   = useState('');
  const [form, setForm] = useState({
    patientName: '', patientPhone: '', patientEmail: '', notes: '',
  });
  const [success, setSuccess] = useState(false);

  const { data: liveBranches } = useQuery<any[]>({
    queryKey:  ['branches', subdomain],
    queryFn:   () => websitePublicApi.getBranches(subdomain),
    staleTime: 300_000,
  });
  const branches = (liveBranches && liveBranches.length > 0) ? liveBranches : (propBranches ?? []);

  const { data: doctors } = useQuery<any[]>({
    queryKey:  ['pub-doctors', subdomain, selectedBranch],
    queryFn:   () => websitePublicApi.getDoctors(subdomain, selectedBranch || undefined),
    staleTime: 60_000,
  });

  const { data: slots } = useQuery<Record<string, string[]>>({
    queryKey: ['slots', subdomain, selectedBranch, selectedDoctor],
    queryFn: () =>
      websitePublicApi.getAvailableSlots(subdomain, selectedBranch || undefined, selectedDoctor || undefined),
    enabled:   true,
    staleTime: 30_000,
  });

  const bookMutation = useMutation({
    mutationFn: (data: any) => websitePublicApi.book(subdomain, data),
    onSuccess: () => setSuccess(true),
  });

  const normalisedSlots: Record<string, string[]> = React.useMemo(() => {
    if (!slots) return {};
    if (Array.isArray(slots)) {
      const map: Record<string, string[]> = {};
      (slots as unknown as string[]).forEach(iso => {
        const d = iso.split('T')[0];
        const t = iso.split('T')[1]?.slice(0, 5) ?? iso;
        if (!map[d]) map[d] = [];
        map[d].push(t);
      });
      return map;
    }
    return slots as Record<string, string[]>;
  }, [slots]);

  const dateSlots: string[] = selectedDate ? (normalisedSlots[selectedDate] ?? []) : [];

  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const fields = (s.formFields as Record<string, boolean> | undefined) ?? {};
  const p = theme.primaryColor;
  // Normalize: 'classic' was the old sectionMeta default but renders as 'multi-step'
  const rawVariant = (s.variant as string) ?? 'multi-step';
  const variant    = rawVariant === 'classic' ? 'multi-step' : rawVariant;

  if (success) {
    return (
      <div className="py-14 sm:py-20" style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
        <div className={containerClass}>
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="flex justify-center mb-4">
              <CheckCircle size={56} className="text-green-500" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: theme.fontHeading }}>
              {(s.confirmationMessage as string) || 'Appointment Booked!'}
            </h3>
            <p className="text-gray-500">We will contact you shortly to confirm your appointment.</p>
            <button
              onClick={() => { setSuccess(false); setStep(1); setSelectedDate(''); setSelectedSlot(''); setForm({ patientName: '', patientPhone: '', patientEmail: '', notes: '' }); }}
              className="mt-6 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: theme.primaryColor }}
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const QuickForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[{ph:'Full Name',key:'patientName'},{ph:'Phone Number',key:'patientPhone'},{ph:'Email (optional)',key:'patientEmail'}].map(f => (
        <input key={f.key} placeholder={f.ph} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13, width: '100%', outline: 'none' }} />
      ))}
      <button onClick={() => bookMutation.mutate({
          patientName: form.patientName, patientPhone: form.patientPhone, patientEmail: form.patientEmail,
          doctorId: selectedDoctor || undefined, branchId: selectedBranch || undefined,
          scheduledAt: selectedDate && selectedSlot ? `${selectedDate}T${selectedSlot}:00` : (() => {
            const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
            return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}T10:00:00`;
          })(),
        })}
        disabled={bookMutation.isPending || !form.patientName}
        style={{ padding: '12px 24px', borderRadius: 8, background: p, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: !form.patientName ? 0.6 : 1 }}>
        {bookMutation.isPending ? 'Booking…' : (s.ctaText as string) || 'Book Now'}
      </button>
      {bookMutation.isError && <p style={{ color: '#ef4444', fontSize: 12 }}>Booking failed. Please try again.</p>}
    </div>
  );

  if (variant === 'quick-consult') {
    return (
      <div className="py-10 sm:py-14" style={{ background: `${p}08` }} id="booking">
        <div className={containerClass}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 540, margin: '0 auto', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: '1.4rem', fontWeight: 700, color: theme.textColor, marginBottom: 6 }}>{(s.title as string) || 'Quick Consultation'}</h2>
            {s.subtitle && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{s.subtitle as string}</p>}
            <QuickForm />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'sidebar-card') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }} id="booking">
        <div className={containerClass}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,3vw,40px)', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{(s.title as string) || 'Book an Appointment'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>{(s.subtitle as string) || 'Our specialists are ready to help you.'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[['📞', 'Call us anytime', '24/7 available'], ['📅', 'Online booking', 'Instant confirmation'], ['🏥', 'Walk-in welcome', 'No wait time']].map(([ic, t, d]) => (
                  <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontSize: 28 }}>{ic}</span>
                    <div><div style={{ fontWeight: 600, color: theme.textColor, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{d}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: `1px solid ${p}15` }}>
              <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 16, marginBottom: 18 }}>Book Now</h3>
              <QuickForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'emergency-booking') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }} id="booking">
        <div className={containerClass}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>EMERGENCY SERVICES</span>
              </div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: 16 }}>{(s.title as string) || 'Emergency Booking'}</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 24 }}>{(s.subtitle as string) || 'Available 24/7 for urgent care needs.'}</p>
              {s.emergencyPhone && <a href={`tel:${s.emergencyPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: '#ef4444', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>📞 {s.emergencyPhone as string}</a>}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 32 }}>
              <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 20 }}>Book Appointment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ph:'Full Name',key:'patientName'},{ph:'Phone Number',key:'patientPhone'}].map(f => (
                  <input key={f.key} placeholder={f.ph} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, width: '100%', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }} />
                ))}
                <button onClick={() => bookMutation.mutate({ patientName: form.patientName, patientPhone: form.patientPhone })}
                  style={{ padding: 12, borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  {bookMutation.isPending ? 'Booking…' : 'Request Emergency Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-first') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }} id="booking">
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {(doctors || []).slice(0, 4).map((doc: any) => (
              <div key={doc.id} onClick={() => setSelectedDoctor(doc.id === selectedDoctor ? '' : doc.id)}
                style={{ borderRadius: 16, padding: 20, textAlign: 'center', cursor: 'pointer', border: `2px solid ${selectedDoctor === doc.id ? p : '#e5e7eb'}`, background: selectedDoctor === doc.id ? `${p}08` : 'white', transition: 'all 0.15s' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${p}15`, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👨‍⚕️</div>
                <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 2 }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: p, fontWeight: 600 }}>{doc.specialization}</div>
              </div>
            ))}
          </div>
          <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}><QuickForm /></div>
        </div>
      </div>
    );
  }

  if (variant === 'full-width') {
    return (
      <div style={{ background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})`, padding: 'clamp(28px,5vw,60px) clamp(16px,3vw,32px)' }} id="booking">
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(24px,5vw,60px)', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{(s.title as string) || 'Book Your Appointment'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{(s.subtitle as string) || 'Quick, easy, and confirmed instantly.'}</p>
          </div>
          <div style={{ background: 'white', borderRadius: 20, padding: 32 }}>
            <QuickForm />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'treatment-first') {
    const services = (s.services as any[]) || [];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }} id="booking">
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,40px)' }}>
            <div>
              <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15, marginBottom: 16 }}>Select Treatment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(services.length ? services : [{ title: 'General Consultation' }, { title: 'Specialist Visit' }, { title: 'Health Checkup' }]).map((svc: any, i: number) => (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${i === 0 ? p : '#e5e7eb'}`, background: i === 0 ? `${p}08` : 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: theme.textColor, fontSize: 13 }}>{svc.title}</span>
                    {svc.price && <span style={{ fontSize: 12, color: p, fontWeight: 700 }}>{svc.price}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15, marginBottom: 18 }}>Your Details</h3>
              <QuickForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'sticky-cta') {
    return (
      <>
        <div className="py-14 sm:py-20" style={{ background: '#fff' }} id="booking">
          <div className={containerClass}>
            <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
            <div style={{ maxWidth: 520, margin: '0 auto' }}><QuickForm /></div>
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
          <a href="#booking" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 999, background: p, color: '#fff', fontWeight: 700, textDecoration: 'none', boxShadow: `0 8px 28px ${p}50`, fontSize: 14 }}>
            📅 Book Now
          </a>
        </div>
      </>
    );
  }

  if (variant === 'luxury') {
    return (
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: 480 }} id="booking">
        <div className={containerClass} style={{ paddingTop: 72, paddingBottom: 72 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>{s.title as string}</h2>}
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16 }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ maxWidth: 560, margin: '0 auto', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '36px 32px' }}>
            <QuickForm />
          </div>
        </div>
      </div>
    );
  }

  // default: multi-step
  return (
    <div className="py-14 sm:py-20" style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.02)' : '#ffffff' }} id="booking">
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="flex items-center justify-center mb-8 sm:mb-10 max-w-lg mx-auto">
          {(['Select', 'Schedule', 'Details', 'Confirm'] as const).map((label, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone = step > num;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${isDone ? 'bg-green-500 text-white' : isActive ? 'text-white' : 'bg-gray-200 text-gray-500'}`}
                    style={isActive ? { background: theme.primaryColor } : {}}>
                    {isDone ? '✓' : num}
                  </div>
                  <div className="text-[10px] sm:text-xs mt-1 font-medium" style={{ color: isActive ? theme.textColor : 'rgba(128,128,128,0.6)' }}>{label}</div>
                </div>
                {i < 3 && <div className="flex-1 h-0.5 mx-1 sm:mx-2 mb-4" style={{ background: step > i + 1 ? '#22c55e' : '#e5e7eb' }} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto rounded-2xl p-5 sm:p-8"
          style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.07)' : '#f9fafb', border: `1px solid ${isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.12)' : '#f0f0f0'}`, boxShadow: isColorDark(theme.backgroundColor) ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}>

          {step === 1 && (
            <div className="space-y-4 sm:space-y-5">
              <h3 className="font-bold text-lg sm:text-xl" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>Select Branch &amp; Doctor</h3>
              {fields.branchSelect !== false && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'inherit', opacity: 0.75 }}>Branch</label>
                  <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedDoctor(''); }}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }}>
                    <option value="">All Branches</option>
                    {(branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              {fields.doctorSelect !== false && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'inherit', opacity: 0.75 }}>Doctor</label>
                  <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }}>
                    <option value="">Any Available Doctor</option>
                    {(doctors ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ''}</option>)}
                  </select>
                </div>
              )}
              <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl text-white font-semibold text-base sm:text-lg" style={{ background: theme.primaryColor }}>Next</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 sm:space-y-5">
              <h3 className="font-bold text-lg sm:text-xl" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>Choose Date &amp; Time</h3>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'inherit', opacity: 0.75 }}>Date</label>
                <div className="grid grid-cols-7 gap-1">
                  {next14Days.map(date => {
                    const d = new Date(date);
                    const day = d.toLocaleDateString('en', { weekday: 'short' });
                    const num = d.getDate();
                    return (
                      <button key={date} onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center py-1.5 sm:py-2 rounded-lg border-2 text-[10px] sm:text-xs transition-all ${selectedDate === date ? 'text-white border-transparent' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                        style={selectedDate === date ? { background: theme.primaryColor } : {}}>
                        <span>{day}</span><span className="font-bold">{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedDate && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'inherit', opacity: 0.75 }}>Available Slots</label>
                  {dateSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {dateSlots.map(slot => (
                        <button key={slot} onClick={() => setSelectedSlot(slot)}
                          className={`py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all ${selectedSlot === slot ? 'text-white border-transparent' : 'border-gray-200 hover:border-blue-400 text-gray-700'}`}
                          style={selectedSlot === slot ? { background: theme.primaryColor } : {}}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-center py-4 opacity-50">No slots available for this date</p>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold text-sm sm:text-base" style={{ border: '1px solid rgba(128,128,128,0.4)', color: 'inherit' }}>Back</button>
                <button onClick={() => setStep(3)} disabled={!selectedDate || !selectedSlot} className="flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-50 text-sm sm:text-base" style={{ background: theme.primaryColor }}>Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg sm:text-xl" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>Your Details</h3>
              {fields.patientName !== false && (
                <input value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Full Name *"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }} />
              )}
              {fields.patientPhone !== false && (
                <input value={form.patientPhone} onChange={e => setForm(f => ({ ...f, patientPhone: e.target.value }))} placeholder="Phone Number *" type="tel"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }} />
              )}
              {fields.patientEmail !== false && (
                <input value={form.patientEmail} onChange={e => setForm(f => ({ ...f, patientEmail: e.target.value }))} placeholder="Email Address" type="email"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }} />
              )}
              {fields.notes !== false && (
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes / Reason for visit" rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none" style={{ border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }} />
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl font-semibold text-sm sm:text-base" style={{ border: '1px solid rgba(128,128,128,0.4)', color: 'inherit' }}>Back</button>
                <button onClick={() => setStep(4)} disabled={!form.patientName || !form.patientPhone} className="flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-50 text-sm sm:text-base" style={{ background: theme.primaryColor }}>Review</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h3 className="font-bold text-lg sm:text-xl" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>Confirm Appointment</h3>
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{selectedDate}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-semibold">{selectedSlot}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-semibold">{form.patientName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-semibold">{form.patientPhone}</span></div>
              </div>
              {bookMutation.isError && <p className="text-red-500 text-sm">Booking failed. Please try again.</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-semibold text-sm sm:text-base" style={{ border: '1px solid rgba(128,128,128,0.4)', color: 'inherit' }}>Edit</button>
                <button onClick={() => bookMutation.mutate({ patientName: form.patientName, patientPhone: form.patientPhone, patientEmail: form.patientEmail, doctorId: selectedDoctor, branchId: selectedBranch, scheduledAt: `${selectedDate}T${selectedSlot}:00`, notes: form.notes })}
                  disabled={bookMutation.isPending} className="flex-1 py-3 rounded-xl text-white font-semibold text-base sm:text-lg disabled:opacity-50" style={{ background: theme.primaryColor }}>
                  {bookMutation.isPending ? 'Booking…' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}