'use client';
import { useState, useEffect } from 'react';
import { UserPlus, Users, Mail, Building2, CheckCircle, XCircle, PauseCircle, Trash2, Search } from 'lucide-react';
import { affiliationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  invited:   'bg-amber-100 text-amber-700',
  suspended: 'bg-orange-100 text-orange-700',
  removed:   'bg-red-100 text-red-700',
};

export default function DoctorAffiliationsPage() {
  const { user } = useAuthStore();
  const clinicId = user?.clinicId;

  const [affiliations, setAffiliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ doctorUserId: '', branchId: '' });
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = () => {
    if (!clinicId) return;
    setLoading(true);
    affiliationsApi.list(clinicId)
      .then(r => setAffiliations(r.data || []))
      .catch(() => setAffiliations([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [clinicId]);

  const handleInvite = async () => {
    if (!clinicId || !inviteForm.doctorUserId.trim()) return;
    setInviting(true);
    try {
      await affiliationsApi.invite(clinicId, { doctorUserId: inviteForm.doctorUserId.trim(), branchId: inviteForm.branchId || undefined });
      setShowInviteModal(false);
      setInviteForm({ doctorUserId: '', branchId: '' });
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to invite doctor');
    } finally { setInviting(false); }
  };

  const handleAction = async (id: string, action: 'suspend' | 'remove') => {
    if (!clinicId) return;
    const confirmMsg = action === 'remove' ? 'Remove this doctor from your clinic?' : 'Suspend this doctor?';
    if (!confirm(confirmMsg)) return;
    try {
      if (action === 'suspend') await affiliationsApi.suspend(id, clinicId);
      else await affiliationsApi.remove(id, clinicId);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || `Failed to ${action} doctor`);
    }
  };

  const filtered = affiliations.filter(a => {
    const matchSearch = !search || `${a.doctor?.firstName} ${a.doctor?.lastName}`.toLowerCase().includes(search.toLowerCase()) || a.doctor?.email?.includes(search);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = { all: affiliations.length, active: affiliations.filter(a => a.status === 'active').length, invited: affiliations.filter(a => a.status === 'invited').length, suspended: affiliations.filter(a => a.status === 'suspended').length };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Affiliations</h1>
          <p className="text-gray-500 text-sm mt-1">Manage doctors associated with your clinic</p>
        </div>
        <button onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          <UserPlus size={16} /> Invite Doctor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.all, icon: <Users size={18} />, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Active', value: counts.active, icon: <CheckCircle size={18} />, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Invited', value: counts.invited, icon: <Mail size={18} />, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Suspended', value: counts.suspended, icon: <PauseCircle size={18} />, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search doctors…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
        </div>
        <div className="flex gap-2">
          {['all','active','invited','suspended'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No doctors found</p>
            <p className="text-gray-400 text-sm mt-1">
              {affiliations.length === 0 ? 'Invite your first doctor to get started' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Doctor', 'Role', 'Branch', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(aff => (
                <tr key={aff.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {aff.doctor?.firstName?.[0]}{aff.doctor?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Dr. {aff.doctor?.firstName} {aff.doctor?.lastName}
                        </p>
                        <p className="text-gray-400 text-xs">{aff.doctor?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600 capitalize">{aff.doctor?.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{aff.branch?.name || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[aff.status] || 'bg-gray-100 text-gray-600'}`}>
                      {aff.status}
                    </span>
                    {aff.isPrimaryEmployment && (
                      <span className="ml-1 text-xs text-blue-500">(Primary)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {aff.joinedAt ? new Date(aff.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {aff.status === 'active' && (
                        <button onClick={() => handleAction(aff.id, 'suspend')} title="Suspend"
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                          <PauseCircle size={15} />
                        </button>
                      )}
                      {aff.status !== 'removed' && (
                        <button onClick={() => handleAction(aff.id, 'remove')} title="Remove"
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-1">Invite Doctor</h2>
            <p className="text-gray-500 text-sm mb-5">Enter the User ID of an existing doctor to invite them to your clinic.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Doctor User ID *</label>
                <input value={inviteForm.doctorUserId} onChange={e => setInviteForm(f => ({ ...f, doctorUserId: e.target.value }))}
                  placeholder="Doctor's user ID"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                <p className="text-gray-400 text-xs mt-1">The doctor must already have a DentalOS account.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Branch (optional)</label>
                <input value={inviteForm.branchId} onChange={e => setInviteForm(f => ({ ...f, branchId: e.target.value }))}
                  placeholder="Branch ID (optional)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInviteModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleInvite} disabled={inviting || !inviteForm.doctorUserId.trim()}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {inviting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
