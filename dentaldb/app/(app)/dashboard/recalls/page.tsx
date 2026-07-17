'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recallsApi, usersApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import {
  Phone, Calendar, CheckCircle, AlertCircle, Clock,
  Plus, X, Bell, UserCheck, Ban, GitBranch, Check, XCircle,
  CalendarCheck, Loader2, Users, TrendingUp, Sparkles,
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(first?: string, last?: string) {
  return `${(first || '?')[0] ?? ''}${(last || '')[0] ?? ''}`.toUpperCase();
}

// Deterministic soft accent per patient, purely cosmetic (avatar ring color)
const AVATAR_PALETTE = [
  { bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400' },
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// Shared field label
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
      {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

// ── Add Recall Modal ──────────────────────────────────────────────────────────
function AddRecallModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch, branches } = useAuthStore();
  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate]     = useState('');
  const [dueTime, setDueTime]     = useState('10:00');
  const [reason, setReason]       = useState('');
  const [recallType, setRecallType] = useState('checkup');
  const [notes, setNotes]         = useState('');
  const [dentistId, setDentistId] = useState('');
  const [branchId, setBranchId]   = useState(activeBranch?.id || '');
  const [duration, setDuration]   = useState(30);

  // Same appointment-slot fields the "Book Appointment" drawer uses — needed
  // here too because the backend auto-books a follow-up appointment for the
  // selected due date/time as soon as the recall is created, and it can only
  // do that when a dentist (a required field on Appointment) is supplied.
  const { data: doctorsData } = useQuery({
    queryKey: ['branch-doctors-recall-add', branchId],
    queryFn:  () => branchId
      ? branchesApi.getDoctors(branchId).then(r => r.data)
      : usersApi.listStaff({ roles: 'dentist,doctor', limit: 100 }).then(r => r.data?.data || []),
    enabled: true,
  });
  const doctors = Array.isArray(doctorsData) ? doctorsData : (doctorsData?.data || []);

  const mut = useMutation({
    mutationFn: () => recallsApi.create({
      patientId,
      dueDate: nepalLocalInputToUTCISOString(`${dueDate}T${dueTime || '10:00'}`),
      reason,
      recallType,
      notes,
      dentistId: dentistId || undefined,
      branchId: branchId || undefined,
      durationMinutes: duration,
    }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      qc.invalidateQueries({ queryKey: ['recall-stats'] });
      if (dentistId && !res?.data?.appointment) {
        toast.error('Recall added, but the appointment could not be auto-booked. Use "Book Appointment" to try again.');
      } else if (dentistId) {
        toast.success('Recall added & appointment booked');
      } else {
        toast.success('Recall added — pick a doctor next time to auto-book the appointment');
      }
      onClose();
    },
    onError: () => toast.error('Failed to add recall'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/12 text-[var(--accent)] flex items-center justify-center">
              <Bell size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight">Add Recall</h2>
              <p className="text-xs text-[var(--text-secondary)]">Schedule a follow-up reminder</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-secondary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div>
            <FieldLabel required>Patient</FieldLabel>
            <PatientCombobox value={patientId} onChange={setPatientId} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Recall type</FieldLabel>
              <select value={recallType} onChange={e => setRecallType(e.target.value)} className="input w-full text-sm">
                {RECALL_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel required>Due date</FieldLabel>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input w-full text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Appointment time</FieldLabel>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="input w-full text-sm" />
            </div>
            <div>
              <FieldLabel>Duration (min)</FieldLabel>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={15} max={180} step={15} className="input w-full text-sm" />
            </div>
          </div>

          {branches.length > 1 && (
            <div>
              <FieldLabel>Branch</FieldLabel>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input w-full text-sm">
                <option value="">— Any branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <FieldLabel>Doctor</FieldLabel>
            <select value={dentistId} onChange={e => setDentistId(e.target.value)} className="input w-full text-sm">
              <option value="">— No doctor (won't auto-book) —</option>
              {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
            </select>
            <p className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)] mt-1.5">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              Pick a doctor to automatically book an appointment for the due date above.
            </p>
          </div>

          <div>
            <FieldLabel>Reason</FieldLabel>
            <input value={reason} onChange={e => setReason(e.target.value)} className="input w-full text-sm" placeholder="e.g. Annual check-up" />
          </div>

          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input w-full text-sm resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!patientId || !dueDate || mut.isPending}
            className="btn-primary px-4 min-w-[110px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
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

  const av = avatarColor(recall.patientId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${av.bg} ${av.text}`}>
              {initials(recall.patient?.firstName, recall.patient?.lastName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight truncate">{fullName}</h2>
              <p className="text-xs text-[var(--text-secondary)]">{RECALL_TYPE_LABELS[recall.recallType]} · Book appointment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-secondary)] transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {branches.length > 1 && (
            <div>
              <FieldLabel>Branch</FieldLabel>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input w-full text-sm">
                <option value="">— Any branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <FieldLabel required>Date & time</FieldLabel>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="input w-full text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Doctor</FieldLabel>
              <select value={dentistId} onChange={e => setDentistId(e.target.value)} className="input w-full text-sm">
                <option value="">— Any doctor —</option>
                {doctors.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Duration (min)</FieldLabel>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={15} max={180} step={15} className="input w-full text-sm" />
            </div>
          </div>

          <div>
            <FieldLabel>Notes</FieldLabel>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input w-full text-sm resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!scheduledAt || mut.isPending}
            className="btn-primary px-4 min-w-[130px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Book & Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recall Card ───────────────────────────────────────────────────────────────
function RecallCard({ recall, accentColor, onBook }: { recall: Recall; accentColor: string; onBook: (r: Recall) => void }) {
  const qc = useQueryClient();
  const patient  = recall.patient;
  const fullName = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim();
  const dueDateFmt = format(new Date(recall.dueDate), 'dd MMM yyyy');
  const hasAppointment = !!recall.appointmentId;
  const av = avatarColor(recall.patientId || recall.id);

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
    <div className="group relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-4 flex flex-col gap-3 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--accent)]/30 transition-all duration-200">
      {/* Accent rail */}
      <span className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${accentColor}`} />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${av.bg} ${av.text}`}>
            {initials(patient?.firstName, patient?.lastName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate leading-tight">{fullName}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{RECALL_TYPE_LABELS[recall.recallType]}</p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap bg-[var(--bg-muted)] px-2 py-1 rounded-md shrink-0">
          {dueDateFmt}
        </span>
      </div>

      {recall.reason && <p className="text-sm text-[var(--text-primary)] line-clamp-2 pl-2">{recall.reason}</p>}

      {patient?.phone && (
        <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline w-fit pl-2">
          <Phone size={13} />{patient.phone}
        </a>
      )}

      {recall.notes && <p className="text-xs text-[var(--text-secondary)] italic line-clamp-2 pl-2">{recall.notes}</p>}

      {/* Appointment linked — show outcome buttons */}
      {hasAppointment && recall.appointment && (
        <div className="ml-2 rounded-xl p-3 space-y-2 bg-[var(--bg-elevated)] border border-[var(--border)]">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
            <CalendarCheck size={11} /> Appointment linked
          </p>
          <p className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
            {formatNepalDateTime(recall.appointment.scheduledAt)}
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {recall.appointment.status.replace(/_/g, ' ')}
            </span>
          </p>
          {recall.appointment.status !== 'completed' && recall.appointment.status !== 'cancelled' && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => outcomeMut.mutate('completed')} disabled={outcomeMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                <Check size={10} /> Complete
              </button>
              <button onClick={() => outcomeMut.mutate('no_show')} disabled={outcomeMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors">
                <Clock size={10} /> No-show
              </button>
              <button onClick={() => outcomeMut.mutate('cancelled')} disabled={outcomeMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full bg-rose-500/12 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors">
                <XCircle size={10} /> Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pl-2">
        {!hasAppointment && (
          <button onClick={() => onBook(recall)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 shadow-sm transition-opacity">
            <Calendar size={12} /> Book
          </button>
        )}

        {recall.status !== 'contacted' && recall.status !== 'booked' && (
          <button onClick={() => markContactedMut.mutate()} disabled={markContactedMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors">
            {markContactedMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />} Contacted
          </button>
        )}

        {recall.status === 'contacted' && !hasAppointment && (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={11} /> Contacted
          </span>
        )}

        {recall.status === 'booked' && (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-500/12 text-blue-600 dark:text-blue-400">
            <CalendarCheck size={11} /> Booked
          </span>
        )}

        <button onClick={() => sendNowMut.mutate()} disabled={sendNowMut.isPending} title="Send reminder now"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors ml-auto">
          {sendNowMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
        </button>

        <button onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending} title="Cancel recall"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-colors">
          <Ban size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function RecallColumn({ title, recalls, dotClass, accentColor, emptyText, emptyIcon: EmptyIcon, onBook }: {
  title: string; recalls: Recall[]; dotClass: string; accentColor: string; emptyText: string; emptyIcon: any; onBook: (r: Recall) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 px-0.5">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{title}</h3>
        <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-muted)] px-1.5 py-0.5 rounded-full ml-auto">
          {recalls.length}
        </span>
      </div>
      {recalls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 flex flex-col items-center gap-2 text-center text-[var(--text-secondary)] text-sm bg-[var(--bg-elevated)]/40">
          <EmptyIcon size={20} className="text-[var(--text-muted)]" />
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recalls.map(r => (
            <RecallCard key={r.id} recall={r} accentColor={accentColor} onBook={onBook} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: 'neutral' | 'danger' | 'success' }) {
  const toneMap = {
    neutral: { icon: 'bg-[var(--accent)]/12 text-[var(--accent)]', value: 'text-[var(--text-primary)]' },
    danger:  { icon: 'bg-rose-500/12 text-rose-600 dark:text-rose-400', value: 'text-rose-600 dark:text-rose-400' },
    success: { icon: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400', value: 'text-emerald-600 dark:text-emerald-400' },
  } as const;
  const t = toneMap[tone];
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 md:p-5 flex items-center gap-3 md:gap-4 shadow-sm">
      <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)] truncate">{label}</p>
        <p className={`text-xl md:text-2xl font-bold leading-tight ${t.value}`}>{value ?? '—'}</p>
      </div>
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

      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        <div className="mb-4 md:mb-6">
          <OutboxStatusBadge actionTypes={['recall.send']} />
        </div>

        {activeBranch && !activeBranch.isActive && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <GitBranch size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Branch is inactive</p>
              <p className="text-xs opacity-80">Recall management is disabled while this branch is inactive.</p>
            </div>
          </div>
        )}

        {activeBranch?.isActive && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              <StatCard label="Total Pending" value={(stats as any)?.totalPending} icon={Users} tone="neutral" />
              <StatCard label="Overdue" value={(stats as any)?.overdueCount} icon={AlertCircle} tone="danger" />
              <StatCard label="Booked This Month" value={(stats as any)?.bookedThisMonth} icon={TrendingUp} tone="success" />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-[var(--text-secondary)]">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  Loading recalls…
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                <RecallColumn
                  title="Overdue"
                  recalls={overdue}
                  dotClass="bg-rose-500"
                  accentColor="bg-rose-500"
                  emptyText="No overdue recalls 🎉"
                  emptyIcon={CheckCircle}
                  onBook={setBookingRecall}
                />
                <RecallColumn
                  title="Due This Week"
                  recalls={thisWeek}
                  dotClass="bg-amber-500"
                  accentColor="bg-amber-500"
                  emptyText="Nothing due this week"
                  emptyIcon={Calendar}
                  onBook={setBookingRecall}
                />
                <RecallColumn
                  title="Upcoming"
                  recalls={upcoming}
                  dotClass="bg-[var(--accent)]"
                  accentColor="bg-[var(--accent)]"
                  emptyText="No upcoming recalls"
                  emptyIcon={Clock}
                  onBook={setBookingRecall}
                />
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