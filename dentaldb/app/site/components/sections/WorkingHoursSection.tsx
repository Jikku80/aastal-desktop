'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

export function WorkingHoursSection({ s, theme, subdomain, containerClass }: SecProps) {
  const { data: openingHoursData } = useQuery<any>({
    queryKey:  ['opening-hours', subdomain],
    queryFn:   () => websitePublicApi.getOpeningHours(subdomain),
    // Auto-pull unless explicitly set to 'manual' — undefined/live-api both auto-pull
    enabled:   s.dataSource !== 'manual',
    staleTime: 300_000,
  });

  const DAYS  = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  let hours: Record<string, any> = {};
  if (openingHoursData) {
    if (Array.isArray(openingHoursData.hours)) {
      openingHoursData.hours.forEach((h: any) => {
        hours[h.day] = h.isOpen ? { start: h.start || h.open, end: h.end || h.close } : null;
      });
    } else if (openingHoursData.raw && typeof openingHoursData.raw === 'object') {
      hours = openingHoursData.raw;
    }
  }
  if (Object.keys(hours).length === 0) {
    hours = (s.hours as Record<string, any>) ?? {};
  }

  const isDark = isColorDark(theme.backgroundColor);
  const sectionBg  = isDark ? 'rgba(255,255,255,0.03)' : `${theme.primaryColor}08`;
  const cardBg     = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)'  : '#f0f0f0';
  const rowBorder  = isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5';
  const dayText    = isDark ? 'rgba(255,255,255,0.75)' : '#374151';
  const timeText   = isDark ? 'rgba(255,255,255,0.6)'  : '#6b7280';
  const p = theme.primaryColor;
  // Normalize variant — 'layout' field was previously used in some templates
  const rawVariant = (s.variant as string) ?? 'table';
  const variant    = rawVariant === 'classic' ? 'table' : rawVariant;

  if (variant === 'cards') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 8 }}>
            {DAYS.map(day => {
              const slot = hours[day]; const isT = day === today;
              return (
                <div key={day} style={{ borderRadius: 14, padding: '14px 8px', textAlign: 'center', background: isT ? p : '#f8faff', color: isT ? '#fff' : theme.textColor, boxShadow: isT ? `0 6px 20px ${p}40` : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: isT ? 0.9 : 0.5, marginBottom: 6 }}>{day.slice(0, 3).toUpperCase()}</div>
                  {slot ? (<><div style={{ fontSize: 11, fontWeight: 700 }}>{slot.open || slot.start}</div><div style={{ fontSize: 9, opacity: 0.7 }}>to</div><div style={{ fontSize: 11, fontWeight: 700 }}>{slot.close || slot.end}</div></>) : <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>Closed</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p}08,${p}15)` }}>
        <div className={containerClass}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{(s.title as string) || 'Opening Hours'}</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24, fontSize: 14 }}>We&apos;re here when you need us.</p>
              <div style={{ background: p, borderRadius: 16, padding: 24, color: '#fff' }}>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Today&apos;s Hours</div>
                <div style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 800 }}>{(hours[today]?.open || hours[today]?.start) || '9:00'} – {(hours[today]?.close || hours[today]?.end) || '17:00'}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Currently open</div>
              </div>
            </div>
            <div style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'white', borderRadius: 20, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.08)' }}>
              {DAYS.map(day => {
                const slot = hours[day]; const isT = day === today;
                if (!slot && !s.showClosedDays) return null;
                return (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 22px', borderBottom: '1px solid #f1f5f9', background: isT ? `${p}05` : 'transparent' }}>
                    <span className="capitalize" style={{ fontSize: 13, fontWeight: isT ? 700 : 400, color: isT ? p : theme.textColor }}>{day}</span>
                    {slot ? <span style={{ fontSize: 13, fontWeight: 600, color: theme.textColor }}>{slot.open || slot.start} – {slot.close || slot.end}</span> : <span style={{ fontSize: 12, color: '#ef4444' }}>Closed</span>}
                  </div>
                );
              })}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,48px)', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>{(s.title as string) || 'Opening Hours'}</h2>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🚨 Emergency Line</div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{(s.emergencyPhone as string) || '+1-800-CLINIC'}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>Available 24/7</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}>
              {DAYS.map(day => {
                const slot = hours[day]; const isT = day === today;
                if (!slot && !s.showClosedDays) return null;
                return (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: isT ? `${p}15` : 'transparent' }}>
                    <span className="capitalize" style={{ fontSize: 13, color: isT ? '#fff' : 'rgba(255,255,255,0.6)' }}>{day}</span>
                    {slot ? <span style={{ fontSize: 13, fontWeight: 600, color: isT ? p : 'rgba(255,255,255,0.8)' }}>{slot.open || slot.start} – {slot.close || slot.end}</span> : <span style={{ fontSize: 12, color: '#ef4444' }}>Closed</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timeline') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Schedule'} theme={theme} />
          <div style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
            {DAYS.map(day => {
              const slot = hours[day]; const isT = day === today;
              if (!slot && !s.showClosedDays) return null;
              return (
                <div key={day} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isT ? p : `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isT ? '#fff' : p }}>{day.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, height: 1, background: isT ? p : `${p}20` }} />
                  <div style={{ background: isT ? p : '#f8faff', borderRadius: 8, padding: '6px 14px', border: `1px solid ${isT ? p : p + '20'}` }}>
                    {slot ? <span className="capitalize" style={{ fontSize: 13, fontWeight: 600, color: isT ? '#fff' : theme.textColor }}>{slot.open || slot.start} – {slot.close || slot.end}</span> : <span style={{ fontSize: 12, color: '#ef4444' }}>Closed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-wise') {
    const doctors = (s.doctors as any[]) || [{ name: 'Dr. Smith', schedule: { monday: { open: '9:00', close: '17:00' } } }];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Doctor Schedule'} theme={theme} />
          {doctors.map((doc: any, di: number) => (
            <div key={di} style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{doc.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 6 }}>
                {DAYS.map(day => {
                  const slot = (doc.schedule || hours)[day];
                  return (
                    <div key={day} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: slot ? `${p}10` : '#f9fafb' }}>
                      <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 4 }}>{day.slice(0, 3).toUpperCase()}</div>
                      {slot ? <div style={{ fontSize: 10, fontWeight: 600, color: p }}>{slot.open || slot.start}</div> : <div style={{ fontSize: 10, color: '#d1d5db' }}>—</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // default: table
  return (
    <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} theme={theme} />
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}>
          {DAYS.map(day => {
            const slot    = hours[day];
            const isToday = day === today && s.showTodayHighlight;
            if (!slot && !s.showClosedDays) return null;
            return (
              <div key={day} className="flex justify-between items-center px-5 sm:px-6 py-3 sm:py-4"
                style={{ borderBottom: `1px solid ${rowBorder}`, background: isToday ? `${p}22` : 'transparent' }}>
                <div className="flex items-center gap-2">
                  {isToday && <Clock size={14} style={{ color: p }} />}
                  <span className="capitalize font-medium text-sm sm:text-base" style={{ color: isToday ? p : dayText, fontWeight: isToday ? 700 : 500 }}>{day}</span>
                  {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: p }}>Today</span>}
                </div>
                {slot
                  ? <span className="text-sm sm:text-base" style={{ color: isToday ? p : timeText, fontWeight: isToday ? 700 : 400 }}>{slot.open || slot.start} – {slot.close || slot.end}</span>
                  : <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>Closed</span>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}