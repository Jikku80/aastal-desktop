'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';

// ── Leaflet map picker (admin-frontend) ────────────────────────────────────
// GPS auto-detects the position on first load (and on demand via the button),
// then the pin can be dragged or the map clicked to fine-tune the exact spot.
// Leaflet touches `window`, so this component must only ever be rendered via
// `next/dynamic(() => import(...), { ssr: false })` from the parent page.
//
// `theme="light"` matches the plain Tailwind gray/blue look used on the
// Public Listing page. `theme="dark"` matches the CSS-variable dark theme
// used across the rest of the admin dashboard (e.g. the Branches page).

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324]; // Kathmandu fallback
const DEFAULT_ZOOM = 13;
const PINPOINT_ZOOM = 16;

interface ExtraMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  /** Small status note shown in the popup, e.g. "Public" / "Hidden". */
  sublabel?: string;
  color?: string;
}

interface LocationMapPickerProps {
  latitude: number | '' | null | undefined;
  longitude: number | '' | null | undefined;
  onChange: (lat: number, lng: number) => void;
  onAddressDetected?: (address: string) => void;
  heightClassName?: string;
  theme?: 'light' | 'dark';
  /** Disables GPS auto-fetch + interaction (e.g. read-only branch view). */
  readOnly?: boolean;
  /** Label shown in the popup of the main (draggable) pin, e.g. the clinic name. */
  mainLabel?: string;
  /**
   * Extra read-only pins to plot alongside the main marker — e.g. a clinic's
   * branches, so admins can see every location on one map instead of just
   * the single clinic-wide pin.
   */
  extraMarkers?: ExtraMarker[];
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.neighbourhood || a.suburb || a.quarter,
      a.city || a.town || a.village || a.county,
      a.state,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : data.display_name || null;
  } catch {
    return null;
  }
}

export default function LocationMapPicker({
  latitude,
  longitude,
  onChange,
  onAddressDetected,
  heightClassName = 'h-64',
  theme = 'light',
  readOnly = false,
  mainLabel,
  extraMarkers = [],
}: LocationMapPickerProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const extraMarkersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const lat = latitude === '' || latitude == null ? null : Number(latitude);
  const lng = longitude === '' || longitude == null ? null : Number(longitude);
  const hasInitialFix = lat !== null && lng !== null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      // @ts-ignore - css side-effect import, no types needed
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !mapElRef.current || mapRef.current) return;

      const startLat = hasInitialFix ? (lat as number) : DEFAULT_CENTER[0];
      const startLng = hasInitialFix ? (lng as number) : DEFAULT_CENTER[1];

      const map = L.map(mapElRef.current, {
        center: [startLat, startLng],
        zoom: hasInitialFix ? PINPOINT_ZOOM : DEFAULT_ZOOM,
        zoomControl: true,
        dragging: !readOnly,
        scrollWheelZoom: !readOnly,
        doubleClickZoom: !readOnly,
        boxZoom: !readOnly,
        keyboard: !readOnly,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([startLat, startLng], { draggable: !readOnly, icon }).addTo(map);
      if (mainLabel) marker.bindPopup(mainLabel);

      if (!readOnly) {
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
          const addr = await reverseGeocode(pos.lat, pos.lng);
          if (addr && onAddressDetected) onAddressDetected(addr);
        });

        map.on('click', async (e: any) => {
          marker.setLatLng(e.latlng);
          onChange(e.latlng.lat, e.latlng.lng);
          const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
          if (addr && onAddressDetected) onAddressDetected(addr);
        });
      }

      // Extra read-only pins (e.g. branch locations) plotted alongside the
      // main marker so admins see every location on one map at a glance.
      if (extraMarkers.length > 0) {
        const extraIcon = L.divIcon({
          className: 'lmp-branch-pin',
          html: `<div style="
            width:16px;height:16px;border-radius:50%;
            background:#8b5cf6;border:2px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          popupAnchor: [0, -10],
        });

        extraMarkersRef.current = extraMarkers.map(m => {
          const em = L.marker([m.latitude, m.longitude], { icon: extraIcon, interactive: true }).addTo(map);
          const popupHtml = `<strong>${m.label}</strong>${m.sublabel ? `<br/><span style="opacity:0.7">${m.sublabel}</span>` : ''}`;
          em.bindPopup(popupHtml);
          return em;
        });

        // Fit the map so every pin (main + branches) is visible at once.
        const allPoints: [number, number][] = [
          [startLat, startLng],
          ...extraMarkers.map(m => [m.latitude, m.longitude] as [number, number]),
        ];
        if (allPoints.length > 1) {
          map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32], maxZoom: PINPOINT_ZOOM });
        }
      }

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);

      // No coordinates yet — try GPS automatically on first mount.
      if (!hasInitialFix && !readOnly) {
        detectLocation();
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker/map view in sync if parent state changes externally
  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    if (lat === null || lng === null) return;
    const current = markerRef.current.getLatLng();
    if (Math.abs(current.lat - lat) > 1e-9 || Math.abs(current.lng - lng) > 1e-9) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, ready]);

  // Re-draw extra (branch) pins whenever the list changes — e.g. they load
  // asynchronously after the map has already mounted.
  const extraMarkersKey = extraMarkers.map(m => `${m.id}:${m.latitude}:${m.longitude}`).join('|');
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    (async () => {
      const L = await import('leaflet');
      extraMarkersRef.current.forEach(em => em.remove());
      extraMarkersRef.current = [];
      if (extraMarkers.length === 0) return;

      const extraIcon = L.divIcon({
        className: 'lmp-branch-pin',
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#8b5cf6;border:2px solid #fff;
          box-shadow:0 1px 4px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10],
      });

      extraMarkersRef.current = extraMarkers.map(m => {
        const em = L.marker([m.latitude, m.longitude], { icon: extraIcon, interactive: true }).addTo(mapRef.current);
        const popupHtml = `<strong>${m.label}</strong>${m.sublabel ? `<br/><span style="opacity:0.7">${m.sublabel}</span>` : ''}`;
        em.bindPopup(popupHtml);
        return em;
      });

      const current = markerRef.current?.getLatLng();
      const allPoints: [number, number][] = [
        ...(current ? [[current.lat, current.lng] as [number, number]] : []),
        ...extraMarkers.map(m => [m.latitude, m.longitude] as [number, number]),
      ];
      if (allPoints.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32], maxZoom: PINPOINT_ZOOM });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraMarkersKey, ready]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: gLat, longitude: gLng } = pos.coords;
        onChange(gLat, gLng);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([gLat, gLng]);
          mapRef.current.setView([gLat, gLng], PINPOINT_ZOOM);
        }

        const addr = await reverseGeocode(gLat, gLng);
        if (addr && onAddressDetected) onAddressDetected(addr);
        setLocating(false);
      },
      err => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Drag the pin or click the map to set it manually.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('Location unavailable. Drag the pin or click the map to set it manually.');
        } else {
          setGeoError('Could not get your location. Drag the pin or click the map to set it manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [onChange, onAddressDetected]);

  const isLight = theme === 'light';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium flex items-center gap-1.5 ${isLight ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>
          <MapPin size={13} className={isLight ? 'text-blue-500' : 'text-brand-400'} />
          {readOnly ? 'Location on map' : 'Pin the exact location on the map'}
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            className={
              isLight
                ? 'flex items-center gap-1.5 text-xs text-blue-600 font-medium px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50'
                : 'flex items-center gap-1.5 text-xs text-brand-400 font-medium px-2.5 py-1.5 rounded-lg border border-brand-500/30 hover:bg-brand-500/10 transition-colors disabled:opacity-50'
            }
          >
            {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
            {locating ? 'Locating…' : 'Use GPS'}
          </button>
        )}
      </div>

      <div
        ref={mapElRef}
        className={`w-full ${heightClassName} rounded-xl overflow-hidden relative z-0 ${
          isLight ? 'border border-gray-200' : 'border'
        }`}
        style={isLight ? undefined : { border: '1px solid var(--border)' }}
      >
        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: isLight ? '#f9fafb' : 'var(--bg-elevated)' }}
          >
            <Loader2 size={18} className={`animate-spin ${isLight ? 'text-gray-400' : 'text-[var(--text-muted)]'}`} />
          </div>
        )}
      </div>

      {geoError && (
        <p className={`text-xs px-3 py-2 rounded-lg ${isLight ? 'text-red-500 bg-red-50' : 'text-red-400'}`}
           style={isLight ? undefined : { background: 'rgba(239,68,68,0.08)' }}>
          {geoError}
        </p>
      )}

      {!readOnly && (
        <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
          Drag the pin or click anywhere on the map to fine-tune the exact spot.
        </p>
      )}
    </div>
  );
}