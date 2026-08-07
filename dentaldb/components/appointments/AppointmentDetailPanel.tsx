'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, User, Stethoscope, FileText, DollarSign,
  CheckCircle, XCircle, RotateCcw, AlertCircle, Trash2, Loader2, Printer, Activity,
  FlaskConical, Phone, Mail, MapPin, Cake, Droplet, ChevronRight, Users, ClipboardList,
  CalendarClock,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatNepalDate, formatNepalClockTime, formatNepalTime, formatNepalDateTime } from '@/lib/timezone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { appointmentsApi, clinicalRecordsApi, recallsApi, labApi, patientsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import { useSelectedPatientStore } from '@/store/SelectedPatient.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { toBSFull, formatDate } from '@/lib/calendar';
import { RegistrationDateField, toDatetimeLocalString, parseDatetimeLocal } from '@/components/ui/RegistrationDateFIeld';
import type { Appointment } from '@/types';
import PrescriptionPrintButton from '@/components/prescriptions/PrescriptionPrintButton';
import InvoiceModal from '@/components/billing/InvoiceModal';
import VitalsForm from './VitalsForms';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  scheduled:   { label: 'Scheduled',   color: 'text-blue-400 bg-blue-400/10',       icon: Clock       },
  confirmed:   { label: 'Confirmed',   color: 'text-brand-400 bg-brand-400/10',     icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'text-amber-400 bg-amber-400/10',     icon: RotateCcw   },
  completed:   { label: 'Completed',   color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle },
  cancelled:   { label: 'Cancelled',   color: 'text-red-400 bg-red-400/10',         icon: XCircle     },
  no_show:     { label: 'No Show',     color: 'text-gray-400 bg-gray-400/10',       icon: AlertCircle },
};

const TABS = ['Details', 'Vitals', 'Labs', 'Files'] as const;
type Tab = typeof TABS[number];

export default function AppointmentDetailPanel({
  apt, onClose, onUpdate,
}: { apt: Appointment; onClose: () => void; onUpdate: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [showRecallPrompt, setShowRecallPrompt] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [recallMode, setRecallMode] = useState<'relative' | 'date'>('relative');
  const [recallAmount, setRecallAmount] = useState<number | ''>(6);
  const [recallUnit, setRecallUnit] = useState<'days' | 'weeks' | 'months'>('months');
  // Exact-date mode value, in the same "YYYY-MM-DDTHH:mm" shape RegistrationDateField
  // works with — it renders BS year/month/day pickers instead of a plain input
  // when the clinic's calendar setting (Settings → Clinic Profile) is BS.
  const [recallDateValue, setRecallDateValue] = useState(() => toDatetimeLocalString(addMonths(new Date(), 6)));
  const calendarType = useCalendarType();
  const [showLabOrder, setShowLabOrder] = useState(false);
  const [labTestName,  setLabTestName]  = useState('');
  const [labLabName,   setLabLabName]   = useState('');
  const [labPriority,  setLabPriority]  = useState('routine');
  const [labNotes,     setLabNotes]     = useState('');
  const { user } = useAuthStore();
  const { can } = usePermissions();
  const qc = useQueryClient();
  const canDelete = can('appointment.delete');
  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(apt.status);
  const patient = apt.patient;
  const setGlobalPatient = useSelectedPatientStore(s => s.setPatient);

  useEffect(() => {
    if (patient) setGlobalPatient(patient);
  }, [patient, setGlobalPatient]);

  const labOrderMutation = useMutation({
    mutationFn: () => labApi.create({
      patientId:     apt.patientId,
      orderedById:   user?.id,
      appointmentId: apt.id,
      testName:      labTestName,
      labName:       labLabName || undefined,
      priority:      labPriority,
      clinicalNotes: labNotes || undefined,
    }),
    onSuccess: () => {
      toast.success('Lab order created');
      qc.invalidateQueries({ queryKey: ['lab-work'] });
      qc.invalidateQueries({ queryKey: ['patient-lab-work', apt.patientId] });
      setShowLabOrder(false);
      setLabTestName(''); setLabLabName(''); setLabPriority('routine'); setLabNotes('');
    },
    onError: () => toast.error('Failed to create lab order'),
  });

  /* Fetch the clinical record that belongs specifically to this appointment */
  const { data: linkedRecord } = useQuery({
    queryKey: ['clinical-record-by-appt', apt.id],
    queryFn: () =>
      clinicalRecordsApi
        .list({ appointmentId: apt.id, limit: 1 })
        .then(r => {
          const record = r.data?.data?.[0] ?? null;
          if (record && record.appointmentId !== apt.id) return null;
          return record;
        }),
    enabled: !!apt.id,
  });

  /* Patient lab history */
  const { data: patientLabs, isLoading: labsLoading } = useQuery({
    queryKey: ['patient-lab-work', apt.patientId],
    queryFn: () => labApi.byPatient(apt.patientId).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!apt.patientId && activeTab === 'Labs',
  });

  /* All clinical records for this patient — used for "Files" attachments */
  const { data: patientRecords, isLoading: filesLoading } = useQuery({
    queryKey: ['patient-clinical-records', apt.patientId],
    queryFn: () => clinicalRecordsApi.list({ patientId: apt.patientId }).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!apt.patientId && activeTab === 'Files',
  });

  /* Similar / other patients — same blood group or gender, shown as quick-access list */
  const { data: similarPatients } = useQuery({
    queryKey: ['similar-patients', patient?.bloodGroup, patient?.gender, apt.patientId],
    queryFn: () => patientsApi.list({ limit: 6 }).then(r =>
      (r.data?.data ?? r.data ?? []).filter((p: any) => p.id !== apt.patientId),
    ),
    enabled: !!apt.patientId,
  });

  const statusConf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusConf.icon;

  const completeMutation = useMutation({
    mutationFn: () => appointmentsApi.complete(apt.id, { status: 'completed' }),
    // Marking complete auto-opens the billing modal, pre-linked to this
    // appointment/patient (and its service, if the invoice modal finds a
    // matching completed+unpaid appointment). The recall prompt follows
    // once billing is closed/finished — same sequence as the queue's
    // "Mark Done" flow.
    onSuccess: () => { toast.success('Marked as completed'); onUpdate(); setShowBilling(true); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const cancelMutation = useMutation({
    mutationFn: () => appointmentsApi.cancel(apt.id),
    onSuccess: () => { toast.success('Appointment cancelled'); onUpdate(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const noShowMutation = useMutation({
    mutationFn: () => appointmentsApi.update(apt.id, { status: 'no_show' }),
    onSuccess: () => { toast.success('Marked as no-show'); onUpdate(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => appointmentsApi.delete(apt.id),
    onSuccess: () => {
      toast.success('Appointment deleted');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      onClose(); onUpdate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const age = patient?.ageYears ?? (patient?.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : undefined);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="drawer-overlay bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Fullscreen modal */}
      <motion.div
        className="fixed z-[200] inset-x-2 sm:inset-x-4 lg:inset-x-8 bottom-2 sm:bottom-4 lg:bottom-8 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', top: 'var(--header-offset)' }}
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 ${statusConf.color}`}>
              <StatusIcon size={12} /> {statusConf.label}
            </span>
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {formatNepalTime(apt.scheduledAt, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {formatNepalClockTime(apt.scheduledAt)}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate capitalize">{apt.type?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {linkedRecord?.prescriptions?.length > 0 && (
              <PrescriptionPrintButton
                recordId={linkedRecord.id}
                patientName={patient ? `${patient.firstName} ${patient.lastName}` : undefined}
                iconOnly
                className="text-brand-400"
              />
            )}
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="btn-ghost w-9 h-9 p-0 justify-center text-red-400 hover:bg-red-400/10 rounded-full">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center rounded-full">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mx-4 sm:mx-6 mt-3 p-4 rounded-2xl shrink-0"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm font-medium text-red-400 mb-1">Delete this appointment?</p>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              <strong className="text-[var(--text-secondary)]">{patient?.firstName} {patient?.lastName}</strong>
              {' '}· {formatNepalDateTime(apt.scheduledAt)}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 justify-center text-xs py-2.5 rounded-full">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Body: left patient column + right detail tabs.
            Mobile fix: below `lg` this stacks into a single column, so the
            whole body needs to be the scroll container (overflow-y-auto).
            At `lg`+ it becomes a two-pane layout where each pane scrolls
            independently, so the body switches to overflow-hidden and the
            panes take over their own scrolling (see lg:overflow-y-auto below). */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

          {/* ── Left column: patient summary ── */}
          <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 lg:overflow-y-auto p-4 sm:p-5 space-y-4"
            style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}>

            {/* Patient card */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Patient</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-lg shrink-0">
                  {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--text-primary)] truncate">
                    {patient?.firstName} {patient?.lastName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate capitalize">
                    {patient?.gender || '—'} {patient?.opdNo ? `· OPD ${patient.opdNo}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mb-0.5"><Cake size={11} /> Age</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{age ? `${age} years` : '—'}</p>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mb-0.5"><Droplet size={11} /> Blood Group</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{patient?.bloodGroup || '—'}</p>
                </div>
                <div className="rounded-xl px-3 py-2 col-span-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mb-0.5"><Phone size={11} /> Contact</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{patient?.phone || patient?.email || '—'}</p>
                </div>
                {patient?.address && (
                  <div className="rounded-xl px-3 py-2 col-span-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mb-0.5"><MapPin size={11} /> Address</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{patient.address}</p>
                  </div>
                )}
              </div>

              {(patient?.allergies?.length || patient?.medicalConditions?.length) ? (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                  {patient?.allergies?.length ? (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Allergies</p>
                      <div className="flex flex-wrap gap-1">
                        {patient.allergies.map((a, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-red-400/10 text-red-400 font-medium">{a}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {patient?.medicalConditions?.length ? (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Conditions</p>
                      <div className="flex flex-wrap gap-1">
                        {patient.medicalConditions.map((c, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Find more patients */}
            {similarPatients && similarPatients.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users size={12} /> More Patients
                </p>
                <div className="space-y-1">
                  {similarPatients.slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-brand-600/15 flex items-center justify-center text-brand-400 font-bold text-xs shrink-0">
                        {p.firstName?.[0]}{p.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{p.firstName} {p.lastName}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate capitalize">{p.gender || '—'} {p.bloodGroup ? `· ${p.bloodGroup}` : ''}</p>
                      </div>
                      <ChevronRight size={13} className="text-[var(--text-muted)] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vitals snapshot */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity size={12} className="text-brand-400" /> Vitals
              </p>
              <VitalsForm appointmentId={apt.id} compact />
            </div>
          </div>

          {/* ── Right column: tabs + content ── */}
          <div className="flex-1 flex flex-col lg:overflow-hidden min-w-0">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-4 sm:px-6 pt-4 pb-2 shrink-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                  style={{ background: activeTab === tab ? 'var(--brand-lt, #0e9de8)' : 'var(--bg-elevated)' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 space-y-5">

              {/* ── DETAILS TAB ── */}
              {activeTab === 'Details' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: Stethoscope, label: 'Dentist',     value: apt.dentist ? `Dr. ${apt.dentist.firstName} ${apt.dentist.lastName}` : '—' },
                      { icon: Clock,       label: 'Date & Time', value: `${formatNepalTime(apt.scheduledAt, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${formatNepalClockTime(apt.scheduledAt)}` },
                      { icon: Clock,       label: 'Duration',    value: `${apt.durationMinutes} minutes` },
                      { icon: FileText,    label: 'Type',        value: apt.type?.replace('_', ' '), capitalize: true },
                      ...(apt.branch ? [{ icon: User, label: 'Branch', value: apt.branch.name }] : []),
                    ].map(({ icon: Icon, label, value, capitalize }) => (
                      <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--bg-base)' }}>
                          <Icon size={14} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                          <p className={`text-sm text-[var(--text-primary)] mt-0.5 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fee */}
                  {apt.fee && (
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <DollarSign size={14} /> Fee
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">NPR {Number(apt.fee).toLocaleString()}</p>
                        <span className={`text-[10px] font-medium ${apt.isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {apt.isPaid ? '✓ Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  )}

                  {apt.chiefComplaint && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <p className="label mb-1">Chief Complaint</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{apt.chiefComplaint}</p>
                    </div>
                  )}
                  {apt.notes && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <p className="label mb-1">Notes</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{apt.notes}</p>
                    </div>
                  )}

                  {apt.diagnosis && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <p className="label mb-2">Clinical Notes</p>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Diagnosis</p>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">{apt.diagnosis}</p>
                      {apt.treatment && <>
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Treatment</p>
                        <p className="text-sm text-[var(--text-secondary)]">{apt.treatment}</p>
                      </>}
                    </div>
                  )}

                  {/* Linked prescription summary */}
                  {linkedRecord?.prescriptions?.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div
                        className="flex items-center justify-between px-3 py-2.5"
                        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
                      >
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                          <Printer size={11} /> Prescriptions ({linkedRecord.prescriptions.length})
                        </p>
                        <PrescriptionPrintButton
                          recordId={linkedRecord.id}
                          patientName={patient ? `${patient.firstName} ${patient.lastName}` : undefined}
                          className="text-xs"
                        />
                      </div>
                      <div className="divide-y">
                        {linkedRecord.prescriptions.map((rx: any, i: number) => (
                          <div key={rx.id || i} className="px-3 py-2.5" style={{ background: 'var(--bg-base)' }}>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{rx.medicineName}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ')}
                              {rx.instructions && <span className="italic"> — {rx.instructions}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Lab Test */}
                  <div>
                    <button
                      onClick={() => setShowLabOrder(v => !v)}
                      className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <span className="flex items-center gap-2 text-[var(--text-primary)]">
                        <FlaskConical size={14} className="text-blue-400" />
                        Order Lab Test
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{showLabOrder ? 'Hide ▲' : 'New Order ▼'}</span>
                    </button>
                    <AnimatePresence>
                      {showLabOrder && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-2">
                            <input
                              value={labTestName}
                              onChange={e => setLabTestName(e.target.value)}
                              placeholder="Test name (e.g. CBC, Lipid Panel) *"
                              className="input w-full text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={labLabName}
                                onChange={e => setLabLabName(e.target.value)}
                                placeholder="Laboratory name"
                                className="input text-sm"
                              />
                              <select value={labPriority} onChange={e => setLabPriority(e.target.value)} className="input text-sm">
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                              </select>
                            </div>
                            <textarea
                              value={labNotes}
                              onChange={e => setLabNotes(e.target.value)}
                              placeholder="Clinical notes / reason for order…"
                              rows={2}
                              className="input w-full text-sm resize-none"
                            />
                            <button
                              onClick={() => labOrderMutation.mutate()}
                              disabled={!labTestName.trim() || labOrderMutation.isPending}
                              className="btn-primary w-full justify-center text-sm h-9 rounded-full"
                            >
                              {labOrderMutation.isPending
                                ? <Loader2 size={13} className="animate-spin" />
                                : <><FlaskConical size={13} /> Create Lab Order</>}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* ── VITALS TAB ── */}
              {activeTab === 'Vitals' && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <VitalsForm appointmentId={apt.id} />
                </div>
              )}

              {/* ── LABS TAB ── */}
              {activeTab === 'Labs' && (
                <div className="space-y-2">
                  {labsLoading && (
                    <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  )}
                  {!labsLoading && (!patientLabs || patientLabs.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)] gap-2">
                      <FlaskConical size={28} />
                      <p className="text-sm">No lab orders for this patient yet</p>
                    </div>
                  )}
                  {patientLabs?.map((lab: any) => (
                    <div key={lab.id} className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-base)' }}>
                        <FlaskConical size={15} className="text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{lab.testName}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0"
                            style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                            {lab.status?.replace(/_/g, ' ') || 'pending'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {lab.labName ? `${lab.labName} · ` : ''}{lab.priority?.toUpperCase() || 'ROUTINE'}
                          {lab.createdAt && ` · ${formatDate(new Date(lab.createdAt), calendarType)}`}
                        </p>
                        {lab.clinicalNotes && <p className="text-xs text-[var(--text-secondary)] mt-1.5">{lab.clinicalNotes}</p>}
                        {lab.resultSummary && (
                          <p className="text-xs text-emerald-400 mt-1.5">Result: {lab.resultSummary}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── FILES TAB ── */}
              {activeTab === 'Files' && (
                <div className="space-y-2">
                  {filesLoading && (
                    <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  )}
                  {!filesLoading && !(patientRecords?.some((r: any) => r.attachments?.length)) && (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)] gap-2">
                      <ClipboardList size={28} />
                      <p className="text-sm">No files attached to this patient's records</p>
                    </div>
                  )}
                  {patientRecords?.map((rec: any) => (
                    rec.attachments?.length > 0 && (
                      <div key={rec.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-xs text-[var(--text-muted)] mb-2">
                          {rec.createdAt && formatDate(new Date(rec.createdAt), calendarType)}
                          {rec.doctor && ` · Dr. ${rec.doctor.firstName} ${rec.doctor.lastName}`}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {rec.attachments.map((file: any, i: number) => (
                            <a key={i} href={file.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors truncate"
                              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                              <FileText size={13} className="shrink-0 text-brand-400" />
                              <span className="truncate">{file.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!isTerminal && (
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}
                  className="btn-primary flex-1 justify-center h-11 rounded-full">
                  {completeMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><CheckCircle size={14} /> Mark Complete</>}
                </button>
                <button onClick={() => noShowMutation.mutate()} disabled={noShowMutation.isPending}
                  className="btn-secondary justify-center h-11 px-5 text-sm rounded-full">
                  {noShowMutation.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : <><AlertCircle size={13} /> No Show</>}
                </button>
                <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
                  className="flex items-center gap-1.5 justify-center h-11 px-5 rounded-full text-sm font-medium text-red-400 hover:bg-red-400/5 border border-red-400/20 transition-colors">
                  {cancelMutation.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : <><XCircle size={13} /> Cancel</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Billing modal — auto-triggered right after Mark Complete ── */}
      {showBilling && (
        <InvoiceModal
          initialPatientId={apt.patientId}
          initialPatientName={patient ? `${patient.firstName} ${patient.lastName}` : undefined}
          initialAppointmentId={apt.id}
          onClose={() => { setShowBilling(false); setShowRecallPrompt(true); }}
          onSuccess={() => {
            setShowBilling(false);
            toast.success('Invoice created');
            qc.invalidateQueries({ queryKey: ['appointments'] });
            setShowRecallPrompt(true);
          }}
        />
      )}

      {/* ── Recall prompt after completing an appointment ── */}
      <AnimatePresence>
        {showRecallPrompt && (
          <motion.div
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            >
              <div className="p-6 pb-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-brand-500/15 text-brand-400">
                    <CalendarClock size={22} />
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-[var(--text-primary)] text-base leading-snug">Schedule a Follow-up Recall?</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Would you like to schedule a recall for <strong className="text-[var(--text-primary)]">{patient?.firstName} {patient?.lastName}</strong>?
                    </p>
                  </div>
                </div>

                {/* Relative ("in N days/weeks/months") vs an exact date, picked in
                    whichever calendar the clinic uses (BS or AD). */}
                <div className="flex gap-1 p-1 rounded-full bg-[var(--bg-elevated)]">
                  <button
                    type="button"
                    onClick={() => setRecallMode('relative')}
                    className={`flex-1 h-9 text-xs font-medium rounded-full transition-colors ${
                      recallMode === 'relative'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    In...
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecallMode('date')}
                    className={`flex-1 h-9 text-xs font-medium rounded-full transition-colors ${
                      recallMode === 'date'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Pick a date
                  </button>
                </div>

                {recallMode === 'relative' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Due in</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={recallAmount}
                        onChange={e => {
                          if (e.target.value === '') { setRecallAmount(''); return; }
                          const n = Math.floor(Number(e.target.value));
                          setRecallAmount(Number.isFinite(n) && n > 0 ? n : 1);
                        }}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Unit</label>
                      <select
                        value={recallUnit}
                        onChange={e => setRecallUnit(e.target.value as 'days' | 'weeks' | 'months')}
                        className="input w-full"
                      >
                        <option value="days">Day{Number(recallAmount) > 1 ? 's' : ''}</option>
                        <option value="weeks">Week{Number(recallAmount) > 1 ? 's' : ''}</option>
                        <option value="months">Month{Number(recallAmount) > 1 ? 's' : ''}</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                      Recall date{calendarType === 'BS' ? ' (BS)' : ''}
                    </label>
                    <RegistrationDateField value={recallDateValue} onChange={setRecallDateValue} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <button
                  onClick={() => { setShowRecallPrompt(false); onClose(); }}
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => {
                    let amount = Number(recallAmount) || 1;
                    let unit = recallUnit;
                    let dueLabel = `${amount} ${recallUnit} from now`;

                    if (recallMode === 'date') {
                      const chosen = parseDatetimeLocal(recallDateValue);
                      const diffDays = Math.ceil((chosen.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      if (diffDays < 1) {
                        toast.error('Pick a recall date in the future');
                        return;
                      }
                      // The recalls API takes amount+unit (not a raw date), so an exact
                      // pick is expressed as "N days from now" under the hood — the
                      // toast/label below still shows the real calendar date chosen.
                      amount = diffDays;
                      unit = 'days';
                      dueLabel = calendarType === 'BS' ? toBSFull(chosen) : format(chosen, 'MMM d, yyyy');
                    }

                    recallsApi.bulkCreate({
                      patientId: apt.patientId,
                      amount,
                      unit,
                      reason: apt.type ? `Follow-up: ${apt.type.replace(/_/g, ' ')}` : 'Follow-up',
                      recallType: 'followup',
                      // The appointment entity requires a dentist, so without these
                      // the backend silently fails to auto-book the follow-up
                      // appointment (it still saves the recall as PENDING).
                      // Defaulting to the same dentist/branch as this appointment
                      // means the follow-up actually gets booked and shows up on
                      // the calendar/appointment list right away.
                      dentistId: apt.dentistId,
                      branchId: apt.branchId,
                    }).then((res: any) => {
                      const appointmentCreated = !!res?.data?.appointment;
                      if (appointmentCreated) {
                        toast.success(`Recall scheduled and follow-up appointment booked for ${dueLabel}`);
                      } else {
                        toast.success(`Recall scheduled for ${dueLabel}, but no follow-up appointment was auto-booked — book it manually from the Recalls page.`);
                      }
                      setShowRecallPrompt(false);
                      qc.invalidateQueries({ queryKey: ['appointments'] });
                      onClose();
                    }).catch((e: any) => toast.error(e?.response?.data?.message || 'Failed to create recall'));
                  }}
                  className="btn-primary flex-1 justify-center h-10 text-sm rounded-full shadow-lg shadow-brand-500/20"
                >
                  Schedule Recall
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}