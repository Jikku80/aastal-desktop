'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

export function AvailableSlotsSection({ s, theme, subdomain, branches, containerClass }: SecProps) {
  const p = theme.primaryColor;
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  const { data: rawSlots, isLoading } = useQuery<Record<string, string[]>>({
    queryKey: ['available-slots', subdomain, selectedBranch, selectedDoctor],
    queryFn:  () => websitePublicApi.getAvailableSlots(subdomain, selectedBranch || undefined, selectedDoctor || undefined),
    staleTime: 60_000,
  });

  const { data: doctors } = useQuery<any[]>({
    queryKey: ['pub-doctors', subdomain, selectedBranch],
    queryFn:  () => websitePublicApi.getDoctors(subdomain, selectedBranch || undefined),
    staleTime: 300_000,
  });

  const displayBranches = s.branchFilter === 'all'
    ? branches
    : branches.filter((b: any) => b.id === s.branchFilter);

  // Normalise slots: API returns { "YYYY-MM-DD": ["HH:MM", ...] }
  const grouped: Record<string, { time: string; date: string }[]> = {};
  if (rawSlots && typeof rawSlots === 'object' && !Array.isArray(rawSlots)) {
    Object.entries(rawSlots).forEach(([date, times]) => {
      if (Array.isArray(times) && times.length > 0) {
        grouped[date] = times.map(t => ({ date, time: t }));
      }
    });
  }
  const displaySlots = Object.values(grouped).flat();

  const variant = (s.variant as string) ?? 'grid';

  // ── Variant: compact ────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div className="py-10" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: '1.2rem', fontWeight: 700, color: theme.textColor }}>{(s.title as string) || 'Next Available Slots'}</h2>
            <a href="#booking" style={{ fontSize: 13, color: p, fontWeight: 600, textDecoration: 'none' }}>Book Now →</a>
          </div>
          {isLoading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {displaySlots.slice(0, 8).map((slot: any, i: number) => (
                <a key={i} href="#booking" style={{ padding: '7px 16px', borderRadius: 8, background: 'white', border: `1.5px solid ${p}25`, color: p, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                  {slot.time || `${9 + i}:00`}
                </a>
              ))}
              {displaySlots.length === 0 && (
                <span style={{ fontSize: 13, color: '#9ca3af' }}>No slots available today</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Variant: day-cards ──────────────────────────────────────────────────────
  if (variant === 'day-cards') {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        date:  d.toISOString().split('T')[0],
      };
    });

    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Available Slots'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 8, marginBottom: 28 }}>
            {days.map((day, i) => (
              <div key={i} style={{ borderRadius: 14, padding: '14px 8px', textAlign: 'center', background: i === 0 ? p : '#f8faff', color: i === 0 ? '#fff' : theme.textColor, cursor: 'pointer' }}>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{day.label.split(',')[0]}</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{new Date(day.date + 'T00:00:00').getDate()}</div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{day.label.split(' ')[1]} {day.label.split(' ')[2]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {isLoading ? (
              <div style={{ color: '#9ca3af' }}>Loading…</div>
            ) : displaySlots.slice(0, 10).map((slot: any, i: number) => (
              <a key={i} href="#booking" style={{ padding: '10px 20px', borderRadius: 10, background: '#f8faff', border: `1.5px solid ${p}25`, color: p, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                {slot.time || slot.startTime || `${9 + i}:00`}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Variant: timeline ───────────────────────────────────────────────────────
  if (variant === 'timeline') {
    const dateKeys = Object.keys(grouped).slice(0, 5);
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Available Slots'} subtitle={s.subtitle as string} theme={theme} />
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
          ) : dateKeys.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>No slots available right now.</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 32 }}>
              <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, background: `${p}25` }} />
              {dateKeys.map((date, idx) => (
                <div key={date} style={{ position: 'relative', marginBottom: 28 }}>
                  <div style={{ position: 'absolute', left: -26, top: 4, width: 12, height: 12, borderRadius: '50%', background: idx === 0 ? p : `${p}50`, border: `2px solid white`, boxShadow: '0 0 0 2px ' + (idx === 0 ? p : `${p}50`) }} />
                  <div style={{ fontWeight: 700, color: theme.textColor, marginBottom: 10, fontSize: 14 }}>{date}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {grouped[date].map((slot: any, i: number) => (
                      <a key={i} href="#booking" style={{ padding: '6px 14px', borderRadius: 8, background: '#f8faff', border: `1.5px solid ${p}25`, color: p, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                        {slot.time || slot.startTime || `${9 + i}:00`}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Variant: doctor-wise ─────────────────────────────────────────────────────
  if (variant === 'doctor-wise') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f9fafb' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Available by Doctor'} subtitle={s.subtitle as string} theme={theme} />
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
          ) : (doctors ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>No doctor schedule available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(doctors ?? []).slice(0, 4).map((doc: any) => (
                <div key={doc.id} style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    {doc.avatar ? <img src={doc.avatar} alt={doc.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p, fontWeight: 700, fontSize: 16 }}>{(doc.name || 'D')[0]}</div>}
                    <div>
                      <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14 }}>{doc.name || 'Doctor'}</div>
                      {doc.specialization && <div style={{ fontSize: 12, color: '#9ca3af' }}>{doc.specialization}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {displaySlots.slice(0, 6).map((slot: any, i: number) => (
                      <a key={i} href="#booking" style={{ padding: '6px 14px', borderRadius: 8, background: '#f8faff', border: `1.5px solid ${p}25`, color: p, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                        {slot.time || slot.startTime || `${9 + i}:00`}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Default: grouped by day (also handles 'grid') ───────────────────────────
  return (
    <div className="py-14 sm:py-20" style={{ background: '#f9fafb' }}>
      <div className={containerClass}>
        <SectionTitle title={(s.title as string) || 'Available Slots'} subtitle={s.subtitle as string} theme={theme} />

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, justifyContent: 'center' }}>
          {displayBranches.length > 1 && (
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${p}30`, fontSize: 13, fontFamily: theme.fontBody, background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Branches</option>
              {displayBranches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          {doctors && doctors.length > 0 && (
            <select
              value={selectedDoctor}
              onChange={e => setSelectedDoctor(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${p}30`, fontSize: 13, fontFamily: theme.fontBody, background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Doctors</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            Loading available slots…
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            <Calendar size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No slots available right now. Please check back later or adjust the filters.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(grouped).map(([day, daySlots]) => (
              <div key={day}>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 12, fontSize: 15 }}>{day}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {daySlots.map((slot: any, i: number) => (
                    <a
                      key={i}
                      href="#booking"
                      style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 10, background: '#fff', border: `1.5px solid ${p}`, color: p, fontWeight: 600, fontSize: 13, textDecoration: 'none', transition: 'all 0.15s' }}
                    >
                      {slot.time || `${i + 1}:00`}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}