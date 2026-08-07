'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Phone, Mail, Calendar, AlertTriangle, Edit, Clock,
  Activity, Trash2, Loader2, Stethoscope, Pill, FileText, Bell,
  FlaskConical, Droplet,
} from 'lucide-react';
import { formatNepalDateTime } from '@/lib/timezone';
import { formatDate } from '@/lib/calendar';
import { useCalendarType } from '@/hooks/useCalendarType';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { patientsApi, recallsApi, labApi, bloodTestApi } from '@/lib/api';
import { usePermissions } from '@/store/permissions.store';
import type { Patient } from '@/types';
import PatientModal from './PatientModal';
import PatientFilesPanel from '@/components/files/PatientFilesPanel';
import { ActionIconButton, ActionIconGroup } from '@/components/ui/ActionIconButton';
import VitalsTrendCharts from '../appointments/VitalsTrendCharts';
import PatientWalletPanel from '@/components/billing/PatientWalletPanel';

const TABS = ['Overview', 'History', 'Vitals', 'Lab Work', 'Blood Test', 'Files'] as const;
type Tab = typeof TABS[number];

const HISTORY_PAGE_SIZE = 5;

function computeAge(patient: Patient): number | null {
  if ((patient as any).ageYears != null) return (patient as any).ageYears;
  if ((patient as any).age != null) return (patient as any).age;
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      return Math.floor((Date.now() - dob.getTime()) / 31557600000);
    }
  }
  return null;
}

const APT_STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-500/10 text-blue-400',
  confirmed:   'bg-brand-500/10 text-brand-400',
  completed:   'bg-emerald-500/10 text-emerald-400',
  cancelled:   'bg-red-500/10 text-red-400',
  in_progress: 'bg-amber-500/10 text-amber-400',
  no_show:     'bg-gray-500/10 text-gray-400',
};

function AppointmentHistoryItem({ item }: { item: any }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-brand-400 shrink-0" />
          <p className="text-xs font-semibold capitalize text-[var(--text-primary)]">
            {(item.type || 'appointment').replace(/_/g, ' ')}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${APT_STATUS_COLORS[item.status] || 'bg-gray-500/10 text-gray-400'}`}>
          {item.status}
        </span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        {formatNepalDateTime(item.scheduledAt || item.scheduled_at)}
      </p>
      {(item.dentist || item.doctor) && (
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Dr. {item.dentist?.firstName || item.doctor?.firstName} {item.dentist?.lastName || item.doctor?.lastName}
        </p>
      )}
      {item.chiefComplaint && <p className="text-xs text-[var(--text-secondary)] mt-1">{item.chiefComplaint}</p>}
    </div>
  );
}

function ClinicalRecordHistoryItem({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  const calendarType = useCalendarType();
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-3 hover:bg-[var(--bg-elevated)] transition-colors"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Stethoscope size={11} className="text-emerald-400 shrink-0" />
            <p className="text-xs font-semibold text-[var(--text-primary)]">Clinical Record</p>
          </div>
          <div className="flex items-center gap-2">
            {item.prescriptions?.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-medium">
                {item.prescriptions.length} Rx
              </span>
            )}
            <span className="text-[10px] text-[var(--text-muted)]">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          {formatDate(new Date(item.createdAt), calendarType)}
          {item.doctor && ` · Dr. ${item.doctor.firstName} ${item.doctor.lastName}`}
        </p>
        {item.diagnosisNotes && !expanded && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{item.diagnosisNotes}</p>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2" style={{ background: 'var(--bg-elevated)' }}>
          {item.diagnosisNotes && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Diagnosis</p>
              <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{item.diagnosisNotes}</p>
            </div>
          )}
          {item.treatmentPlan && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Treatment Plan</p>
              <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{item.treatmentPlan}</p>
            </div>
          )}
          {item.prescriptions?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                <Pill size={10} className="inline mr-1" />Prescriptions
              </p>
              <div className="space-y-1.5">
                {item.prescriptions.map((rx: any, i: number) => (
                  <div key={rx.id || i} className="px-3 py-2 rounded-lg text-xs"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                    <span className="font-semibold text-[var(--text-primary)]">{rx.medicineName}</span>
                    {rx.dosage && <span className="text-[var(--text-muted)] ml-2">{rx.dosage}</span>}
                    {rx.frequency && <span className="text-[var(--text-muted)] ml-2">· {rx.frequency}</span>}
                    {rx.duration && <span className="text-[var(--text-muted)] ml-2">× {rx.duration}</span>}
                    {rx.instructions && <p className="text-[var(--text-muted)] italic mt-0.5">{rx.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add Recall from patient context ──────────────────────────────────────────
function AddRecallFromPatient({ patient, onClose }: { patient: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [dueDate, setDueDate]       = useState('');
  const [reason, setReason]         = useState('');
  const [recallType, setRecallType] = useState('checkup');
  const [notes, setNotes]           = useState('');

  const mut = useMutation({
    mutationFn: () => recallsApi.create({ patientId: patient.id, dueDate, reason, recallType, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recalls'] }); toast.success('Recall added'); onClose(); },
    onError: () => toast.error('Failed to add recall'),
  });

  const RECALL_TYPES = [
    { value: 'checkup', label: 'Check-up' },
    { value: 'followup', label: 'Follow-up' },
    { value: 'medication_review', label: 'Medication Review' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Recall</h2>
            <p className="text-sm text-[var(--text-secondary)]">{patient.firstName} {patient.lastName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-secondary)]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Due Date *</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Type</label>
            <select value={recallType} onChange={e => setRecallType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm">
              {RECALL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. 6-month check-up"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={!dueDate || mut.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white font-medium disabled:opacity-50">
            {mut.isPending ? 'Saving…' : 'Add Recall'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PatientDetailPanel({
  patient, onClose, onUpdate,
}: { patient: Patient; onClose: () => void; onUpdate: () => void }) {
  const [tab,           setTab]           = useState<Tab>('Overview');
  const [editing,       setEditing]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyPage,   setHistoryPage]   = useState(1);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'appointments' | 'records'>('all');
  const [showAddRecall, setShowAddRecall] = useState(false);
  const { can } = usePermissions();
  const qc = useQueryClient();
  const canDelete = can('patient.delete');
  const calendarType = useCalendarType();

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['patient-history', patient.id],
    queryFn: async () => {
      const r = await patientsApi.getHistory(patient.id);
      const d = r.data;
      return Array.isArray(d) ? d : (d?.data ?? d ?? []);
    },
    enabled: tab === 'History',
    staleTime: 0,
  });

  const { data: labOrders, isLoading: labLoading } = useQuery({
    queryKey: ['patient-lab-work', patient.id],
    queryFn: () => labApi.byPatient(patient.id).then(r => r.data as any[]),
    enabled: tab === 'Lab Work' || tab === 'Blood Test',
    staleTime: 0,
  });

  const { data: bloodTests, isLoading: bloodTestLoading } = useQuery({
    queryKey: ['patient-blood-test', patient.id],
    queryFn: () => bloodTestApi.byPatient(patient.id).then(r => r.data as any[]),
    enabled: tab === 'Blood Test',
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.delete(patient.id),
    onSuccess: () => {
      toast.success('Patient deleted');
      qc.invalidateQueries({ queryKey: ['patients'] });
      onClose();
      onUpdate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete patient'),
  });

  const age = computeAge(patient);

  if (editing) return (
    <PatientModal patient={patient} onClose={() => setEditing(false)}
      onSuccess={() => { setEditing(false); onUpdate(); }} />
  );

  const filteredHistory = Array.isArray(history)
    ? (history as any[]).filter(item => {
        if (historyFilter === 'appointments') return item._type === 'appointment';
        if (historyFilter === 'records') return item._type === 'clinical_record';
        return true;
      })
    : [];

  const pagedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );

  return (
    <>
    <motion.div
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-[200] flex flex-col shadow-2xl"
      style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center font-bold text-brand-400">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-sm">{patient.firstName} {patient.lastName}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {patient.opdNo ? `OPD: ${patient.opdNo}` : ''}{patient.opdNo && (age || patient.gender) ? ' · ' : ''}{age ? `${age} yrs` : ''}{age && patient.gender ? ' · ' : ''}{patient.gender || ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowAddRecall(true)}
            className="btn-ghost w-10 h-10 p-0 justify-center rounded-xl text-amber-500 hover:bg-amber-400/10" title="Add Recall">
            <Bell size={18} />
          </button>
          <button onClick={() => setEditing(true)}
            className="btn-ghost w-10 h-10 p-0 justify-center rounded-xl" title="Edit patient">
            <Edit size={18} />
          </button>
          {canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost w-10 h-10 p-0 justify-center text-red-400 hover:bg-red-400/10 rounded-xl"
              title="Delete patient">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost w-10 h-10 p-0 justify-center rounded-xl"><X size={18} /></button>
        </div>
      </div>

      {/* Allergy alert — shown immediately on open, on every tab, so staff
          can't miss it before treating this patient. */}
      {patient.allergies?.length > 0 && (
        <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl flex items-start gap-2 shrink-0"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-400">Allergy alert</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {patient.firstName} is allergic to <span className="font-medium text-amber-400">{patient.allergies.join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mx-4 mt-3 p-4 rounded-xl shrink-0"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm font-medium text-red-400 mb-1">Delete this patient?</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            This will permanently remove <strong className="text-[var(--text-secondary)]">{patient.firstName} {patient.lastName}</strong> and all their records.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1 justify-center text-xs py-1.5">Cancel</button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 pt-2 gap-0.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium transition-all border-b-2 ${tab === t ? 'text-brand-400 border-brand-500' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {/* ── Overview ── */}
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div>
              <p className="label mb-2">Contact</p>
              <div className="space-y-2">
                {patient.phone && <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Phone size={13} className="text-[var(--text-muted)] shrink-0" />{patient.phone}</div>}
                {patient.email && <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Mail size={13} className="text-[var(--text-muted)] shrink-0" />{patient.email}</div>}
                {patient.dateOfBirth && <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Calendar size={13} className="text-[var(--text-muted)] shrink-0" />{formatDate(new Date(patient.dateOfBirth), calendarType)}{age ? ` (${age} yrs)` : ''}</div>}
                {patient.address && <p className="text-sm text-[var(--text-secondary)] pl-5">{patient.address}</p>}
              </div>
            </div>

            {/* Patient Wallet — top up funds here; billing modal can deduct from this balance */}
            <PatientWalletPanel patientId={patient.id} />
            {patient.branch && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(14,157,232,0.06)', border: '1px solid rgba(14,157,232,0.12)' }}>
                <span className="text-[var(--text-muted)]">Branch:</span>
                <span className="text-brand-400 font-medium">{patient.branch.name}</span>
              </div>
            )}
            {patient.allergies?.length > 0 && (
              <div>
                <p className="label mb-2"><AlertTriangle size={11} className="inline mr-1 text-amber-400" />Allergies</p>
                <div className="flex flex-wrap gap-1.5">{patient.allergies.map(a => <span key={a} className="badge bg-amber-500/10 text-amber-400">{a}</span>)}</div>
              </div>
            )}
            {patient.medicalConditions?.length > 0 && (
              <div>
                <p className="label mb-2"><Activity size={11} className="inline mr-1" />Medical Conditions</p>
                <div className="flex flex-wrap gap-1.5">{patient.medicalConditions.map(c => <span key={c} className="badge bg-red-500/10 text-red-400">{c}</span>)}</div>
              </div>
            )}
            {patient.insuranceProvider && (
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                <p className="label mb-1.5">Insurance</p>
                <p className="text-sm text-[var(--text-secondary)]">{patient.insuranceProvider}</p>
                {patient.insurancePolicyNumber && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">#{patient.insurancePolicyNumber}</p>}
              </div>
            )}
            {patient.emergencyContactName && (
              <div>
                <p className="label mb-1.5">Emergency Contact</p>
                <p className="text-sm text-[var(--text-secondary)]">{patient.emergencyContactName}</p>
                <p className="text-xs text-[var(--text-muted)]">{patient.emergencyContactPhone}</p>
              </div>
            )}
            {patient.notes && (
              <div>
                <p className="label mb-1.5">Notes</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{patient.notes}</p>
              </div>
            )}
            <p className="text-[10px] text-[var(--text-muted)] pt-2">
              Added {formatDate(new Date(patient.createdAt), calendarType)}
              {patient.lastVisitAt && ` · Last visit ${formatDate(new Date(patient.lastVisitAt), calendarType)}`}
            </p>
          </div>
        )}

        {/* ── History ── */}
        {tab === 'History' && (
          <div className="space-y-3">
            {/* Filter pills */}
            <div className="flex gap-1.5">
              {(['all', 'appointments', 'records'] as const).map(f => (
                <button key={f} onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium capitalize transition-all border ${
                    historyFilter === f
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'text-[var(--text-muted)] border-[var(--border)] hover:border-brand-500/40'
                  }`}>
                  {f === 'all' ? 'All' : f === 'appointments' ? '🗓 Appointments' : '📋 Records'}
                </button>
              ))}
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={24} className="mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                <p className="text-sm text-[var(--text-muted)]">No history found</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {pagedHistory.map((item: any) =>
                    item._type === 'clinical_record'
                      ? <ClinicalRecordHistoryItem key={`rec-${item.id}`} item={item} />
                      : <AppointmentHistoryItem key={`apt-${item.id}`} item={item} />
                  )}
                </div>

                {filteredHistory.length > HISTORY_PAGE_SIZE && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}
                    </p>
                    <div className="flex gap-1.5">
                      <button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}
                        className="btn-secondary text-[10px] py-1 px-2.5 disabled:opacity-30">← Prev</button>
                      <button disabled={historyPage * HISTORY_PAGE_SIZE >= filteredHistory.length} onClick={() => setHistoryPage(p => p + 1)}
                        className="btn-secondary text-[10px] py-1 px-2.5 disabled:opacity-30">Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Vitals ── */}
        {tab === 'Vitals' && (
          <div className="p-4 sm:p-5">
            <VitalsTrendCharts patientId={patient.id} />
          </div>
        )}

        {/* ── Lab Work ── */}
        {tab === 'Lab Work' && (
          <div className="p-4 sm:p-5">
            {labLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : !labOrders?.length ? (
              <div className="text-center py-12">
                <FlaskConical size={28} className="mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                <p className="text-sm text-[var(--text-muted)]">No lab orders for this patient</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labOrders.map((lab: any) => {
                  const STATUS_COLORS: Record<string, string> = {
                    pending:     'text-amber-400 bg-amber-500/10',
                    sent:        'text-blue-400 bg-blue-500/10',
                    in_progress: 'text-purple-400 bg-purple-500/10',
                    completed:   'text-emerald-400 bg-emerald-500/10',
                    cancelled:   'text-red-400 bg-red-500/10',
                  };
                  const STATUS_LABELS: Record<string, string> = {
                    pending: 'Pending', sent: 'Sent', in_progress: 'In Progress',
                    completed: 'Completed', cancelled: 'Cancelled',
                  };
                  const hasCritical = lab.results?.some((r: any) => r.flag === 'critical');
                  return (
                    <div key={lab.id} className="rounded-xl p-3"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FlaskConical size={14} className="text-blue-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                              {lab.testName}
                              {hasCritical && (
                                <AlertTriangle size={11} className="text-red-400 shrink-0" />
                              )}
                            </p>
                            {lab.labName && (
                              <p className="text-[10px] text-[var(--text-muted)]">{lab.labName}</p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lab.status] ?? ''}`}>
                          {STATUS_LABELS[lab.status] ?? lab.status}
                        </span>
                      </div>

                      {lab.results?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {lab.results.slice(0, 3).map((r: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                              <span className="text-[var(--text-muted)]">{r.parameter}</span>
                              <span className={`font-mono font-medium ${
                                r.flag === 'critical' ? 'text-red-400' :
                                r.flag === 'high' || r.flag === 'low' ? 'text-amber-400' :
                                'text-[var(--text-primary)]'
                              }`}>
                                {r.value}{r.unit ? ` ${r.unit}` : ''}
                              </span>
                            </div>
                          ))}
                          {lab.results.length > 3 && (
                            <p className="text-[10px] text-[var(--text-muted)]">+{lab.results.length - 3} more parameters</p>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-[var(--text-muted)] mt-2">
                        {formatDate(new Date(lab.createdAt), calendarType)}
                        {lab.orderedBy && ` · Dr. ${lab.orderedBy.firstName} ${lab.orderedBy.lastName}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Blood Test ── */}
        {tab === 'Blood Test' && (
          <div className="p-4 sm:p-5">
            {bloodTestLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : !bloodTests?.length ? (
              <div>
                <div className="text-center py-8">
                  <Droplet size={28} className="mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                  <p className="text-sm text-[var(--text-muted)]">No blood tests for this patient</p>
                </div>

                {/* Fallback: show patient lab works when no blood tests exist */}
                <div className="mt-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FlaskConical size={11} /> Patient Lab Works
                  </p>
                  {labLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                    </div>
                  ) : !labOrders?.length ? (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No lab works for this patient either</p>
                  ) : (
                    <div className="space-y-2">
                      {labOrders.map((lab: any) => (
                        <div key={lab.id} className="rounded-xl p-3"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FlaskConical size={13} className="text-blue-400 shrink-0" />
                              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{lab.testName}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-[var(--text-muted)] capitalize">{lab.status?.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">
                            {formatDate(new Date(lab.createdAt), calendarType)}
                            {lab.orderedBy && ` · Dr. ${lab.orderedBy.firstName} ${lab.orderedBy.lastName}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {bloodTests.map((bt: any) => {
                  const STATUS_COLORS: Record<string, string> = {
                    pending:           'text-amber-400 bg-amber-500/10',
                    sample_collected:  'text-blue-400 bg-blue-500/10',
                    in_progress:       'text-purple-400 bg-purple-500/10',
                    completed:         'text-emerald-400 bg-emerald-500/10',
                    cancelled:         'text-red-400 bg-red-500/10',
                  };
                  const STATUS_LABELS: Record<string, string> = {
                    pending: 'Pending', sample_collected: 'Sample Collected', in_progress: 'In Progress',
                    completed: 'Completed', cancelled: 'Cancelled',
                  };
                  const hasCritical = bt.results?.some((r: any) => r.flag === 'critical');
                  return (
                    <div key={bt.id} className="rounded-xl p-3"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Droplet size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                              {bt.testName}
                              {hasCritical && (
                                <AlertTriangle size={11} className="text-red-400 shrink-0" />
                              )}
                            </p>
                            {bt.labName && (
                              <p className="text-[10px] text-[var(--text-muted)]">{bt.labName}</p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[bt.status] ?? ''}`}>
                          {STATUS_LABELS[bt.status] ?? bt.status}
                        </span>
                      </div>

                      {bt.results?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {bt.results.slice(0, 3).map((r: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                              <span className="text-[var(--text-muted)]">{r.parameter}</span>
                              <span className={`font-mono font-medium ${
                                r.flag === 'critical' ? 'text-red-400' :
                                r.flag === 'high' || r.flag === 'low' ? 'text-amber-400' :
                                'text-[var(--text-primary)]'
                              }`}>
                                {r.value}{r.unit ? ` ${r.unit}` : ''}
                              </span>
                            </div>
                          ))}
                          {bt.results.length > 3 && (
                            <p className="text-[10px] text-[var(--text-muted)]">+{bt.results.length - 3} more parameters</p>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-[var(--text-muted)] mt-2">
                        {formatDate(new Date(bt.createdAt), calendarType)}
                        {bt.fasting && ' · Fasting'}
                        {bt.orderedBy && ` · Dr. ${bt.orderedBy.firstName} ${bt.orderedBy.lastName}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'Files' && <PatientFilesPanel patientId={patient.id} />}
      </div>
    </motion.div>

    {/* Add Recall Modal (rendered outside the panel to avoid overflow clipping) */}
    {showAddRecall && (
      <AddRecallFromPatient
        patient={patient}
        onClose={() => setShowAddRecall(false)}
      />
    )}
  </>
  );
}