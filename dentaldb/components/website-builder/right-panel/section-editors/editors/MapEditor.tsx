'use client';

import React from 'react';
import { EditorField, EditorSelect } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, font, PadStack } from './shared';

export function MapEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);

  const [branches, setBranches] = React.useState<Array<{ id: string; name: string; address?: string; latitude?: number | null; longitude?: number | null }>>([]);
  const [pulling, setPulling]   = React.useState(false);

  React.useEffect(() => {
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getBranchesForBuilder()
        .then((data: any[]) => setBranches(data || []))
        .catch(() => {});
    });
  }, []);

  /** Pull the first branch that has coordinates and apply to this map section */
  const pullFromBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    setPulling(true);
    const updates: Record<string, any> = {};
    if (branch.address) updates.address = branch.address;
    if (branch.latitude != null && branch.longitude != null) {
      updates.latitude  = branch.latitude;
      updates.longitude = branch.longitude;
      // Clear any stale embed URL so Leaflet coordinates take precedence
      updates.embedUrl  = '';
    }
    onChange({ ...settings, ...updates });
    setTimeout(() => setPulling(false), 600);
  };

  const branchesWithCoords = branches.filter(b => b.latitude != null && b.longitude != null);

  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'full-width'} onChange={v => $set('variant', v)} options={[
        { value: 'full-width',    label: '1. Full Width' },
        { value: 'contact-map',   label: '2. Contact + Map' },
        { value: 'floating-card', label: '3. Floating Card' },
        { value: 'multi-location',label: '4. Multi-Location' },
        { value: 'directions',    label: '5. Directions' },
      ]} />

      {/* Pull coordinates from a branch */}
      {branchesWithCoords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8b92a5', fontFamily: font }}>
            Pull location from branch
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) pullFromBranch(e.target.value); }}
              style={{ flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #2a2d3a', background: '#1e2130', color: '#c8cdd8', fontFamily: font, cursor: 'pointer' }}>
              <option value="" disabled>Select branch…</option>
              {branchesWithCoords.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 10, color: '#4b5060', margin: 0, fontFamily: font }}>
            Copies coordinates and address from your branch settings (GPS pin). Uses Leaflet — no API key needed.
          </p>
        </div>
      )}

      {/* Manual lat/lng override */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8b92a5', display: 'block', marginBottom: 4, fontFamily: font }}>Latitude</label>
          <input
            type="number"
            step="any"
            value={s.latitude ?? ''}
            onChange={e => $set('latitude', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="27.7172"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #2a2d3a', background: '#1e2130', color: '#c8cdd8', fontFamily: font, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8b92a5', display: 'block', marginBottom: 4, fontFamily: font }}>Longitude</label>
          <input
            type="number"
            step="any"
            value={s.longitude ?? ''}
            onChange={e => $set('longitude', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="85.3240"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #2a2d3a', background: '#1e2130', color: '#c8cdd8', fontFamily: font, boxSizing: 'border-box' }}
          />
        </div>
      </div>
      {(s.latitude != null && s.longitude != null) && (
        <p style={{ fontSize: 10, color: '#22c55e', margin: 0, fontFamily: font }}>
          ✓ Coordinates set — Leaflet map will render these exact coordinates on your site.
        </p>
      )}

      <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} placeholder="Find Us" />
      <EditorField
        label="Address"
        value={s.address}
        onChange={v => $set('address', v)}
        placeholder="123 Main St, Kathmandu"
        multiline
      />
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, lineHeight: 1.5, fontFamily: font }}>
        If coordinates above are set, the Leaflet map uses them directly. Otherwise the address is geocoded via OpenStreetMap.
      </p>
      <EditorField
        label="Custom Embed URL (optional override)"
        value={s.embedUrl}
        onChange={v => $set('embedUrl', v)}
        placeholder="https://maps.google.com/maps?q=...&output=embed"
      />
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, lineHeight: 1.5, fontFamily: font }}>
        Paste a Google Maps embed URL to override the Leaflet map entirely.
      </p>
      <EditorField label={`Height: ${s.height || 400}px`} type="range" min={200} max={700} value={s.height || 400} onChange={v => $set('height', Number(v))} />
    </PadStack>
  );
}
