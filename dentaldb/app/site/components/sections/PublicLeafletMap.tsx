'use client';
import { useEffect, useRef, useState } from 'react';

// ── Public Leaflet map ──────────────────────────────────────────────────────
// Used by the public website's Map / Branches sections (subdomain,
// custom-domain, and preview all share this same component via
// MiscSections.tsx). Unlike the admin `LocationMapPicker`, this renders
// read-only with no "Pin the location" label, GPS button, or admin-themed
// chrome — just the map itself, sized via inline style so it always
// actually applies (a dynamic Tailwind class like `h-[${height}px]` is
// invisible to Tailwind's build-time JIT scanner and silently produces no
// CSS, which previously collapsed the map to 0 height).

export interface PublicMapMarker {
  id?: string;
  latitude: number;
  longitude: number;
  label?: string;
}

interface PublicLeafletMapProps {
  markers: PublicMapMarker[];
  height: number;
}

const FALLBACK_CENTER: [number, number] = [27.7172, 85.324]; // Kathmandu

export default function PublicLeafletMap({ markers, height }: PublicLeafletMapProps) {
  const elRef       = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  // Create the map once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      // @ts-ignore - css side-effect import, no types needed
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !elRef.current || mapRef.current) return;

      const center: [number, number] =
        markers.length > 0 ? [markers[0].latitude, markers[0].longitude] : FALLBACK_CENTER;

      const map = L.map(elRef.current, {
        center,
        zoom: markers.length > 0 ? 14 : 12,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setReady(true);
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

  // Keep markers in sync whenever the marker list changes (e.g. branches
  // load asynchronously after the map has already mounted)
  const markersKey = markers.map(m => `${m.id ?? ''}:${m.latitude}:${m.longitude}`).join('|');
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    (async () => {
      const L = await import('leaflet');

      markersRef.current.forEach(mk => mk.remove());
      markersRef.current = [];
      if (markers.length === 0) return;

      const icon = L.icon({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize:      [25, 41],
        iconAnchor:    [12, 41],
        popupAnchor:   [1, -34],
        shadowSize:    [41, 41],
      });

      markersRef.current = markers.map(m => {
        const mk = L.marker([m.latitude, m.longitude], { icon }).addTo(mapRef.current);
        if (m.label) mk.bindPopup(m.label);
        return mk;
      });

      if (markers.length === 1) {
        mapRef.current.setView([markers[0].latitude, markers[0].longitude], 15);
      } else if (markers.length > 1) {
        mapRef.current.fitBounds(
          L.latLngBounds(markers.map(m => [m.latitude, m.longitude] as [number, number])),
          { padding: [32, 32], maxZoom: 16 },
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, ready]);

  return <div ref={elRef} style={{ height, width: '100%' }} />;
}