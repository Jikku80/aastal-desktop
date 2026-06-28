'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, Stethoscope, CheckCircle, Shield } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';
import { websitePublicApi } from '@/lib/api/websiteApi';

// Leaflet touches `window` — must be loaded client-side only
const PublicLeafletMap = dynamic(() => import('./PublicLeafletMap'), { ssr: false });

// ── Rich Text ─────────────────────────────────────────────────────────────────

export function RichTextSection({ s, containerClass }: SecProps) {
  const variant  = (s.variant as string) ?? 'default';
  const content  = (s.content as string) || '';

  if (variant === 'two-column') {
    return (
      <div className="py-12 sm:py-16 bg-white">
        <div className={containerClass}>
          {(s.title || s.subtitle) && (
            <div style={{ marginBottom: 28 }}>
              {s.title && <h2 style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{s.title as string}</h2>}
              {s.subtitle && <p style={{ fontSize: 15, color: '#6b7280' }}>{s.subtitle as string}</p>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 32 }}>
            <div className="prose prose-sm sm:prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
            {(s.content2 as string) && (
              <div className="prose prose-sm sm:prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: s.content2 as string }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'article') {
    return (
      <div className="py-14 sm:py-20 bg-white">
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '0 24px' }}>
          {s.title && <h1 style={{ fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{s.title as string}</h1>}
          {s.subtitle && <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 28 }}>{s.subtitle as string}</p>}
          <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    );
  }

  if (variant === 'highlight') {
    return (
      <div className="py-10 sm:py-12" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
        <div className={containerClass}>
          <div className="prose prose-sm sm:prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    );
  }

  if (variant === 'editorial') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fafaf9' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>
          <div className="prose prose-xl max-w-none" style={{ fontFamily: 'Georgia, serif' }} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    );
  }

  if (variant === 'medical-guide') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f0f9ff' }}>
        <div className={containerClass}>
          {s.title && <h2 style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: '#0c4a6e', marginBottom: 20 }}>{s.title as string}</h2>}
          <div className="prose prose-sm sm:prose-lg max-w-none" style={{ color: '#0c4a6e' }} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-12 bg-white">
      <div className={containerClass}>
        <div
          className={`prose prose-sm sm:prose-lg max-w-none text-${(s.alignment as string) || 'left'}`}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}

// ── Branches ──────────────────────────────────────────────────────────────────

export function BranchesSection({ s, theme, subdomain, containerClass }: SecProps) {
  const { data: liveBranches } = useQuery<any[]>({
    queryKey:  ['branches', subdomain],
    queryFn:   () => websitePublicApi.getBranches(subdomain),
    enabled:   s.dataSource !== 'manual',
    staleTime: 300_000,
  });

  const items =
    liveBranches?.length && s.dataSource !== 'manual'
      ? (liveBranches ?? [])
      : ((s.items as any[]) || []);

  const p = theme.primaryColor;
  const variant = (s.variant as string) ?? 'cards';

  if (variant === 'map-first') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ background: '#e2e8f0', borderRadius: 20, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#94a3b8' }}><MapPin size={48} style={{ margin: '0 auto 12px' }} /><div style={{ fontSize: 14 }}>Map View</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.slice(0, 3).map((b: any, i: number) => (
                <div key={b.id || i} style={{ background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer', borderLeft: i === 0 ? `4px solid ${p}` : '4px solid transparent' }}>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{b.address}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((b: any, i: number) => (
              <div key={b.id || i} style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ height: 120, background: `linear-gradient(135deg,${p}${20 + i * 10},${theme.secondaryColor || p}${30 + i * 8})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={36} color="#fff" />
                </div>
                <div style={{ padding: '20px 22px', background: 'white' }}>
                  <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 10 }}>{b.name}</h3>
                  {b.address && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{b.address}</p>}
                  {b.phone && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}><a href={`tel:${b.phone}`} style={{ color: '#6b7280' }}>{b.phone}</a></p>}
                  <a href={`https://maps.google.com?q=${encodeURIComponent(b.address || b.name)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 8, background: p, color: '#fff', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>Get Directions</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'city-grid') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Locations'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((b: any, i: number) => (
              <div key={b.id || i} style={{ background: 'white', borderRadius: 16, padding: 20, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: `1px solid ${p}10` }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${p}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><MapPin size={22} color={p} /></div>
                <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 6 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{b.address}</div>
                {b.hours && <div style={{ fontSize: 11, color: p, fontWeight: 600, marginTop: 8 }}>{b.hours}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'hospital-network') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{(s.title as string) || 'Our Network'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.5)' }}>{s.subtitle as string}</p>}
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((b: any, i: number) => (
              <div key={b.id || i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={16} color={p} /></div>
                  <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{b.name}</h3>
                </div>
                {b.address && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{b.address}</div>}
                {b.phone && <div style={{ fontSize: 12, color: p, fontWeight: 600 }}><a href={`tel:${b.phone}`} style={{ color: p }}>{b.phone}</a></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
            {items.map((b: any, i: number) => (
              <div key={b.id || i} style={{ minWidth: 260, background: '#f8faff', borderRadius: 16, padding: 22, border: `1px solid ${p}12`, flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><MapPin size={16} color={p} /></div>
                <h3 style={{ fontWeight: 700, color: theme.textColor, marginBottom: 8, fontSize: 14 }}>{b.name}</h3>
                {b.address && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{b.address}</div>}
                {b.phone && <div style={{ fontSize: 12, color: '#6b7280' }}><a href={`tel:${b.phone}`} style={{ color: '#6b7280' }}>{b.phone}</a></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'regional-directory') {
    const regions = [
      { name: 'North', branches: items.slice(0, 2) },
      { name: 'South', branches: items.slice(1, 3) },
      { name: 'East',  branches: items.slice(0, 1) },
    ];
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Find a Branch'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid sm:grid-cols-3 gap-6">
            {regions.map((reg, ri) => (
              <div key={ri} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '14px 20px', background: `${p}10`, borderBottom: `1px solid ${p}15` }}>
                  <h3 style={{ fontWeight: 700, color: p, fontSize: 14 }}>📍 {reg.name} Region</h3>
                </div>
                {reg.branches.map((b: any, i: number) => (
                  <div key={b.id || i} style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 3 }}>{b.name}</div>
                    {b.address && <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>{b.address}</div>}
                    {b.phone && <div style={{ fontSize: 12, color: p, fontWeight: 600 }}><a href={`tel:${b.phone}`} style={{ color: p }}>{b.phone}</a></div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default: cards
  return (
    <div className="py-14 sm:py-20" style={{ background: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
      <div className={containerClass}>
        <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {items.map((b: any, i: number) => {
            const isDark     = isColorDark(theme.backgroundColor);
            const cardBg     = isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';
            const cardBorder = isDark ? 'rgba(255,255,255,0.1)'  : '#f0f0f0';
            const titleColor = isDark ? 'rgba(255,255,255,0.95)' : '#111827';
            const textColor  = isDark ? 'rgba(255,255,255,0.55)' : '#6b7280';
            return (
              <div key={b.id || i} className="rounded-2xl p-5 sm:p-7 transition-all hover:scale-[1.01]"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 className="font-bold text-base sm:text-lg mb-3" style={{ fontFamily: theme.fontHeading, color: titleColor }}>{b.name}</h3>
                {b.address && <p className="flex items-start gap-2 text-sm mb-2" style={{ color: textColor }}><MapPin size={14} className="mt-0.5 shrink-0" style={{ color: p }} />{b.address}</p>}
                {b.phone && <p className="flex items-center gap-2 text-sm mb-2" style={{ color: textColor }}><Phone size={14} className="shrink-0" style={{ color: p }} /><a href={`tel:${b.phone}`} style={{ color: textColor }}>{b.phone}</a></p>}
                {b.email && <p className="flex items-center gap-2 text-sm" style={{ color: textColor }}><Mail size={14} className="shrink-0" style={{ color: p }} /><a href={`mailto:${b.email}`} style={{ color: textColor }}>{b.email}</a></p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────

export function MapSection({ s, theme, clinic, branches, containerClass }: SecProps) {
  const address   = ((s.address as string) || (clinic?.address as string) || '').trim();
  const embedUrl  = (s.embedUrl as string | undefined)?.trim();
  const mapHeight = (s.height as number) || 400;
  const p         = theme.primaryColor;
  const variant   = (s.variant as string) ?? 'full-width';
  const isDarkMap = isColorDark(theme.backgroundColor);

  // Prefer explicit coordinates saved from the branch/clinic Leaflet picker
  const lat = s.latitude != null ? Number(s.latitude) : null;
  const lng = s.longitude != null ? Number(s.longitude) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  // Branches with valid coordinates — used by the "multi-location" variant
  const branchPins = (branches || [])
    .filter((b: any) => b?.latitude != null && b?.longitude != null && !isNaN(Number(b.latitude)) && !isNaN(Number(b.longitude)))
    .map((b: any) => ({ id: b.id, latitude: Number(b.latitude), longitude: Number(b.longitude), label: b.name }));

  const directionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : '#';

  // ── MapEmbed: Leaflet when coords/markers are available, iframe-geocode otherwise ──
  const MapEmbed = ({ height, multi }: { height: number; multi?: boolean }) => {
    const useMulti     = !!multi && branchPins.length > 0;
    const showLeaflet  = !embedUrl && (hasCoords || useMulti);
    const [iframeSrc, setIframeSrc] = React.useState<string>(embedUrl || '');
    const [geocoding, setGeocoding] = React.useState(!embedUrl && !showLeaflet && !!address);

    React.useEffect(() => {
      // If a custom embed URL is provided, always use that
      if (embedUrl) { setIframeSrc(embedUrl); setGeocoding(false); return; }
      // If we have real coordinates (or branch pins), Leaflet renders them — no iframe needed
      if (showLeaflet) { setGeocoding(false); return; }
      // Fallback: geocode the address text
      if (!address) { setGeocoding(false); return; }
      const ctrl = new AbortController();
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'Accept-Language': 'en' }, signal: ctrl.signal },
      )
        .then(r => r.json())
        .then((results: any[]) => {
          if (results?.length) {
            const rlat = parseFloat(results[0].lat);
            const rlon = parseFloat(results[0].lon);
            const d   = 0.012;
            setIframeSrc(`https://www.openstreetmap.org/export/embed.html?bbox=${rlon-d}%2C${rlat-d}%2C${rlon+d}%2C${rlat+d}&layer=mapnik&marker=${rlat}%2C${rlon}`);
          } else {
            setIframeSrc(`https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(address)}`);
          }
        })
        .catch(() => {
          setIframeSrc(`https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(address)}`);
        })
        .finally(() => setGeocoding(false));
      return () => ctrl.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const markers = useMulti
      ? branchPins
      : hasCoords
      ? [{ latitude: lat as number, longitude: lng as number, label: address || (clinic?.name as string) || 'Clinic' }]
      : [];

    return (
      <div style={{ height, position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
        {geocoding && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, background: '#f1f5f9' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}><MapPin size={28} /><p style={{ fontSize: 12, marginTop: 6 }}>Locating…</p></div>
          </div>
        )}

        {/* Priority 1: custom iframe embed URL */}
        {embedUrl ? (
          <iframe src={embedUrl} width="100%" height={height} loading="lazy" style={{ border: 0, display: 'block' }} allowFullScreen referrerPolicy="no-referrer-when-downgrade" title="Clinic location map" />
        ) : showLeaflet ? (
          /* Priority 2: Leaflet with exact GPS coordinates from branch/clinic (or multiple branch pins) */
          <PublicLeafletMap markers={markers} height={height} />
        ) : iframeSrc ? (
          /* Priority 3: Geocoded address iframe */
          <iframe src={iframeSrc} width="100%" height={height} loading="lazy" style={{ border: 0, display: 'block' }} allowFullScreen referrerPolicy="no-referrer-when-downgrade" title="Clinic location map" />
        ) : !geocoding ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#94a3b8' }}>
            <MapPin size={32} /><p style={{ fontSize: 13 }}>No location configured</p>
          </div>
        ) : null}

        {(address || hasCoords) && !geocoding && !useMulti && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
            style={{ position: 'absolute', bottom: 12, right: 12, background: 'white', fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: p }}>
            <MapPin size={11} />Get Directions
          </a>
        )}
      </div>
    );
  };

  if (variant === 'directions') {
    return (
      <div style={{ background: isDarkMap ? 'rgba(255,255,255,0.03)' : '#f8faff' }}>
        <div className={`${containerClass} py-8`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(16px,3vw,32px)', alignItems: 'center', marginBottom: 24 }}>
            <div>
              {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{s.title as string}</h2>}
              {address && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
                  <MapPin size={16} color={p} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{address}</span>
                </div>
              )}
              {(s.phone || clinic?.phone) && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                  <Phone size={16} color={p} />
                  <a href={`tel:${(s.phone || clinic?.phone) as string}`} style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>{(s.phone || clinic?.phone) as string}</a>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: p, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  <MapPin size={14} />Get Directions
                </a>
                {(s.phone || clinic?.phone) && (
                  <a href={`tel:${(s.phone || clinic?.phone) as string}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: 'white', color: theme.textColor, fontWeight: 700, fontSize: 13, textDecoration: 'none', border: `1.5px solid ${p}25` }}>
                    <Phone size={14} />Call Us
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['🚌', 'By Bus', 'Lines 12, 34 stop at Main St'], ['🚗', 'By Car', 'Parking available on-site'], ['🚶', 'Walking', '5 min from City Center']].map(([ic, t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: 20 }}>{ic}</span>
                  <div><div style={{ fontWeight: 600, color: theme.textColor, fontSize: 13 }}>{t}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{d}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <MapEmbed height={280} />
      </div>
    );
  }

  if (variant === 'floating-card') {
    return (
      <div style={{ position: 'relative', background: isDarkMap ? 'rgba(255,255,255,0.03)' : '#ffffff' }}>
        <MapEmbed height={mapHeight} />
        <div style={{ position: 'absolute', top: 20, left: 20, background: 'white', borderRadius: 16, padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxWidth: 280, zIndex: 10 }}>
          {s.title && <h3 style={{ fontWeight: 700, color: theme.textColor, fontSize: 15, marginBottom: 10 }}>{s.title as string}</h3>}
          {address && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-start' }}>
              <MapPin size={13} color={p} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{address}</span>
            </div>
          )}
          {(s.phone || clinic?.phone) && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
              <Phone size={13} color={p} />
              <a href={`tel:${(s.phone || clinic?.phone) as string}`} style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>{(s.phone || clinic?.phone) as string}</a>
            </div>
          )}
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, background: p, color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
            Get Directions
          </a>
        </div>
      </div>
    );
  }

  if (variant === 'contact-map') {
    return (
      <div style={{ background: isDarkMap ? 'rgba(255,255,255,0.03)' : '#ffffff' }}>
        <div className={containerClass} style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 32, alignItems: 'stretch' }}>
            <div>
              {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: theme.textColor, marginBottom: 16 }}>{s.title as string}</h2>}
              {address && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14 }}>
                  <MapPin size={16} color={p} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{address}</span>
                </div>
              )}
              {(s.phone || clinic?.phone) && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                  <Phone size={16} color={p} />
                  <a href={`tel:${(s.phone || clinic?.phone) as string}`} style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>{(s.phone || clinic?.phone) as string}</a>
                </div>
              )}
              {(s.email || clinic?.email) && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                  <Mail size={16} color={p} />
                  <a href={`mailto:${(s.email || clinic?.email) as string}`} style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>{(s.email || clinic?.email) as string}</a>
                </div>
              )}
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '10px 20px', borderRadius: 10, background: p, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                <MapPin size={14} />Get Directions
              </a>
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', minHeight: 280 }}>
              <MapEmbed height={Math.max(mapHeight, 280)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'multi-location') {
    return (
      <div style={{ background: isDarkMap ? 'rgba(255,255,255,0.03)' : '#f8faff' }}>
        <div className={`${containerClass} py-14 sm:py-20`}>
          <SectionTitle title={(s.title as string) || 'Our Locations'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden' }}>
              <MapEmbed height={mapHeight} multi />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: mapHeight, overflowY: 'auto' }}>
              {(branches || []).length > 0 ? (branches || []).map((b: any, i: number) => (
                <div key={b.id || i} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: `4px solid ${p}` }}>
                  <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14, marginBottom: 4 }}>{b.name}</div>
                  {b.address && <div style={{ fontSize: 12, color: '#9ca3af' }}>{b.address}</div>}
                  {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: 12, color: p, fontWeight: 600, textDecoration: 'none' }}>{b.phone}</a>}
                </div>
              )) : (
                <div style={{ fontSize: 13, color: '#9ca3af' }}>No branch locations configured yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default: full-width
  return (
    <div style={{ background: isDarkMap ? 'rgba(255,255,255,0.03)' : '#ffffff' }}>
      {(s.title || address) && (
        <div className={`${containerClass} py-6 sm:py-8`}>
          {s.title && <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>{s.title as string}</h2>}
          {address && (
            <p className="flex items-center gap-2 text-sm sm:text-base" style={{ color: isDarkMap ? 'rgba(255,255,255,0.55)' : '#6b7280' }}>
              <MapPin size={15} className="flex-shrink-0" style={{ color: p }} />{address}
            </p>
          )}
        </div>
      )}
      <MapEmbed height={mapHeight} />
    </div>
  );
}

// ── Video ─────────────────────────────────────────────────────────────────────

export function VideoSection({ s, theme, containerClass }: SecProps) {
  const p       = theme.primaryColor;
  const variant = (s.variant as string) ?? 'centered';
  const videoUrl = s.url as string | undefined;
  const isDark  = isColorDark(theme.backgroundColor);

  const VideoEmbed = () => (
    <div style={{ background: '#111', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9' }}>
      {videoUrl ? (
        <iframe src={videoUrl} style={{ width: '100%', height: '100%', border: 0 }} allowFullScreen allow="autoplay; encrypted-media" />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>▶</div><div style={{ fontSize: 13 }}>No video configured</div></div>
        </div>
      )}
    </div>
  );

  if (variant === 'fullwidth') {
    return (
      <div style={{ background: '#000', padding: 0 }}>
        {s.title && <div style={{ textAlign: 'center', padding: '32px 24px 0' }}><h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: '#fff' }}>{s.title as string}</h2></div>}
        <VideoEmbed />
        {s.caption && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '16px 0' }}>{s.caption as string}</p>}
      </div>
    );
  }

  if (variant === 'gallery') {
    const videos = (s.videos as any[]) || (videoUrl ? [{ url: videoUrl, title: s.title }] : []);
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8faff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(videos.length ? videos : [{}, {}, {}]).map((v: any, i: number) => (
              <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: '#111', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {v.url ? <iframe src={v.url} style={{ width: '100%', height: '100%', border: 0 }} allowFullScreen /> : <span style={{ color: '#4b5563', fontSize: 32, opacity: 0.5 }}>▶</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'side-by-side') {
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
        <div className={containerClass}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px,4vw,40px)', alignItems: 'center' }}>
            <VideoEmbed />
            <div>
              {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{s.title as string}</h2>}
              {s.subtitle && <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 20 }}>{s.subtitle as string}</p>}
              {s.caption && <p style={{ fontSize: 13, color: '#9ca3af' }}>{s.caption as string}</p>}
              {s.ctaText && <a href={(s.ctaUrl as string) || '#booking'} style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', borderRadius: 8, background: p, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{s.ctaText as string}</a>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'testimonial-video') {
    const testimonials = (s.testimonials as any[]) || [{ name: 'Patient', quote: 'Great experience!' }];
    return (
      <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8faff' }}>
        <div className={containerClass}>
          {s.title && <SectionTitle title={s.title as string} subtitle={s.subtitle as string} theme={theme} />}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <VideoEmbed />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {testimonials.slice(0, 3).map((t: any, i: number) => (
                <div key={i} style={{ background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: 13, color: theme.textColor, fontStyle: 'italic', marginBottom: 8 }}>&ldquo;{t.quote}&rdquo;</p>
                  <div style={{ fontWeight: 600, fontSize: 12, color: p }}>— {t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default: centered (also handles 'featured')
  return (
    <div className="py-14 sm:py-20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
      <div className={containerClass}>
        {s.title && <SectionTitle title={s.title as string} theme={theme} />}
        <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
          {videoUrl ? (
            <iframe src={videoUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">Video</div>
          )}
        </div>
        {s.caption && <p className="text-sm text-gray-500 text-center mt-4">{s.caption as string}</p>}
      </div>
    </div>
  );
}

// ── Social Proof ──────────────────────────────────────────────────────────────

export function SocialProofSection({ s, theme, containerClass }: SecProps) {
  const p = theme.primaryColor;
  const variant = (s.variant as string) ?? 'logos';
  const items: any[] = (s.items as any[]) || [{ name: 'ISO Certified' }, { name: 'NABH Accredited' }, { name: 'JCI Certified' }, { name: 'JCAHO' }, { name: 'WHO Partner' }];

  if (variant === 'award-showcase') {
    return (
      <div className="py-14 sm:py-20" style={{ background: `linear-gradient(135deg,${p}06,${p}12)` }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Awards & Certifications'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
            {items.map((item: any, i: number) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `1px solid ${p}10` }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon || '🏆'}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.textColor }}>{item.name}</div>
                {item.year && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{item.year}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'strip') {
    return (
      <div className="py-8 sm:py-10" style={{ background: '#fff', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            {s.title && <span style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.title as string}</span>}
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              {items.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
                  <Stethoscope size={16} color={p} /><span style={{ fontSize: 12, fontWeight: 600, color: theme.textColor }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'insurance') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Insurance We Accept'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {(items.length ? items : [{ name: 'Aetna' }, { name: 'Blue Cross' }, { name: 'Cigna' }, { name: 'UnitedHealth' }, { name: 'Humana' }, { name: 'Medicare' }]).map((item: any, i: number) => (
              <div key={i} style={{ background: '#f8faff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: `${p}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={16} color={p} /></div>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.textColor }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#0f172a' }}>
        <div className={containerClass}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.title as string}</h2>}
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {items.map((item: any, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={18} color={p} /><span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'interactive') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Our Certifications'} subtitle={s.subtitle as string} theme={theme} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {items.map((item: any, i: number) => (
              <div key={i} style={{ background: 'white', borderRadius: 20, padding: 28, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${p}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  {item.image ? <img src={resolveImageUrl(item.image)} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain' }} /> : <Shield size={30} color={p} />}
                </div>
                <div style={{ fontWeight: 700, color: theme.textColor, fontSize: 13, marginBottom: 4 }}>{item.name}</div>
                {item.desc && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.desc}</div>}
                {item.year && <div style={{ fontSize: 11, color: p, fontWeight: 600, marginTop: 6 }}>Since {item.year}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default: logos
  return (
    <div className="py-12 sm:py-16 bg-gray-50">
      <div className={containerClass}>
        <SectionTitle title={s.title as string} theme={theme} />
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl px-6 sm:px-8 py-4 sm:py-5 shadow-sm border border-gray-100 flex flex-col items-center gap-2 min-w-[100px]">
              {item.image ? (
                <Image src={resolveImageUrl(item.image)} alt={item.name as string} width={60} height={40} className="object-contain" unoptimized />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <CheckCircle size={22} className="text-gray-300" />
                </div>
              )}
              <span className="text-xs text-gray-600 font-medium text-center">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function DividerSection({ s }: { s: Record<string, any> }) {
  const variant   = (s.variant as string) ?? (s.style as string) ?? 'line';
  const color     = (s.color as string) || '#e5e7eb';
  const thickness = (s.thickness as number) || 1;

  if (variant === 'wave') {
    return (
      <div style={{ overflow: 'hidden', lineHeight: 0 }}>
        <svg viewBox="0 0 1200 60" fill={color} preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
          <path d="M0,30 C300,60 900,0 1200,30 L1200,60 L0,60 Z" />
        </svg>
      </div>
    );
  }
  if (variant === 'gradient') {
    return <div style={{ padding: '12px 0' }}><div style={{ height: thickness, background: `linear-gradient(90deg,transparent,${color},transparent)` }} /></div>;
  }
  if (variant === 'dashed') {
    return <div style={{ padding: '12px 32px' }}><hr style={{ border: 'none', borderTop: `${thickness}px dashed ${color}` }} /></div>;
  }
  if (variant === 'dotted') {
    return <div style={{ padding: '10px 32px' }}><hr style={{ border: 'none', borderTop: `${thickness}px dotted ${color}` }} /></div>;
  }
  if (variant === 'thick') {
    return <div style={{ padding: '8px 32px' }}><div style={{ height: 4, background: color, borderRadius: 2 }} /></div>;
  }
  if (variant === 'icon') {
    const icon = (s.icon as string) || '✦';
    return (
      <div style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, height: thickness, background: color }} />
        <span style={{ fontSize: 18, color }}>{icon}</span>
        <div style={{ flex: 1, height: thickness, background: color }} />
      </div>
    );
  }
  // default: line
  return (
    <div style={{ padding: '8px 32px' }}>
      <hr style={{ borderColor: color, borderTopWidth: thickness, borderStyle: 'solid', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }} />
    </div>
  );
}