'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recallsApi, usersApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import {
  Phone, Calendar, CheckCircle, AlertCircle, Clock,
  Plus, X, Bell, UserCheck, Ban, GitBranch, Check, XCircle,
  CalendarCheck, Loader2,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { formatNepalDateTime, nepalLocalInputToUTCISOString } from '@/lib/timezone';
import PatientCombobox from '@/components/ui/PatientCombobox';
import Header from '@/components/layout/Header';
import OutboxStatusBadge from '@/components/system/OutboxStatusBadge';

// ── Types ────────────────────────────────────────────────────────────────────
interface Recall {
  id: string;
  patientId: string;
  patient: { id: string; firstName: string; lastName: string; phone?: string; email?: string };
  dueDate: string;
  reason?: string;
  recallType: 'checkup' | 'followup' | 'medication_review' | 'other';
  status: 'pending' | 'contacted' | 'booked' | 'cancelled';
  notes?: string;
  appointmentId?: string;
  appointment?: { id: string; status: string; scheduledAt: string };
  createdAt: string;
}

const RECALL_TYPE_LABELS: Record<string, string> = {
  checkup: 'Check-up',
  followup: 'Follow-up',
  medication_review: 'Medication Review',
  other: 'Other',
};
const RECALL_TYPE_OPTIONS = Object.entries(RECALL_TYPE_LABELS);

// ── Add Recall Modal ──────────────────────────────────────────────────────────
function AddRecallModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate]     = useState('');
  const [reason, setReason]       = useState('');
  const [recallType, setRecallType] = useState('checkup');
  const [notes, setNotes]         = useState('');

  const mut = useMutation({
    mutationFn: () => recallsApi.create({ patientId, dueDate, reason, recallType, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      qc.invalidateQueries({ queryKey: ['recall-stats'] });
      toast.success('Recall added');
      onClose();
    },
    onError: () => toast.error('Failed to add recall'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Recall</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-muted)] rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Patient *</label>
            <PatientCombobox value={patientId} onChange={setPatientId} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Recall Type</label>
              <select value={recallType} onChange={e => setRecallType(e.target.value)} className="input w-full text-sm">
                {RECALL_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Due Date *</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reason</label>
            <input value={reason} onChange={e => setReason(e.target.value)} className="input w-full text-sm" placeholder="e.g. Annual check-up" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input w-full text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={!patientId || !dueDate || mut.isPending} className="btn-primary px-4">
            {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add Recall'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Book Appointment Drawer ───────────────────────────────────────────────────
function BookAppointmentDrawer({ recall, onClose }: { recall: Recall; onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch, branches } = useAuthStore();
  const fullName = `${recall.patient?.firstName ?? ''} ${recall.patient?.lastName ?? ''}`.trim();

  const [scheduledAt, setScheduledAt] = useState('');
  const [dentistId, setDentistId]     = useState('');
  const [branchId, setBranchId]       = useState(activeBranch?.id || '');
  const [notes, setNotes]             = useState(recall.reason ?? '');
  const [duration, setDuration]       = useState(30);

  const { data: doctorsData } = useQuery({
    queryKey: ['branch-doctors-recall', branchId],
    queryFn:  () => branchId
      ? branchesApi.getDoctors(branchId).then(r => r.data)
      : usersApi.listStaff({ roles: 'dentist,doctor', limit: 100 }).then(r => r.data?.data || []),
    enabled: true,
  });
  const doctors = Array.isArray(doctorsData) ? doctorsData : (doctorsData?.data || []);

  const mut = useMutation({
    mutationFn: () => recallsApi.createAppointment(recall.id, { scheduledAt: nepalLocalInputToUTCISOString(scheduledAt), dentistId: dentistId || undefined, branchId: branchId || undefined, notes, durationMinutes: duration }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      qc.invalidateQueries({ queryKey: ['recall-stats'] });
      toast.success('Appointment booked & recall linked');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to book appointment'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Book Appointment</h2>
            <p className="text-sm text-[var(--text-secondary)]">{fullName} · {RECALL_TYPE_LABELS[recall.recallType]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-muted)] rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {branches.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Branch</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input w-full text-sm">
                <option value="">— Any branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date & Time *</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="input w-full text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Doctor</label>
              <select value={dentistId} onChange={e => setDentistId(e.target.value)} className="input w-full text-sm">
                <option value="">— Any doctor —</option>
                {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={15} max={180} step={15} className="input w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input w-full text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={!scheduledAt || mut.isPending} className="btn-primary px-4">
            {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Book & Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recall Card ───────────────────────────────────────────────────────────────
function RecallCard({ recall, accentClass, onBook }: { recall: Recall; accentClass: string; onBook: (r: Recall) => void }) {
  const qc = useQueryClient();
  const patient  = recall.patient;
  const fullName = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim();
  const dueDateFmt = format(new Date(recall.dueDate), 'dd MMM yyyy');
  const hasAppointment = !!recall.appointmentId;

  const markContactedMut = useMutation({
    mutationFn: () => recallsApi.update(recall.id, { status: 'contacted' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recalls'] }); toast.success('Marked as contacted'); },
    onError: () => toast.error('Failed to update'),
  });

  const cancelMut = useMutation({
    mutationFn: () => recallsApi.update(recall.id, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recalls'] }); qc.invalidateQueries({ queryKey: ['recall-stats'] }); toast.success('Recall cancelled'); },
    onError: () => toast.error('Failed to cancel'),
  });


  const sendNowMut = useMutation({
    mutationFn: () => recallsApi.sendNow(recall.id),
    onSuccess: () => { toast.success('Recall reminder sent immediately!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to send reminder'),
  });

  const outcomeMut = useMutation({
    mutationFn: (outcome: 'completed' | 'no_show' | 'cancelled') => recallsApi.updateAppointmentOutcome(recall.id, outcome),
    onSuccess: (_, outcome) => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      toast.success(outcome === 'completed' ? 'Marked completed!' : outcome === 'no_show' ? 'Marked no-show' : 'Appointment cancelled');
    },
    onError: () => toast.error('Failed to update outcome'),
  });

  return (
    <div className={`rounded-xl border-l-4 ${accentClass} bg-[var(--bg-surface)] border border-[var(--border)] p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{fullName}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{RECALL_TYPE_LABELS[recall.recallType]}</p>
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">{dueDateFmt}</span>
      </div>

      {recall.reason && <p className="text-sm text-[var(--text-primary)] line-clamp-2">{recall.reason}</p>}

      {patient?.phone && (
        <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline w-fit">
          <Phone size={13} />{patient.phone}
        </a>
      )}

      {recall.notes && <p className="text-xs text-[var(--text-secondary)] italic line-clamp-2">{recall.notes}</p>}

      {/* Appointment linked — show outcome buttons */}
      {hasAppointment && recall.appointment && (
        <div className="rounded-lg p-2.5 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
            <CalendarCheck size={11} /> Appointment Linked
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {formatNepalDateTime(recall.appointment.scheduledAt)}
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">
              {recall.appointment.status.replace(/_/g, ' ')}
            </span>
          </p>
          {recall.appointment.status !== 'completed' && recall.appointment.status !== 'cancelled' && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => outcomeMut.mutate('completed')} disabled={outcomeMut.isPending}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                <Check size={10} /> Complete
              </button>
              <button onClick={() => outcomeMut.mutate('no_show')} disabled={outcomeMut.isPending}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors">
                <Clock size={10} /> No-show
              </button>
              <button onClick={() => outcomeMut.mutate('cancelled')} disabled={outcomeMut.isPending}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
                <XCircle size={10} /> Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {!hasAppointment && (
          <button onClick={() => onBook(recall)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">
            <Calendar size={12} /> Book Appointment
          </button>
        )}

        {recall.status !== 'contacted' && recall.status !== 'booked' && (
          <button onClick={() => markContactedMut.mutate()} disabled={markContactedMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
            <UserCheck size={12} /> {markContactedMut.isPending ? '…' : 'Contacted'}
          </button>
        )}

        {recall.status === 'contacted' && !hasAppointment && (
          <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle size={12} /> Contacted
          </span>
        )}

        {recall.status === 'booked' && (
          <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <CalendarCheck size={12} /> Booked
          </span>
        )}

        <button onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors" title="Cancel recall">
          <Ban size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function RecallColumn({ title, recalls, color, borderClass, badgeClass, emptyText, onBook }: {
  title: string; recalls: Recall[]; color: string; borderClass: string; badgeClass: string; emptyText: string; onBook: (r: Recall) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className={`font-semibold text-sm ${color}`}>{title}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{recalls.length}</span>
      </div>
      {recalls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--text-secondary)] text-sm">{emptyText}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {recalls.map(r => (
            <RecallCard key={r.id} recall={r} accentClass={borderClass} onBook={onBook} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecallsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [bookingRecall, setBookingRecall] = useState<Recall | null>(null);
  const { activeBranch } = useAuthStore();

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['recalls'],
    queryFn: () => recallsApi.list().then(r => r.data),
    refetchInterval: 60_000,
    enabled: !!activeBranch?.isActive,
  });

  const { data: stats } = useQuery({
    queryKey: ['recall-stats'],
    queryFn: () => recallsApi.stats().then(r => r.data),
    refetchInterval: 60_000,
    enabled: !!activeBranch?.isActive,
  });

  const overdue  = (groupsData as any)?.overdue  ?? [];
  const thisWeek = (groupsData as any)?.thisWeek ?? [];
  const upcoming = (groupsData as any)?.upcoming ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)]">
      <Header
        title="Patient Recalls"
        subtitle="Track & manage"
        action={activeBranch?.isActive ? { label: 'Add Recall', icon: Plus, onClick: () => setShowAddModal(true) } : undefined}
      />

      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4">
          <OutboxStatusBadge actionTypes={['recall.send']} />
        </div>

        {activeBranch && !activeBranch.isActive && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <GitBranch size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Branch is Inactive</p>
              <p className="text-xs opacity-80">Recall management is disabled while this branch is inactive.</p>
            </div>
          </div>
        )}

        {activeBranch?.isActive && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Total Pending', value: (stats as any)?.totalPending, color: 'text-[var(--text-primary)]' },
                { label: 'Overdue', value: (stats as any)?.overdueCount, color: 'text-red-500', icon: AlertCircle },
                { label: 'Booked This Month', value: (stats as any)?.bookedThisMonth, color: 'text-green-600', icon: CheckCircle },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-3 md:p-4 flex flex-col gap-1">
                  <p className={`text-[10px] md:text-xs font-medium uppercase tracking-wide flex items-center gap-1 ${s.color}`}>
                    {s.icon && <s.icon size={10} />} {s.label}
                  </p>
                  <p className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-[var(--text-secondary)]">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  Loading recalls…
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <RecallColumn title="Overdue" recalls={overdue} color="text-red-600 dark:text-red-400"
                  borderClass="border-l-red-500" badgeClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  emptyText="No overdue recalls 🎉" onBook={setBookingRecall} />
                <RecallColumn title="Due This Week" recalls={thisWeek} color="text-amber-600 dark:text-amber-400"
                  borderClass="border-l-amber-500" badgeClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  emptyText="Nothing due this week" onBook={setBookingRecall} />
                <RecallColumn title="Upcoming" recalls={upcoming} color="text-[var(--text-primary)]"
                  borderClass="border-l-[var(--accent)]" badgeClass="bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                  emptyText="No upcoming recalls" onBook={setBookingRecall} />
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && <AddRecallModal onClose={() => setShowAddModal(false)} />}
      {bookingRecall && <BookAppointmentDrawer recall={bookingRecall} onClose={() => setBookingRecall(null)} />}
    </div>
  );
}
