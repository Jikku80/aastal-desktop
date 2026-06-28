'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientsApi, appointmentsApi, clinicalRecordsApi, labApi } from '@/lib/api';
import { format, parseISO, differenceInDays } from 'date-fns';
import Header from '@/components/layout/Header';
import {
  Calendar, Pill, FlaskConical, Scissors, Activity, FileText,
  Search, ChevronDown, ChevronRight, Clock, CheckCircle, AlertCircle,
  TrendingUp, User, Stethoscope, Plus, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type EventType = 'appointment' | 'procedure' | 'medication' | 'lab' | 'surgery' | 'recovery' | 'note';

interface TimelineEvent {
  id:         string;
  type:       EventType;
  title:      string;
  subtitle?:  string;
  date:       string;
  status?:    string;
  doctor?:    string;
  notes?:     string;
  progress?:  number;
}

const EVENT_CONFIG: Record<EventType, { label: string; icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  appointment: { label: 'Appointment', icon: Calendar,    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  procedure:   { label: 'Procedure',   icon: Stethoscope, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  medication:  { label: 'Medication',  icon: Pill,        color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  lab:         { label: 'Lab Report',  icon: FlaskConical,color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  surgery:     { label: 'Surgery',     icon: Scissors,    color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  recovery:    { label: 'Recovery',    icon: TrendingUp,  color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  note:        { label: 'Note',        icon: FileText,    color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:   { label: 'Scheduled',   color: '#3b82f6' },
  completed:   { label: 'Completed',   color: '#22c55e' },
  cancelled:   { label: 'Cancelled',   color: '#6b7280' },
  pending:     { label: 'Pending',     color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#8b5cf6' },
  confirmed:   { label: 'Confirmed',   color: '#3b82f6' },
};

// ── Add Surgery/Recovery/Note Modal ────────────────────────────────────────
function AddEventModal({ onAdd, onClose }: {
  onAdd: (e: TimelineEvent) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<'surgery' | 'recovery' | 'note'>('surgery');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const inp = 'w-full px-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-xl w-full max-w-md p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Add Timeline Event</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1 block">Event Type</label>
            <div className="flex gap-2">
              {(['surgery', 'recovery', 'note'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors capitalize ${type === t ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1 block">Title *</label>
            <input className={inp} placeholder="e.g. Appendectomy" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1 block">Date</label>
            <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1 block">Notes</label>
            <textarea className={inp} rows={3} placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]">Cancel</button>
            <button
              disabled={!title}
              onClick={() => {
                if (!title) return;
                onAdd({ id: `manual-${Date.now()}`, type, title, notes, date: new Date(date).toISOString(), status: 'completed' });
                onClose();
              }}
              className="flex-1 py-2 text-xs bg-[var(--brand)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              Add Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Event Card ────────────────────────────────────────────────────
function TimelineEventCard({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_CONFIG[event.type];
  const Icon = cfg.icon;
  const statusCfg = event.status ? (STATUS_CONFIG[event.status] ?? null) : null;

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-[var(--border)]" />
      )}
      <div className="shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10"
        style={{ background: cfg.bg, borderColor: cfg.border }}>
        <Icon size={16} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 pb-6">
        <div
          className="border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] overflow-hidden cursor-pointer hover:border-[var(--brand)] transition-colors"
          onClick={() => setExpanded(e => !e)}>
          <div className="flex items-start justify-between px-4 py-3 gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </span>
                {statusCfg && (
                  <span className="text-xs font-medium" style={{ color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">{event.title}</h3>
              {event.subtitle && <p className="text-xs text-[var(--text-secondary)]">{event.subtitle}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <Clock size={11} /> {format(parseISO(event.date), 'MMM d, yyyy')}
              </span>
              {event.doctor && (
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  <User size={11} /> {event.doctor}
                </span>
              )}
              {expanded ? <ChevronDown size={14} className="text-[var(--text-secondary)]" /> : <ChevronRight size={14} className="text-[var(--text-secondary)]" />}
            </div>
          </div>
          {event.progress !== undefined && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${event.progress}%`, background: cfg.color }} />
                </div>
                <span className="text-[10px] text-[var(--text-secondary)]">{event.progress}%</span>
              </div>
            </div>
          )}
          {expanded && event.notes && (
            <div className="px-4 pb-3 border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter chips ───────────────────────────────────────────────────────────
function FilterChips({ active, onChange, counts }: { active: EventType[]; onChange: (t: EventType[]) => void; counts: Record<EventType, number> }) {
  const types = Object.keys(EVENT_CONFIG) as EventType[];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange(active.length === types.length ? [] : types)}
        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${active.length === types.length ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'}`}>
        All
      </button>
      {types.map(t => {
        const cfg = EVENT_CONFIG[t];
        const isActive = active.includes(t);
        return (
          <button key={t}
            onClick={() => onChange(isActive ? active.filter(a => a !== t) : [...active, t])}
            className="px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1"
            style={{
              background: isActive ? cfg.bg : 'transparent',
              borderColor: isActive ? cfg.border : 'var(--border)',
              color: isActive ? cfg.color : 'var(--text-secondary)',
            }}>
            {cfg.label} {counts[t] > 0 && <span className="font-bold">{counts[t]}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const [search, setSearch]   = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<EventType[]>(Object.keys(EVENT_CONFIG) as EventType[]);
  const [manualEvents, setManualEvents] = useState<TimelineEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', search],
    queryFn: () => patientsApi.list({ search, limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  });
  const patients = patientsData?.data ?? [];

  // Fetch appointments
  const { data: appointmentsData, isLoading: aptsLoading } = useQuery({
    queryKey: ['patient-appointments', selectedPatient?.id],
    queryFn: () => appointmentsApi.list({ patientId: selectedPatient.id, limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedPatient?.id,
  });
  const appointments: any[] = appointmentsData ?? [];

  // Fetch clinical records (procedures + medications)
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['patient-clinical-records', selectedPatient?.id],
    queryFn: () => clinicalRecordsApi.list({ patientId: selectedPatient.id, limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedPatient?.id,
  });
  const records: any[] = recordsData ?? [];

  // Fetch lab work
  const { data: labData, isLoading: labLoading } = useQuery({
    queryKey: ['patient-lab-work', selectedPatient?.id],
    queryFn: () => labApi.byPatient(selectedPatient.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedPatient?.id,
  });
  const labWorks: any[] = labData ?? [];

  const isLoading = aptsLoading || recordsLoading || labLoading;

  // Map all data → timeline events
  const timelineEvents: TimelineEvent[] = [
    // Appointments
    ...appointments.map((apt: any): TimelineEvent => ({
      id:       `apt-${apt.id}`,
      type:     'appointment',
      title:    apt.chiefComplaint || apt.type?.replace(/_/g, ' ') || 'Appointment',
      subtitle: apt.diagnosis ? `Diagnosis: ${apt.diagnosis}` : undefined,
      date:     apt.scheduledAt,
      status:   apt.status,
      doctor:   apt.dentist ? `Dr. ${apt.dentist.firstName} ${apt.dentist.lastName}` : undefined,
      notes:    [apt.notes, apt.diagnosis && `Diagnosis: ${apt.diagnosis}`, apt.treatment && `Treatment: ${apt.treatment}`].filter(Boolean).join('\n'),
      progress: apt.status === 'completed' ? 100 : apt.status === 'in_progress' ? 60 : apt.status === 'scheduled' ? 0 : undefined,
    })),
    // Clinical records — procedures
    ...records.map((rec: any): TimelineEvent => ({
      id:       `proc-${rec.id}`,
      type:     'procedure',
      title:    rec.treatmentPlan || 'Procedure / Treatment',
      subtitle: rec.diagnosisNotes ? `Diagnosis: ${rec.diagnosisNotes}` : undefined,
      date:     rec.createdAt,
      status:   'completed',
      doctor:   rec.doctor ? `Dr. ${rec.doctor.firstName} ${rec.doctor.lastName}` : undefined,
      notes:    [rec.diagnosisNotes, rec.treatmentPlan].filter(Boolean).join('\n'),
    })),
    // Medications from clinical record prescriptions
    ...records.flatMap((rec: any) =>
      (rec.prescriptions ?? []).map((rx: any, i: number): TimelineEvent => ({
        id:       `med-${rec.id}-${i}`,
        type:     'medication',
        title:    rx.medicineName || 'Medication',
        subtitle: [rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · '),
        date:     rec.createdAt,
        status:   'completed',
        notes:    rx.instructions,
      }))
    ),
    // Lab work
    ...labWorks.map((lab: any): TimelineEvent => ({
      id:       `lab-${lab.id}`,
      type:     'lab',
      title:    lab.testName || 'Lab Test',
      subtitle: lab.labName ? `Lab: ${lab.labName}` : undefined,
      date:     lab.resultsReceivedAt ?? lab.createdAt,
      status:   lab.status,
      doctor:   lab.orderedBy ? `Dr. ${lab.orderedBy.firstName} ${lab.orderedBy.lastName}` : undefined,
      notes:    lab.resultSummary ?? lab.clinicalNotes,
    })),
    // Manual events (surgery, recovery, notes)
    ...manualEvents,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = timelineEvents.filter(e => activeFilters.includes(e.type));

  const counts = Object.fromEntries(
    (Object.keys(EVENT_CONFIG) as EventType[]).map(t => [t, timelineEvents.filter(e => e.type === t).length])
  ) as Record<EventType, number>;

  const stats = {
    total:     timelineEvents.length,
    completed: timelineEvents.filter(e => e.status === 'completed').length,
    upcoming:  timelineEvents.filter(e => (e.status === 'scheduled' || e.status === 'confirmed') && new Date(e.date) >= new Date()).length,
    span:      timelineEvents.length >= 2
      ? differenceInDays(parseISO(timelineEvents[0].date), parseISO(timelineEvents[timelineEvents.length - 1].date))
      : 0,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-base)]">
      <Header title="Treatment Timeline" subtitle="Full patient medical history timeline" />
      {showAddModal && (
        <AddEventModal
          onAdd={e => setManualEvents(prev => [...prev, e])}
          onClose={() => setShowAddModal(false)}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-surface)]">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                placeholder="Search patient…"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            {patients.length > 0 && search.length >= 2 && (
              <div className="mt-1 border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
                {patients.map((p: any) => (
                  <button key={p.id} onClick={() => { setSelectedPatient(p); setSearch(''); setManualEvents([]); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-muted)] text-[var(--text-primary)]">
                    {p.firstName} {p.lastName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <>
              <div className="p-3 border-b border-[var(--border)] bg-blue-50/40 dark:bg-blue-950/10">
                <p className="text-xs font-medium text-[var(--text-primary)]">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{selectedPatient.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 border-b border-[var(--border)]">
                {[
                  { label: 'Total Events', value: stats.total,     color: 'text-[var(--text-primary)]' },
                  { label: 'Completed',    value: stats.completed, color: 'text-green-600' },
                  { label: 'Upcoming',     value: stats.upcoming,  color: 'text-blue-600' },
                  { label: 'Days Span',    value: stats.span,      color: 'text-[var(--text-secondary)]' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 bg-[var(--bg-muted)] rounded-lg">
                    <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-[var(--text-secondary)]">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {selectedPatient && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-2">Event Types</p>
                <div className="space-y-1">
                  {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([type, cfg]) => (
                    <button key={type}
                      onClick={() => setActiveFilters(f => f.includes(type) ? f.filter(x => x !== type) : [...f, type])}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: activeFilters.includes(type) ? cfg.bg : 'transparent',
                        color: activeFilters.includes(type) ? cfg.color : 'var(--text-secondary)',
                      }}>
                      <div className="flex items-center gap-1.5">
                        <cfg.icon size={12} />
                        <span className="text-xs">{cfg.label}</span>
                      </div>
                      <span className="text-xs font-bold">{counts[type]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedPatient ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <Activity size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Treatment Timeline</p>
              <p className="text-sm mt-1 opacity-60">Search for a patient to view their medical history</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Filter by event type</p>
                  <FilterChips active={activeFilters} onChange={setActiveFilters} counts={counts} />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs bg-[var(--brand)] text-white rounded-lg hover:opacity-90 shrink-0">
                  <Plus size={12} /> Add Event
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-[var(--text-secondary)]" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-secondary)]">
                    <p className="text-sm">No events match the selected filters</p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    {filtered.map((event, i) => (
                      <TimelineEventCard key={event.id} event={event} isLast={i === filtered.length - 1} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
