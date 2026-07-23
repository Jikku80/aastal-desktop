'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Globe, MapPin, Clock, Save, Eye, EyeOff, Shield, Building2 } from 'lucide-react';
import { clinicsApi, branchesApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { useTheme } from '@/contexts/ThemeProvider';
import toast from 'react-hot-toast';

const LocationMapPicker = dynamic(() => import('@/components/ui/LocationMapPicker'), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] animate-pulse" />,
});

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const CATEGORIES = ['dental','eye','dermatology','pediatrics','gynecology','physiotherapy','diagnostics','pharmacy','general','cardiology','orthopedics','neurology','psychiatry','ent'];

// ── Per-branch location editor ────────────────────────────────────────────────
function BranchLocationCard({
  branch,
  theme,
  onSaved,
}: {
  branch: any;
  theme: 'light' | 'dark';
  onSaved: (id: string, lat: number | null, lng: number | null) => void;
}) {
  const [lat, setLat] = useState<number | ''>(
    branch.latitude != null ? Number(branch.latitude) : ''
  );
  const [lng, setLng] = useState<number | ''>(
    branch.longitude != null ? Number(branch.longitude) : ''
  );
  const [saving, setSaving] = useState(false);

  const isDirty =
    (lat === '' ? null : lat) !== (branch.latitude != null ? Number(branch.latitude) : null) ||
    (lng === '' ? null : lng) !== (branch.longitude != null ? Number(branch.longitude) : null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await branchesApi.update(branch.id, {
        latitude:  lat  === '' ? null : lat,
        longitude: lng  === '' ? null : lng,
      });
      onSaved(branch.id, lat === '' ? null : lat, lng === '' ? null : lng);
      toast.success(`${branch.name} location saved`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save branch location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={16} className="text-[var(--brand)] flex-shrink-0" />
          <span className="font-semibold text-[var(--text-primary)] truncate">{branch.name}</span>
          {branch.isPubliclyListed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium flex-shrink-0">Listed</span>
          )}
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--brand)] text-white font-medium disabled:opacity-60 flex-shrink-0"
          >
            <Save size={12} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      <LocationMapPicker
        key={branch.id}
        theme={theme}
        heightClassName="h-52"
        latitude={lat}
        longitude={lng}
        mainLabel={branch.name}
        onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={e => setLat(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="27.7172"
            className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={e => setLng(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="85.3240"
            className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicListingPage() {
  const { resolved } = useTheme();
  const mapTheme = resolved === 'dark' ? 'dark' : 'light';

  const [clinic, setClinic] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    isPubliclyListed: false,
    publicDescription: '',
    coverImageUrl: '',
    categoryTags: [],
    latitude: '',
    longitude: '',
    detectedAddress: '',
    openingHours: {},
    acceptsInsurance: false,
    insuranceProviders: '',
    languagesSpoken: '',
    isEmergencyCapable: false,
    isOpen24Hours: false,
    cancellationWindowHours: 24,
  });

  useEffect(() => {
    Promise.all([clinicsApi.getCurrent(), branchesApi.list().catch(() => ({ data: [] }))])
      .then(([cr, br]) => {
        const c = cr.data;
        setClinic(c);
        setBranches(Array.isArray(br.data) ? br.data : (br.data?.data || []));
        setForm({
          isPubliclyListed: c.isPubliclyListed || false,
          publicDescription: c.publicDescription || '',
          coverImageUrl: c.coverImageUrl || '',
          categoryTags: c.categoryTags || [],
          latitude: c.latitude ?? '',
          longitude: c.longitude ?? '',
          openingHours: c.openingHours || {},
          acceptsInsurance: c.acceptsInsurance || false,
          insuranceProviders: (c.insuranceProviders || []).join(', '),
          languagesSpoken: (c.languagesSpoken || []).join(', '),
          isEmergencyCapable: c.isEmergencyCapable || false,
          isOpen24Hours: c.isOpen24Hours || false,
          cancellationWindowHours: c.cancellationWindowHours || 24,
        });
      })
      .catch((e: any) => setLoadError(e?.response?.data?.message || 'Failed to load listing settings.'))
      .finally(() => setLoading(false));
  }, []);

  // Stable reference — only recalculates when branch list actually changes.
  // This prevents the LocationMapPicker's extraMarkers effect from firing on
  // every parent re-render, which was causing all branch pins to re-draw at once.
  const branchMarkers = useMemo(
    () =>
      branches
        .filter(b => b.latitude != null && b.longitude != null)
        .map(b => ({
          id: b.id,
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
          label: b.name,
          sublabel: b.isPubliclyListed ? 'Publicly listed' : 'Not publicly listed',
        })),
    [branches],
  );

  const toggleCategory = (cat: string) => {
    setForm((f: any) => ({
      ...f,
      categoryTags: f.categoryTags.includes(cat)
        ? f.categoryTags.filter((t: string) => t !== cat)
        : [...f.categoryTags, cat],
    }));
  };

  const updateHours = (day: string, field: string, value: string | boolean) => {
    setForm((f: any) => ({
      ...f,
      openingHours: {
        ...f.openingHours,
        [day]: { ...(f.openingHours[day] || { open: '09:00', close: '18:00', closed: false }), [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { detectedAddress, ...rest } = form;
      await clinicsApi.update({
        ...rest,
        insuranceProviders: form.insuranceProviders.split(',').map((s: string) => s.trim()).filter(Boolean),
        languagesSpoken: form.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean),
        latitude:  form.latitude  !== '' ? parseFloat(form.latitude)  : null,
        longitude: form.longitude !== '' ? parseFloat(form.longitude) : null,
        cancellationWindowHours: form.cancellationWindowHours === '' ? 24 : form.cancellationWindowHours,
      });
      toast.success('Listing settings saved!');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed. Please try again.');
    } finally { setSaving(false); }
  };

  // Update a branch in local state after its location is saved
  const handleBranchSaved = (id: string, lat: number | null, lng: number | null) => {
    setBranches(prev =>
      prev.map(b => b.id === id ? { ...b, latitude: lat, longitude: lng } : b)
    );
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (loadError) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><Shield size={24} className="text-red-400" /></div>
      <p className="font-semibold text-[var(--text-primary)]">Could not load listing settings</p>
      <p className="text-sm text-[var(--text-muted)]">{loadError}</p>
      <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-[var(--brand)] text-white rounded-lg text-sm font-medium">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Public Listing"
        subtitle="Control how your clinic appears to patients on the discovery platform"
        action={{ label: saving ? 'Saving…' : 'Save Changes', onClick: handleSave, icon: Save }}
      />

      <div className="max-w-3xl w-full mx-auto space-y-6 p-4 sm:p-6">
        {/* Visibility toggle */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${form.isPubliclyListed ? 'bg-green-500/10 text-green-500' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'}`}>
                {form.isPubliclyListed ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">Public Listing</p>
                <p className="text-[var(--text-muted)] text-sm truncate">{form.isPubliclyListed ? 'Visible to patients in discovery' : 'Hidden from public search'}</p>
              </div>
            </div>
            <button onClick={() => setForm((f: any) => ({ ...f, isPubliclyListed: !f.isPubliclyListed }))}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form.isPubliclyListed ? 'bg-green-500' : 'bg-[var(--bg-muted)]'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isPubliclyListed ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Basic info */}
        <div className="card p-4 sm:p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Globe size={16} /> Basic Information</h2>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Public Description</label>
            <textarea value={form.publicDescription} onChange={e => setForm((f: any) => ({ ...f, publicDescription: e.target.value }))}
              rows={4} placeholder="Describe your clinic, services, and what makes you unique…"
              className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Cover Image URL</label>
            <input value={form.coverImageUrl} onChange={e => setForm((f: any) => ({ ...f, coverImageUrl: e.target.value }))}
              placeholder="https://…"
              className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]" />
            {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="mt-2 h-28 rounded-xl object-cover border border-[var(--border)]" />}
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Cancellation Window</label>
            <div className="flex items-center gap-3">
              <input type="number" min="0" max="168" value={form.cancellationWindowHours}
                onChange={e => setForm((f: any) => ({ ...f, cancellationWindowHours: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                className="w-24 border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
              <span className="text-[var(--text-muted)] text-sm">hours before appointment</span>
            </div>
          </div>
        </div>

        {/* Specialty tags */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Specialty Tags</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-xl border text-sm capitalize font-medium transition-all ${
                  form.categoryTags.includes(cat)
                    ? 'bg-[var(--brand)] border-[var(--brand)] text-white'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]/50'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Clinic main location */}
        <div className="card p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--brand)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Clinic Location</h2>
          </div>
          <p className="text-[var(--text-muted)] text-xs">
            Main clinic pin used for distance-based discovery. Drag the pin or click the map to fine-tune.
          </p>
          <LocationMapPicker
            theme={mapTheme}
            latitude={form.latitude === '' ? '' : Number(form.latitude)}
            longitude={form.longitude === '' ? '' : Number(form.longitude)}
            mainLabel={clinic?.name || 'Clinic'}
            extraMarkers={branchMarkers}
            onChange={(lat, lng) => setForm((f: any) => ({ ...f, latitude: lat, longitude: lng }))}
            onAddressDetected={addr => setForm((f: any) => ({ ...f, detectedAddress: addr }))}
          />
          {form.detectedAddress && (
            <p className="text-xs text-[var(--text-muted)]">Detected: <span className="text-[var(--text-primary)] font-medium">{form.detectedAddress}</span></p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={e => setForm((f: any) => ({ ...f, latitude: e.target.value }))}
                placeholder="27.7172"
                className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={e => setForm((f: any) => ({ ...f, longitude: e.target.value }))}
                placeholder="85.3240"
                className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
            </div>
          </div>
        </div>

        {/* Per-branch location editors */}
        {branches.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Building2 size={16} className="text-[var(--brand)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Branch Locations</h2>
              <span className="text-xs text-[var(--text-muted)]">— each branch has its own pin</span>
            </div>
            {branches.map(branch => (
              <BranchLocationCard
                key={branch.id}
                branch={branch}
                theme={mapTheme}
                onSaved={handleBranchSaved}
              />
            ))}
          </div>
        )}

        {/* Opening hours */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4"><Clock size={16} /> Opening Hours</h2>
          <div className="space-y-3">
            {DAYS.map(day => {
              const h = form.openingHours[day] || { open: '09:00', close: '18:00', closed: false };
              return (
                <div key={day} className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <span className="w-20 sm:w-24 text-sm font-medium text-[var(--text-secondary)] capitalize">{day.slice(0,3)}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!h.closed}
                      onChange={e => updateHours(day, 'closed', !e.target.checked)}
                      className="w-4 h-4 accent-[var(--brand)] rounded" />
                    <span className="text-xs text-[var(--text-muted)]">Open</span>
                  </label>
                  {!h.closed && (
                    <>
                      <input type="time" value={h.open} onChange={e => updateHours(day, 'open', e.target.value)}
                        className="border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
                      <span className="text-[var(--text-muted)] text-sm">–</span>
                      <input type="time" value={h.close} onChange={e => updateHours(day, 'close', e.target.value)}
                        className="border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
                    </>
                  )}
                  {h.closed && <span className="text-[var(--text-muted)] text-sm">Closed</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional details */}
        <div className="card p-4 sm:p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Shield size={16} /> Additional Details</h2>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Languages Spoken (comma-separated)</label>
            <input value={form.languagesSpoken} onChange={e => setForm((f: any) => ({ ...f, languagesSpoken: e.target.value }))}
              placeholder="Nepali, English, Hindi"
              className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
          </div>
          <div className="space-y-3">
            {[
              { key: 'acceptsInsurance', label: 'Accepts Insurance' },
              { key: 'isEmergencyCapable', label: 'Emergency Services Available' },
              { key: 'isOpen24Hours', label: 'Open 24 Hours' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form[key]}
                  onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.checked }))}
                  className="w-5 h-5 accent-[var(--brand)] rounded" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
              </label>
            ))}
          </div>
          {form.acceptsInsurance && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Insurance Providers (comma-separated)</label>
              <input value={form.insuranceProviders} onChange={e => setForm((f: any) => ({ ...f, insuranceProviders: e.target.value }))}
                placeholder="Shikhar Insurance, Sagarmatha Insurance"
                className="w-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}