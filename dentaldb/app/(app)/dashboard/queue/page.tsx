'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import { patientsApi, queueApi, usersApi, appointmentsApi, BASE_URL } from '@/lib/api';
import InvoiceModal from '@/components/billing/InvoiceModal';
import { formatNepalClockTime, nepalLocalInputToUTCISOString, utcToNepalLocalInputValue } from '@/lib/timezone';
import Header from '@/components/layout/Header';
import { RegistrationDateField } from '@/components/ui/RegistrationDateFIeld';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  Users, PhoneCall, CheckCircle, Clock, SkipForward,
  UserPlus, Search, Tv, RefreshCw, Phone, ListOrdered,
  CalendarPlus, X, GitBranch,
  Loader2, Receipt, Pencil, Trash2,
} from 'lucide-react';

// Reuse lib/api.ts's Electron-aware BASE_URL — a locally recomputed
// process.env.NEXT_PUBLIC_API_URL here always skipped the isElectron check,
// which kept this socket pointed at production from inside the desktop app.
const SOCKET_URL = BASE_URL;

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  waiting:     { label: 'Waiting',     bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
  called:      { label: 'Called',      bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'  },
  in_progress: { label: 'In Progress', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200'},
  done:        { label: 'Done',        bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
  skipped:     { label: 'Skipped',     bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200'  },
};

function waitMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

// ── Token circle ───────────────────────────────────────────────────────────
function TokenBadge({ token, status }: { token: number; status: string }) {
  const colors: Record<string, string> = {
    waiting: 'bg-amber-500', called: 'bg-blue-500',
    in_progress: 'bg-purple-500', done: 'bg-green-500', skipped: 'bg-gray-400',
  };
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${colors[status] ?? 'bg-gray-400'}`}>
      {token}
    </div>
  );
}

// ── Create Appointment from Queue Modal ────────────────────────────────────
function CreateAppointmentModal({ entry, onClose }: { entry: any; onClose: () => void }) {
  const { activeBranch } = useAuthStore();
  const [form, setForm] = useState({
    scheduledAt: entry.createdAt ? utcToNepalLocalInputValue(entry.createdAt) : '',
    endsAt: entry.completedAt
      ? utcToNepalLocalInputValue(entry.completedAt)
      : entry.createdAt
        ? utcToNepalLocalInputValue(new Date(new Date(entry.createdAt).getTime() + 30 * 60000))
        : '',
    type: 'walk_in',
    notes: entry.notes ?? '',
    dentistId: entry.doctor?.id ?? '',
  });
  const [saving, setSaving] = useState(false);

  const branchId = activeBranch?.id ?? '';
  const { data: staffData } = useQuery({
    queryKey: ['staff', branchId],
    queryFn: () => usersApi.listStaff({ roles: 'doctor,dentist', branchId }).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!branchId,
  });
  const doctors = staffData?.data ?? staffData ?? [];

  const inp = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduledAt || !form.endsAt) return toast.error('Start and end time required');
    setSaving(true);
    try {
      // Use the idempotent queue endpoint — prevents double creation if called twice
      await queueApi.createAppointmentForEntry(entry.id, {
        scheduledAt: nepalLocalInputToUTCISOString(form.scheduledAt),
        endsAt: nepalLocalInputToUTCISOString(form.endsAt),
        type: form.type,
        notes: form.notes || undefined,
        dentistId: form.dentistId || undefined,
        branchId: activeBranch?.id,
      });
      toast.success('Appointment created');
      onClose();
    } catch {
      toast.error('Failed to create appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Create Appointment</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {entry.patient?.firstName} {entry.patient?.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-secondary)]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Time *</label>
            <RegistrationDateField
              value={form.scheduledAt}
              onChange={v => setForm(f => ({ ...f, scheduledAt: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Time *</label>
            <RegistrationDateField
              value={form.endsAt}
              onChange={v => setForm(f => ({ ...f, endsAt: v }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
              <option value="checkup">Checkup</option>
              <option value="followup">Follow-up</option>
              <option value="treatment">Treatment</option>
              <option value="consultation">Consultation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Doctor</label>
            <select value={form.dentistId} onChange={e => setForm(f => ({ ...f, dentistId: e.target.value }))} className={inp}>
              <option value="">Select doctor</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inp} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[var(--brand)] text-white font-medium disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Queue row ──────────────────────────────────────────────────────────────
function QueueRow({ entry, onCall, onDone, onSkip, onInProgress, onCreateAppointment, onBill, onEdit, onDelete, canManage }: any) {
  const cfg  = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting;
  const wait = waitMinutes(entry.createdAt);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
        entry.status === 'called'      ? 'border-blue-300 bg-blue-50/60 dark:bg-blue-950/20' :
        entry.status === 'in_progress' ? 'border-purple-300 bg-purple-50/60 dark:bg-purple-950/20' :
        'border-[var(--border)] bg-[var(--bg-surface)]'
      }`}
    >
      <TokenBadge token={entry.tokenNumber} status={entry.status} />

      <div className="flex-1 min-w-0">
        {/* Name + badge row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[var(--text-primary)] truncate">
            {entry.patient?.firstName} {entry.patient?.lastName}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {cfg.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)] mt-0.5">
          {entry.doctor && <span>Dr. {entry.doctor.firstName} {entry.doctor.lastName}</span>}
          {entry.patient?.opdNo && <span>OPD: {entry.patient.opdNo}</span>}
          {entry.patient?.phone && (
            <span className="flex items-center gap-1">
              <Phone size={11} />{entry.patient.phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {entry.status === 'done' ? 'Done' : `${wait}m`}
          </span>
        </div>
        {entry.notes && (
          <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate italic">{entry.notes}</div>
        )}

        {/* Action buttons — below text on mobile for more tap space */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {entry.status === 'waiting' && (
            <>
              <button
                onClick={() => onCall(entry.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
              >
                <PhoneCall size={12} /> Call
              </button>
              <button
                onClick={() => onSkip(entry.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] active:scale-95 transition-all"
              >
                <SkipForward size={12} /> Skip
              </button>
            </>
          )}
          {entry.status === 'called' && (
            <>
              <button
                onClick={() => onInProgress(entry.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 active:scale-95 transition-all"
              >
                Start
              </button>
              <button
                onClick={() => onDone(entry.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all"
              >
                <CheckCircle size={12} /> Done
              </button>
            </>
          )}
          {entry.status === 'in_progress' && (
            <button
              onClick={() => onDone(entry.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all"
            >
              <CheckCircle size={12} /> Mark Done
            </button>
          )}
          {entry.status === 'done' && onCreateAppointment && !entry.appointmentId && (
            <button
              onClick={() => onCreateAppointment(entry)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--brand)] text-white rounded-lg hover:opacity-90 active:scale-95 transition-all"
            >
              <CalendarPlus size={12} /> Create Appointment
            </button>
          )}
          {entry.status === 'done' && entry.appointmentId && (
            <span className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle size={12} /> Appointment Linked
            </span>
          )}
          {entry.status === 'done' && entry.patientId && (
            entry.appointment?.isPaid ? (
              <span className="flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
                <CheckCircle size={12} /> Billed
              </span>
            ) : onBill && (
              <button
                onClick={() => onBill(entry)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Receipt size={12} /> Bill
              </button>
            )
          )}
          {canManage && onEdit && (
            <button
              onClick={() => onEdit(entry)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] active:scale-95 transition-all"
              title="Edit entry"
            >
              <Pencil size={12} />
            </button>
          )}
          {canManage && onDelete && (
            <button
              onClick={() => onDelete(entry)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
              title="Delete entry"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit queue entry modal ──────────────────────────────────────────────────
function EditQueueEntryModal({ entry, doctors, onClose, onSave, saving }: any) {
  const [notes, setNotes]       = useState(entry.notes ?? '');
  const [doctorId, setDoctorId] = useState(entry.doctorId ?? entry.doctor?.id ?? '');
  const [opdNo, setOpdNo]       = useState(entry.patient?.opdNo ?? '');
  const inp = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(entry.id, { notes, doctorId: doctorId || undefined, opdNo });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Edit Queue Entry</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {entry.patient?.firstName} {entry.patient?.lastName} · Token #{entry.tokenNumber}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-secondary)]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">OPD No.</label>
            <input className={inp} value={opdNo} onChange={e => setOpdNo(e.target.value)} placeholder="e.g. OPD-00123" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Doctor</label>
            <select value={doctorId} onChange={e => setDoctorId(e.target.value)} className={inp}>
              <option value="">Unassigned</option>
              {doctors?.map((d: any) => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inp} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[var(--brand)] text-white font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ───────────────────────────────────────────────
function DeleteQueueEntryModal({ entry, onClose, onConfirm, deleting }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Delete queue entry?</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This permanently removes {entry.patient?.firstName} {entry.patient?.lastName}'s token #{entry.tokenNumber} from today's queue. This can't be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(entry.id)}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Walk-in form ───────────────────────────────────────────────────────────
function WalkInForm({ branchId, doctors, onSuccess }: any) {
  const [form, setForm]       = useState({ firstName: '', lastName: '', phone: '', opdNo: '', doctorId: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const f = (key: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [key]: e.target.value }));
  const inp = 'w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]';

  // Debounced patient search
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await patientsApi.list({ search: patientSearch, limit: 6 });
        setPatientResults(res.data?.data || res.data || []);
        setShowDropdown(true);
      } catch { setPatientResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const linkPatient = (p: any) => {
    setLinkedPatientId(p.id);
    setForm(prev => ({
      ...prev,
      firstName: p.firstName || '',
      lastName:  p.lastName  || '',
      phone:     p.phone     || p.mobile || '',
      opdNo:     p.opdNo     || '',
    }));
    setPatientSearch(`${p.firstName} ${p.lastName}`.trim());
    setShowDropdown(false);
  };

  const clearLink = () => {
    setLinkedPatientId(null);
    setPatientSearch('');
    setForm(prev => ({ ...prev, firstName: '', lastName: '', phone: '', opdNo: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.phone) return toast.error('First name and phone are required');
    setLoading(true);
    try {
      await queueApi.walkIn(branchId, {
        firstName:  form.firstName,
        lastName:   form.lastName  || undefined,
        phone:      form.phone,
        opdNo:      form.opdNo     || undefined,
        doctorId:   form.doctorId  || undefined,
        notes:      form.notes     || undefined,
        patientId:  linkedPatientId || undefined,
      });
      toast.success('Walk-in added to queue');
      setForm({ firstName: '', lastName: '', phone: '', opdNo: '', doctorId: '', notes: '' });
      setPatientSearch('');
      setLinkedPatientId(null);
      onSuccess?.();
    } catch {
      toast.error('Failed to add walk-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Patient Search */}
      <div className="relative">
        <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">
          Search existing patient
        </label>
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-[var(--text-muted)]" />
          <input
            className={inp + ' pl-8 pr-8'}
            placeholder="Search by name or phone…"
            value={patientSearch}
            onChange={e => { setPatientSearch(e.target.value); if (linkedPatientId) clearLink(); }}
            onFocus={() => patientResults.length > 0 && setShowDropdown(true)}
            autoComplete="off"
          />
          {linkedPatientId && (
            <button type="button" onClick={clearLink} className="absolute right-2 text-[var(--text-muted)] hover:text-red-500">
              <X size={14} />
            </button>
          )}
          {searching && <Loader2 size={14} className="absolute right-2 text-[var(--text-muted)] animate-spin" />}
        </div>

        {showDropdown && patientResults.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
            {patientResults.map((p: any) => (
              <button
                key={p.id} type="button"
                onClick={() => linkPatient(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-base)] text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] text-xs font-bold flex-shrink-0">
                  {p.firstName?.[0]}{p.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.firstName} {p.lastName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.phone || p.mobile || 'No phone'}</p>
                </div>
                {linkedPatientId === p.id && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
              </button>
            ))}
            <button type="button" onClick={() => setShowDropdown(false)}
              className="w-full text-xs text-center text-[var(--text-muted)] py-2 hover:bg-[var(--bg-base)]">
              New patient — fill form below
            </button>
          </div>
        )}
      </div>

      {linkedPatientId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <CheckCircle size={13} /> Linked to existing patient record
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input className={inp} placeholder="First name *" value={form.firstName} onChange={f('firstName')} />
        <input className={inp} placeholder="Last name"    value={form.lastName}  onChange={f('lastName')} />
      </div>
      <input className={inp} placeholder="OPD No. (optional)" value={form.opdNo} onChange={f('opdNo')} />
      <input className={inp} placeholder="Phone *" value={form.phone} onChange={f('phone')} type="tel" />
      <select className={inp} value={form.doctorId} onChange={f('doctorId')}>
        <option value="">Assign doctor (optional)</option>
        {doctors?.map((d: any) => (
          <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
        ))}
      </select>
      <textarea className={inp} placeholder="Notes (optional)" rows={2} value={form.notes} onChange={f('notes')} />
      <button
        type="submit" disabled={loading}
        className="w-full py-2.5 bg-[var(--brand)] text-white rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add Walk-in'}
      </button>
    </form>
  );
}

// ── Check-in search ────────────────────────────────────────────────────────
function CheckInSearch({ branchId, onSuccess }: any) {
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await queueApi.searchAppointments(branchId, query);
      setResults(res.data || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [branchId]);

  useEffect(() => { const t = setTimeout(() => search(q), 350); return () => clearTimeout(t); }, [q, search]);

  const checkIn = async (appointmentId: string) => {
    try {
      await queueApi.checkIn(branchId, appointmentId);
      toast.success('Patient checked in');
      setQ(''); setResults([]);
      onSuccess?.();
    } catch { toast.error('Check-in failed'); }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          placeholder="Search by name or phone…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {searching && <p className="text-xs text-[var(--text-secondary)] pl-1">Searching…</p>}
      {results.length > 0 && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          {results.map((apt: any) => (
            <div key={apt.id} className="flex items-center justify-between gap-2 p-2.5 bg-[var(--bg-surface)]">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {apt.patient?.firstName} {apt.patient?.lastName}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {apt.patient?.phone} · {apt.dentist?.firstName} · {formatNepalClockTime(apt.scheduledAt)}
                </div>
              </div>
              <button
                onClick={() => checkIn(apt.id)}
                className="shrink-0 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all"
              >
                Check In
              </button>
            </div>
          ))}
        </div>
      )}
      {q.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-[var(--text-secondary)] pl-1">No appointments found for today</p>
      )}
    </div>
  );
}

// ── Stats strip ────────────────────────────────────────────────────────────
function StatsStrip({ stats }: { stats: any }) {
  if (!stats) return null;
  const items = [
    { label: 'Total',    value: stats.total,                         color: 'text-[var(--text-primary)]' },
    { label: 'Waiting',  value: stats.waiting,                       color: 'text-amber-500' },
    { label: 'Active',   value: stats.inProgress + stats.called,     color: 'text-blue-500' },
    { label: 'Done',     value: stats.done,                          color: 'text-green-500' },
    { label: 'Avg wait', value: `${stats.avgWaitMinutes}m`,          color: 'text-[var(--text-secondary)]' },
  ];
  return (
    <div className="flex items-stretch divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--bg-surface)] overflow-x-auto">
      {items.map(s => (
        <div key={s.label} className="flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 px-1">
          <span className={`text-base sm:text-lg font-bold tabular-nums ${s.color}`}>{s.value}</span>
          <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] text-center leading-tight mt-0.5">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
type Tab = 'queue' | 'walkin' | 'checkin';

export default function QueuePage() {
  const { clinic, activeBranch } = useAuthStore();
  const { can } = usePermissions();
  const canManage = can('queue.manage');
  const qc       = useQueryClient();
  const router   = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const branchId  = activeBranch?.id ?? '';
  const [tab, setTab] = useState<Tab>('queue');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['queue', branchId],
    queryFn:  () => queueApi.getQueue(branchId).then(r => r.data),
    enabled:  !!branchId,
    refetchInterval: 30000,
  });
  const { data: stats } = useQuery({
    queryKey: ['queue-stats', branchId],
    queryFn:  () => queueApi.getStats(branchId).then(r => r.data),
    enabled:  !!branchId,
    refetchInterval: 30000,
  });
  const { data: doctorsData } = useQuery({
    queryKey: ['staff', branchId, 'onShift'],
    queryFn:  () => usersApi.listStaff({ roles: 'doctor,dentist', branchId, onShiftOnly: 'true' }).then(r => r.data?.data ?? r.data ?? []),
    enabled:  !!branchId,
  });

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clinic?.id || !branchId) return;
    const socket = io(`${SOCKET_URL}/queue`, {
      auth: { token: localStorage.getItem('accessToken') },
      // 'websocket' only fails hard behind proxies/CDNs that don't forward
      // the Upgrade header — falling back to polling keeps realtime working
      // there instead of silently degrading to the 30s refetchInterval.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-queue-room', { clinicId: clinic.id, branchId }));
    // Reconnects (e.g. after the tab was backgrounded) can miss events that
    // happened while disconnected — refetch immediately on every (re)join
    // so the queue never sits stale until the next 30s poll.
    socket.on('connect', () => {
      qc.invalidateQueries({ queryKey: ['queue', branchId] });
      qc.invalidateQueries({ queryKey: ['queue-stats', branchId] });
    });
    socket.on('queue:update', (payload: any) => {
      if (payload?.queue)  qc.setQueryData(['queue', branchId], payload.queue);
      if (payload?.stats)  qc.setQueryData(['queue-stats', branchId], payload.stats);
      if (!payload?.queue) qc.invalidateQueries({ queryKey: ['queue', branchId] });
      if (!payload?.stats) qc.invalidateQueries({ queryKey: ['queue-stats', branchId] });
    });
    return () => { socket.emit('leave-queue-room', { clinicId: clinic.id, branchId }); socket.disconnect(); };
  }, [clinic?.id, branchId, qc]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['queue', branchId] });
    qc.invalidateQueries({ queryKey: ['queue-stats', branchId] });
  };
  const callMut     = useMutation({ mutationFn: (id: string) => queueApi.callEntry(id),      onSuccess: inv, onError: () => toast.error('Failed') });
  const doneMut     = useMutation({ mutationFn: (id: string) => queueApi.markDone(id),       onSuccess: inv, onError: () => toast.error('Failed') });
  const skipMut     = useMutation({ mutationFn: (id: string) => queueApi.skipEntry(id),      onSuccess: inv, onError: () => toast.error('Failed') });
  const progressMut = useMutation({ mutationFn: (id: string) => queueApi.markInProgress(id), onSuccess: inv, onError: () => toast.error('Failed') });
  const callNextMut = useMutation({
    mutationFn: () => queueApi.callNext(branchId),
    onSuccess:  inv,
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'No patients waiting'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => queueApi.update(id, d),
    onSuccess:  () => { inv(); setEditEntry(null); toast.success('Queue entry updated'); },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update entry'),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => queueApi.remove(id),
    onSuccess:  () => { inv(); setDeleteEntry(null); toast.success('Queue entry deleted'); },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete entry'),
  });

  const activeQueue  = queue.filter((e: any) => ['waiting', 'called', 'in_progress'].includes(e.status));
  const doneQueue    = queue.filter((e: any) => e.status === 'done');
  const skippedQueue = queue.filter((e: any) => e.status === 'skipped');
  const doctors      = doctorsData?.data ?? doctorsData ?? [];
  const waitingCount = queue.filter((e: any) => e.status === 'waiting').length;
  const [apptEntry, setApptEntry] = useState<any>(null);
  const [billingEntry, setBillingEntry] = useState<any>(null);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [deleteEntry, setDeleteEntry] = useState<any>(null);
  const isBranchInactive = activeBranch && !activeBranch.isActive;

  // ── No branch ─────────────────────────────────────────────────────────────
  if (!branchId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Users size={28} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No branch selected</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Use the branch switcher in the sidebar to select a branch.<br />
            Each branch has its own independent queue.
          </p>
        </div>
      </div>
    );
  }

  // ── Tab bar (mobile only) ─────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'queue',   label: 'Queue',    icon: <ListOrdered size={16} />, badge: waitingCount || undefined },
    { key: 'walkin',  label: 'Walk-in',  icon: <UserPlus size={16} /> },
    { key: 'checkin', label: 'Check In', icon: <Search size={16} /> },
  ];

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ── */}
      <Header title="Waiting Room" subtitle={`${activeBranch?.name ?? ''} · Today`} />
      <div className="flex items-center justify-end gap-1.5 px-4 sm:px-6 py-2 border-b border-[var(--border)]">
        {!isBranchInactive && (
          <button
            onClick={() => callNextMut.mutate()}
            disabled={callNextMut.isPending}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <PhoneCall size={14} />
            <span className="hidden xs:inline">Call Next</span>
            <span className="xs:hidden">Next</span>
          </button>
        )}
        <button
          onClick={() => router.push('/dashboard/queue/display')}
          className="p-2 border border-[var(--border)] rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
          title="TV Mode"
        >
          <Tv size={15} className="text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={inv}
          className="p-2 border border-[var(--border)] rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* ── Branch Inactive Banner ── */}
      {isBranchInactive && (
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <GitBranch size={16} className="shrink-0" />
          <div>
            <p className="font-medium text-sm">Branch is Inactive</p>
            <p className="text-xs opacity-80">Queue management is disabled. Contact your administrator to re-enable this branch.</p>
          </div>
        </div>
      )}

      {!isBranchInactive && (
        <>
          {/* ── Stats strip ── */}
          <StatsStrip stats={stats} />

          {/* ── Mobile tab bar ── */}
          <div className="flex lg:hidden border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                  tab === t.key
                    ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {t.icon}
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-22px)] min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Body: side-by-side on desktop, tabbed on mobile ── */}
          <div className="flex-1 flex overflow-hidden">

            {/* Queue list — always visible on desktop, tab on mobile */}
            <div className={`flex-1 flex flex-col overflow-hidden lg:border-r lg:border-[var(--border)] ${tab !== 'queue' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40 text-[var(--text-secondary)] text-sm">
                    Loading queue…
                  </div>
                ) : activeQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-[var(--text-secondary)]">
                    <Users size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">Queue is empty</p>
                  </div>
                ) : (
                  activeQueue.map((entry: any) => (
                    <QueueRow
                      key={entry.id} entry={entry}
                      onCall={      (id: string) => callMut.mutate(id)}
                      onDone={      (id: string) => {
                        const preEntry = activeQueue.find((e: any) => e.id === id);
                        doneMut.mutate(id, {
                          // Use the server response, not the pre-mutation entry — markDone
                          // now auto-creates the appointment, so the fresh appointmentId
                          // (and any updated fields) only exist on the returned data.
                          onSuccess: (res: any) => {
                            const updated = res?.data ?? res;
                            const merged = { ...preEntry, ...updated, patient: updated?.patient ?? preEntry?.patient };
                            if (merged?.patientId) setBillingEntry(merged);
                          },
                        });
                      }}
                      onSkip={      (id: string) => skipMut.mutate(id)}
                      onInProgress= {(id: string) => progressMut.mutate(id)}
                      onCreateAppointment={setApptEntry}
                      onBill={setBillingEntry}
                      onEdit={setEditEntry}
                      onDelete={setDeleteEntry}
                      canManage={canManage}
                    />
                  ))
                )}

                {doneQueue.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none py-1 hover:text-[var(--text-primary)]">
                      Completed ({doneQueue.length})
                    </summary>
                    <div className="mt-2 space-y-2 opacity-80">
                      {doneQueue.map((entry: any) => (
                        <QueueRow
                          key={entry.id} entry={entry}
                          onCall={() => {}} onDone={() => {}} onSkip={() => {}} onInProgress={() => {}}
                          onCreateAppointment={setApptEntry} onBill={setBillingEntry}
                          onEdit={setEditEntry} onDelete={setDeleteEntry} canManage={canManage}
                        />
                      ))}
                    </div>
                  </details>
                )}
                {skippedQueue.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none py-1 hover:text-[var(--text-primary)]">
                      Skipped ({skippedQueue.length})
                    </summary>
                    <div className="mt-2 space-y-2 opacity-60">
                      {skippedQueue.map((entry: any) => (
                        <QueueRow
                          key={entry.id} entry={entry}
                          onCall={() => {}} onDone={() => {}} onSkip={() => {}} onInProgress={() => {}}
                          onEdit={setEditEntry} onDelete={setDeleteEntry} canManage={canManage}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Actions panel — fixed sidebar on desktop, tabs on mobile */}
            <div className={`
              w-full lg:w-80 lg:shrink-0 lg:flex flex-col overflow-y-auto
              bg-[var(--bg-base)] border-t lg:border-t-0 border-[var(--border)]
              ${tab === 'queue' ? 'hidden lg:flex' : 'flex'}
            `}>

              {/* Walk-in section */}
              <div className={`p-4 ${tab === 'checkin' ? 'hidden lg:block' : 'block'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus size={15} className="text-[var(--brand)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Walk-in</h3>
                </div>
                <WalkInForm branchId={branchId} doctors={doctors} onSuccess={() => { inv(); setTab('queue'); }} />
              </div>

              <div className={`border-t border-[var(--border)] hidden lg:block`} />

              {/* Check-in section */}
              <div className={`p-4 ${tab === 'walkin' ? 'hidden lg:block' : 'block'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Search size={15} className="text-[var(--brand)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Check In Appointment</h3>
                </div>
                <CheckInSearch branchId={branchId} onSuccess={() => { inv(); setTab('queue'); }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Create Appointment Modal ── */}
      {apptEntry && (
        <CreateAppointmentModal entry={apptEntry} onClose={() => setApptEntry(null)} />
      )}

      {/* ── Billing Modal — auto-prompted after marking a queue entry Done ── */}
      {billingEntry && (
        <InvoiceModal
          initialPatientId={billingEntry.patientId}
          initialPatientName={billingEntry.patient ? `${billingEntry.patient.firstName} ${billingEntry.patient.lastName}` : billingEntry.patientName}
          initialAppointmentId={billingEntry.appointmentId || undefined}
          onClose={() => setBillingEntry(null)}
          onSuccess={() => { setBillingEntry(null); inv(); toast.success('Invoice created'); }}
        />
      )}

      {/* ── Edit Queue Entry Modal — admin/owner always allowed, others via 'queue.manage' ── */}
      {editEntry && (
        <EditQueueEntryModal
          entry={editEntry}
          doctors={doctors}
          saving={updateMut.isPending}
          onClose={() => setEditEntry(null)}
          onSave={(id: string, d: any) => updateMut.mutate({ id, d })}
        />
      )}

      {/* ── Delete Queue Entry Confirmation ── */}
      {deleteEntry && (
        <DeleteQueueEntryModal
          entry={deleteEntry}
          deleting={removeMut.isPending}
          onClose={() => setDeleteEntry(null)}
          onConfirm={(id: string) => removeMut.mutate(id)}
        />
      )}
    </div>
  );
}