'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { User as UserIcon } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

export function TeamSection({ s, theme, subdomain, containerClass, branches }: SecProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const { data: liveDoctors } = useQuery<any[]>({
    queryKey:  ['doctors', subdomain, selectedBranch],
    queryFn:   () => websitePublicApi.getDoctors(subdomain, selectedBranch || undefined),
    // Auto-pull unless explicitly set to 'manual' — undefined/live-api both auto-pull
    enabled:   s.dataSource !== 'manual',
    staleTime: 60_000,
  });

  const hasManualMembers = Array.isArray(s.members) && (s.members as any[]).length > 0;
  const members =
    liveDoctors?.length && s.dataSource !== 'manual'
      ? liveDoctors
      : hasManualMembers ? (s.members as any[]) : [];

  // Normalize variant — 'classic' was an old alias for 'cards'
  const rawVariant = (s.variant as string) ?? 'cards';
  const variant    = rawVariant === 'classic' ? 'cards' : rawVariant;
  const p = theme.primaryColor;
  const isDark = isColorDark(theme.backgroundColor);
  const cols = (s.columns as number) || 3;

  const BranchFilter = () => s.dataSource === 'live-api' && branches.length > 1 ? (
    <div className="flex justify-center mb-8">
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => setSelectedBranch('')} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${selectedBranch === '' ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`} style={selectedBranch === '' ? { background: p } : {}}>All Branches</button>
        {branches.map((b: any) => (
          <button key={b.id} onClick={() => setSelectedBranch(b.id)} className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${selectedBranch === b.id ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`} style={selectedBranch === b.id ? { background: p } : {}}>{b.name}</button>
        ))}
      </div>
    </div>
  ) : null;

  const MemberPhoto = ({ m, size = 80 }: { m: any; size?: number }) => {
    const avatarUrl = resolveImageUrl(m.avatar);
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {avatarUrl ? <Image src={avatarUrl} alt={m.name as string} fill className="object-cover" unoptimized={avatarUrl.includes('/uploads/')} /> : <UserIcon size={size * 0.45} style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }} />}
      </div>
    );
  };

  const BookBtn = () => s.showBookButton !== false ? (
    <a href="#booking" className="mt-4 inline-block px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ background: p }}>Book Appointment</a>
  ) : null;

  if (variant === 'horizontal-cards') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <BranchFilter />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'white', borderRadius: 16, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <MemberPhoto m={m} size={72} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.95)' : theme.textColor, marginBottom: 2 }}>{m.name}</h3>
                  <p style={{ fontSize: 13, color: p, fontWeight: 600, marginBottom: 4 }}>{m.role || m.specialization}</p>
                  {m.qualification && <p style={{ fontSize: 12, color: '#9ca3af' }}>{m.qualification}</p>}
                </div>
                {m.experience && <div style={{ textAlign: 'center', flexShrink: 0, padding: '12px 16px', background: `${p}08`, borderRadius: 12 }}><div style={{ fontWeight: 800, color: p, fontSize: 18 }}>{m.experience}+</div><div style={{ fontSize: 10, color: '#9ca3af' }}>yrs</div></div>}
                <BookBtn />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium-profiles') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <BranchFilter />
          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(auto-fill,minmax(220px,1fr))` }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ height: 100, background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})`, position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)', border: '4px solid white', borderRadius: '50%' }}>
                    <MemberPhoto m={m} size={72} />
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '48px 20px 24px' }}>
                  <h3 style={{ fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.95)' : theme.textColor, marginBottom: 4 }}>{m.name}</h3>
                  <p style={{ fontSize: 12, color: p, fontWeight: 600, marginBottom: 8 }}>{m.role || m.specialization}</p>
                  {m.qualification && <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>{m.qualification}</p>}
                  <BookBtn />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured-doctor') {
    const [featured, ...rest] = members;
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'white' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <BranchFilter />
          {featured && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,40px)', marginBottom: 32 }}>
              <div style={{ background: `linear-gradient(135deg,${p}08,${p}15)`, borderRadius: 24, padding: 36, display: 'flex', gap: 24, alignItems: 'center' }}>
                <MemberPhoto m={featured} size={100} />
                <div>
                  <span style={{ fontSize: 11, color: p, fontWeight: 700, background: `${p}15`, padding: '3px 10px', borderRadius: 999 }}>Featured Doctor</span>
                  <h3 style={{ fontFamily: theme.fontHeading, fontSize: '1.3rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.95)' : theme.textColor, margin: '8px 0 4px' }}>{featured.name}</h3>
                  <p style={{ fontSize: 13, color: p, fontWeight: 600, marginBottom: 8 }}>{featured.role || featured.specialization}</p>
                  {featured.bio && <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{featured.bio}</p>}
                  <BookBtn />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {rest.slice(0, 4).map((m: any, i: number) => (
                  <div key={m.id || i} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f8faff', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <MemberPhoto m={m} size={52} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.95)' : theme.textColor, fontSize: 14 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: p, fontWeight: 600 }}>{m.role || m.specialization}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'luxury-cosmetic-specialists') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 40, height: 1, background: theme.accentColor || p, margin: '0 auto 16px' }} />
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 300, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>{(s.title as string) || 'Our Specialists'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>{s.subtitle as string}</p>}
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ height: 200, background: `${p}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {resolveImageUrl(m.avatar) ? <img src={resolveImageUrl(m.avatar)} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={60} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>{m.name}</h3>
                  <p style={{ fontSize: 12, color: theme.accentColor || p, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.role || m.specialization}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'department-groups') {
    const depts: any[] = (s.departments as any[]) || [{ name: 'General', members: members.slice(0, 2) }, { name: 'Specialist', members: members.slice(2, 4) }];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          {depts.map((dept: any, di: number) => (
            <div key={di} style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <h3 style={{ fontFamily: theme.fontHeading, fontSize: '1.2rem', fontWeight: 700, color: theme.textColor }}>{dept.name}</h3>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {(dept.members || members.slice(0, 3)).map((m: any, i: number) => (
                  <div key={m.id || i} style={{ background: 'white', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <MemberPhoto m={m} size={52} />
                    <div><div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14 }}>{m.name}</div><div style={{ fontSize: 12, color: p }}>{m.role || m.specialization}</div></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {members.slice(0, 5).map((m: any, i: number) => (
              <div key={m.id || i} style={{ borderRadius: 20, overflow: 'hidden', background: i === 0 ? `linear-gradient(135deg,${p},${theme.secondaryColor || p})` : '#f8faff', gridColumn: i === 0 ? 'span 2' : undefined, boxShadow: i === 0 ? `0 8px 32px ${p}30` : '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, gap: 12 }}>
                <div style={{ border: i === 0 ? '3px solid rgba(255,255,255,0.4)' : '3px solid transparent', borderRadius: '50%' }}><MemberPhoto m={m} size={i === 0 ? 90 : 64} /></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: i === 0 ? '#fff' : theme.textColor, fontSize: i === 0 ? 16 : 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: i === 0 ? 'rgba(255,255,255,0.75)' : p, fontWeight: 600, marginTop: 2 }}>{m.role || m.specialization}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <BranchFilter />
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ minWidth: 220, background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', flexShrink: 0 }}>
                <div style={{ height: 180, background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {resolveImageUrl(m.avatar) ? <img src={resolveImageUrl(m.avatar)} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={56} style={{ color: `${p}40` }} />}
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 3, fontSize: 15 }}>{m.name}</h3>
                  <p style={{ fontSize: 12, color: p, fontWeight: 600 }}>{m.role || m.specialization}</p>
                  <BookBtn />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'team-wall') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[...members, ...members, ...members].slice(0, 10).map((m: any, i: number) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  {resolveImageUrl(m.avatar) ? <img src={resolveImageUrl(m.avatar)} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={28} style={{ color: `${p}50` }} />}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.textColor, marginBottom: 2 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: p, fontWeight: 600 }}>{m.role || m.specialization}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'medical-board') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Medical Advisory Board'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ background: 'white', borderRadius: 16, padding: '20px 28px', display: 'flex', gap: 20, alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${p}10` }}>
                <MemberPhoto m={m} size={64} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15 }}>{m.name}</h3>
                    {m.qualification && <span style={{ fontSize: 11, background: `${p}12`, color: p, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{m.qualification}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: p, fontWeight: 600, marginBottom: 4 }}>{m.role || m.specialization}</p>
                  {m.bio && <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{m.bio}</p>}
                </div>
                {m.experience && <div style={{ textAlign: 'center', flexShrink: 0, padding: '12px 16px', background: `${p}08`, borderRadius: 12 }}><div style={{ fontWeight: 800, color: p, fontSize: 18 }}>{m.experience}+</div><div style={{ fontSize: 10, color: '#9ca3af' }}>yrs</div></div>}
                <BookBtn />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-location-listing') {
    const locs: string[] = (s.locations as string[]) || ['Main Branch', 'Downtown', 'North Suburb'];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Find a Doctor Near You'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, justifyContent: 'center' }}>
            {locs.map((loc: string, i: number) => (
              <button key={i} style={{ padding: '7px 18px', borderRadius: 999, border: `1.5px solid ${i === 0 ? p : '#e5e7eb'}`, background: i === 0 ? p : 'white', color: i === 0 ? '#fff' : theme.textColor, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{loc}</button>
            ))}
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ background: '#f8faff', borderRadius: 14, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center', border: `1px solid ${p}10` }}>
                <MemberPhoto m={m} size={52} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: p, fontWeight: 600 }}>{m.role || m.specialization}</div>
                </div>
                <BookBtn />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'cards' || variant === 'classic') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <BranchFilter />
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {members.map((m: any, i: number) => (
              <div key={m.id || i} style={{ textAlign: 'center', background: '#f8faff', borderRadius: 20, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><MemberPhoto m={m} size={88} /></div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 4 }}>{m.name}</h3>
                <p style={{ fontSize: 13, fontWeight: 600, color: p, marginBottom: 4 }}>{m.role || m.specialization}</p>
                {m.experience && <p style={{ fontSize: 12, color: '#9ca3af' }}>{m.experience} yrs exp.</p>}
                <BookBtn />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <BranchFilter />
        <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: `repeat(auto-fill,minmax(200px,1fr))` }}>
          {members.map((m: any, i: number) => {
            const nameColor = isDark ? 'rgba(255,255,255,0.95)' : '#111827';
            const bioColor  = isDark ? 'rgba(255,255,255,0.5)'  : '#6b7280';
            return (
              <div key={m.id || i} className="text-center p-5 sm:p-6 rounded-2xl transition-all hover:scale-[1.02]" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f9fafb' }}>
                <div className="flex justify-center mb-4"><MemberPhoto m={m} size={88} /></div>
                <h3 className="font-bold text-sm sm:text-base" style={{ fontFamily: theme.fontHeading, color: nameColor }}>{m.name}</h3>
                <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: p }}>{m.role || m.specialization}</p>
                {m.bio && <p className="text-xs mt-2 leading-relaxed" style={{ color: bioColor }}>{m.bio}</p>}
                <BookBtn />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}