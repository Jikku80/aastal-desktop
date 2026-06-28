'use client';
import { useState, useEffect, useCallback } from 'react';
import { User, MapPin, Video, Clock, Building2, Star, Zap, Plus, Trash2, Save, Bell } from 'lucide-react';
import { doctorProfileApi, affiliationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SPECIALTIES = ['General Dentistry','Orthodontics','Oral Surgery','Periodontics','Endodontics','Prosthodontics','General Medicine','Cardiology','Dermatology','Pediatrics','Gynecology','Physiotherapy'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'locations' | 'invites'>('profile');
  const [profile, setProfile] = useState<any>({});
  const [locations, setLocations] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const [p, locs, avail] = await Promise.allSettled([
      doctorProfileApi.get(userId),
      doctorProfileApi.getLocations(userId),
      doctorProfileApi.getAvailability(userId),
    ]);
    if (p.status === 'fulfilled') setProfile(p.value.data || {});
    if (locs.status === 'fulfilled') setLocations(locs.value.data || []);
    if (avail.status === 'fulfilled') setAvailability(avail.value.data || []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Heartbeat every 30s when on this page
  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => doctorProfileApi.heartbeat(userId).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [userId]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await doctorProfileApi.update(userId, profile);
      alert('Profile saved!');
    } catch { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const addLocation = () => setLocations(l => [...l, { id: `new-${Date.now()}`, name: '', address: '', latitude: '', longitude: '', isNew: true }]);
  const saveLocation = async (loc: any) => {
    if (!userId) return;
    try {
      if (loc.isNew) {
        const r = await doctorProfileApi.addLocation(userId, { name: loc.name, address: loc.address, latitude: loc.latitude || null, longitude: loc.longitude || null });
        setLocations(l => l.map(x => x.id === loc.id ? r.data : x));
      }
    } catch { alert('Failed to save location'); }
  };
  const removeLocation = async (loc: any) => {
    if (!userId || loc.isNew) { setLocations(l => l.filter(x => x.id !== loc.id)); return; }
    try { await doctorProfileApi.removeLocation(userId, loc.id); setLocations(l => l.filter(x => x.id !== loc.id)); }
    catch { alert('Failed to remove location'); }
  };

  const addAvailabilitySlot = () => setAvailability(a => [...a, { id: `new-${Date.now()}`, dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, consultationType: 'both', isNew: true }]);
  const saveAvailability = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await doctorProfileApi.setAvailability(userId, availability.map(({ isNew, ...a }) => a));
      await load();
      alert('Availability saved!');
    } catch { alert('Failed to save availability'); }
    finally { setSaving(false); }
  };

  const handleInvite = async (id: string, action: 'accept' | 'decline') => {
    if (!userId) return;
    try {
      if (action === 'accept') await affiliationsApi.accept(id, userId);
      else await affiliationsApi.decline(id, userId);
      setInvites(i => i.filter(x => x.id !== id));
    } catch { alert(`Failed to ${action} invite`); }
  };

  const tabs = [
    { key: 'profile', label: 'My Profile', icon: <User size={15} /> },
    { key: 'availability', label: 'Availability', icon: <Clock size={15} /> },
    { key: 'locations', label: 'Locations', icon: <MapPin size={15} /> },
    { key: 'invites', label: `Invites${invites.length ? ` (${invites.length})` : ''}`, icon: <Bell size={15} /> },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your public profile, availability, and practice locations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-5 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Professional Info</h2>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Bio</label>
              <textarea value={profile.bio || ''} onChange={e => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
                rows={4} placeholder="Describe your expertise, approach, and experience…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Years of Experience</label>
                <input type="number" min="0" value={profile.yearsOfExperience || 0}
                  onChange={e => setProfile((p: any) => ({ ...p, yearsOfExperience: +e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Profile Photo URL</label>
                <input value={profile.profilePhotoUrl || ''} onChange={e => setProfile((p: any) => ({ ...p, profilePhotoUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Specializations</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(s => {
                  const active = (profile.specializations || []).includes(s);
                  return (
                    <button key={s} onClick={() => setProfile((p: any) => ({
                      ...p,
                      specializations: active
                        ? (p.specializations || []).filter((x: string) => x !== s)
                        : [...(p.specializations || []), s],
                    }))}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Qualifications (comma-separated)</label>
              <input value={(profile.qualifications || []).join(', ')}
                onChange={e => setProfile((p: any) => ({ ...p, qualifications: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                placeholder="BDS, MDS, FCPS"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">In-Person Fee (Rs.)</label>
                <input type="number" value={profile.consultationFee || ''}
                  onChange={e => setProfile((p: any) => ({ ...p, consultationFee: +e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Video Fee (Rs.)</label>
                <input type="number" value={profile.videoConsultationFee || ''}
                  onChange={e => setProfile((p: any) => ({ ...p, videoConsultationFee: +e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Languages (comma-separated)</label>
              <input value={(profile.languagesSpoken || []).join(', ')}
                onChange={e => setProfile((p: any) => ({ ...p, languagesSpoken: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                placeholder="Nepali, English"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">Public Profile</p>
                  <p className="text-gray-400 text-xs">Visible to patients in discovery</p>
                </div>
                <Toggle checked={!!profile.isPubliclyListed} onChange={v => setProfile((p: any) => ({ ...p, isPubliclyListed: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm flex items-center gap-1"><Zap size={13} className="text-green-500" /> Instant Consult</p>
                  <p className="text-gray-400 text-xs">Appear in on-demand video matching</p>
                </div>
                <Toggle checked={!!profile.isAvailableForInstantConsult} onChange={v => setProfile((p: any) => ({ ...p, isAvailableForInstantConsult: v }))} />
              </div>
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">Set your weekly independent schedule for direct bookings</p>
            <button onClick={addAvailabilitySlot}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={15} /> Add Slot
            </button>
          </div>

          {availability.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Clock size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">No availability set</p>
              <p className="text-gray-400 text-sm mt-1">Add weekly availability slots for independent bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availability.map((slot, i) => (
                <div key={slot.id} className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-5 gap-3 items-center">
                  <select value={slot.dayOfWeek}
                    onChange={e => setAvailability(a => a.map((s, j) => j === i ? { ...s, dayOfWeek: +e.target.value } : s))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                    {DAYS.map((d, di) => <option key={d} value={di}>{d}</option>)}
                  </select>
                  <input type="time" value={slot.startTime}
                    onChange={e => setAvailability(a => a.map((s, j) => j === i ? { ...s, startTime: e.target.value } : s))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                  <input type="time" value={slot.endTime}
                    onChange={e => setAvailability(a => a.map((s, j) => j === i ? { ...s, endTime: e.target.value } : s))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                  <select value={slot.consultationType}
                    onChange={e => setAvailability(a => a.map((s, j) => j === i ? { ...s, consultationType: e.target.value } : s))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="both">Both</option>
                    <option value="in_person">In-Person</option>
                    <option value="video">Video</option>
                  </select>
                  <button onClick={() => setAvailability(a => a.filter((_, j) => j !== i))}
                    className="flex items-center justify-center w-8 h-8 text-red-400 hover:bg-red-50 rounded-lg transition-colors ml-auto">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {availability.length > 0 && (
            <button onClick={saveAvailability} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
              Save Availability
            </button>
          )}
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">Manage your independent practice locations</p>
            <button onClick={addLocation}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={15} /> Add Location
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <MapPin size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">No locations added</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc, i) => (
                <div key={loc.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                      <input value={loc.name} onChange={e => setLocations(l => l.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="My Clinic, Home Practice…"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
                      <input value={loc.address || ''} onChange={e => setLocations(l => l.map((x, j) => j === i ? { ...x, address: e.target.value } : x))}
                        placeholder="Street, City"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="any" value={loc.latitude || ''} onChange={e => setLocations(l => l.map((x, j) => j === i ? { ...x, latitude: e.target.value } : x))}
                      placeholder="Latitude" className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                    <input type="number" step="any" value={loc.longitude || ''} onChange={e => setLocations(l => l.map((x, j) => j === i ? { ...x, longitude: e.target.value } : x))}
                      placeholder="Longitude" className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="flex justify-between">
                    {loc.isNew && (
                      <button onClick={() => saveLocation(loc)}
                        className="text-sm text-blue-600 font-medium hover:underline">Save Location</button>
                    )}
                    <button onClick={() => removeLocation(loc)}
                      className="flex items-center gap-1 text-red-400 text-sm hover:text-red-600 ml-auto">
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invites Tab */}
      {activeTab === 'invites' && (
        <div className="max-w-2xl space-y-3">
          {invites.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Bell size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">No pending invitations</p>
            </div>
          ) : (
            invites.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{inv.clinic?.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">Invited {new Date(inv.invitedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleInvite(inv.id, 'accept')}
                    className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600">Accept</button>
                  <button onClick={() => handleInvite(inv.id, 'decline')}
                    className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50">Decline</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
