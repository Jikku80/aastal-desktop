'use client';
import { useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { formatNepalDateTime } from '@/lib/timezone';
import {
  Building2, User, Stethoscope, Phone, Mail, Calendar, ArrowUpRight,
  Hourglass, Scale, Ruler, Droplets, Activity, Thermometer, Heart, Wind,
  TrendingUp, Banknote, ClipboardCheck, Shield,
  ChevronsLeft, ChevronsRight, X, PanelRightOpen, FlaskConical,
} from 'lucide-react';
import { appointmentsApi, vitalsApi, commissionsApi, labApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useContextPanelStore } from '@/store/contextpanel.store';
import { useUILayoutStore } from '@/store/UILayout.store';
import type { Appointment } from '@/types';

const APPOINTMENTS_PAGE_SIZE = 10;

const STATUS_DOT: Record<string, string> = {
  scheduled:   'bg-blue-400',
  confirmed:   'bg-brand-400',
  checked_in:  'bg-amber-400',
  in_progress: 'bg-amber-400',
  completed:   'bg-emerald-400',
  cancelled:   'bg-red-400',
  no_show:     'bg-gray-400',
};

const LAB_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Pending',          color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  sent:             { label: 'Sent',              color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  in_progress:      { label: 'In Progress',      color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  completed:        { label: 'Completed',        color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  cancelled:        { label: 'Cancelled',        color: 'text-red-400',     bg: 'bg-red-500/10'     },
};

function initials(a?: string, b?: string) {
  return `${a?.[0] ?? ''}${b?.[0] ?? ''}`.toUpperCase() || '?';
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className={color ?? 'text-[var(--text-muted)]'} />
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] truncate">{sub}</p>}
    </div>
  );
}

/* ── Section 1 — Profile (clinic / patient / staff) ─────────────────────── */
function ProfileSection() {
  const pathname = usePathname();
  const { clinic, activeBranch } = useAuthStore();
  const { selectedPatient, selectedStaff } = useContextPanelStore();

  const onPatients = pathname?.startsWith('/dashboard/patients');
  const onStaff    = pathname?.startsWith('/dashboard/staff');

  if (onPatients && selectedPatient) {
    const p = selectedPatient;
    const age = p.ageYears ?? p.age;
    return (
      <SectionCard title="Patient">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-brand-600/15 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
            {initials(p.firstName, p.lastName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.firstName} {p.lastName}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{p.gender || '—'}{p.opdNo ? ` · OPD ${p.opdNo}` : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Hourglass} label="Age" value={age != null ? `${age} years` : '—'} />
          <StatTile icon={Scale}     label="Weight" value="—" />
          <StatTile icon={Ruler}     label="Height" value="—" />
          <StatTile icon={Droplets}  label="Blood"  value={p.bloodGroup || '—'} />
        </div>
        {(p.phone || p.email) && (
          <div className="mt-3 space-y-1">
            {p.phone && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Phone size={11} />{p.phone}</p>}
            {p.email && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate"><Mail size={11} />{p.email}</p>}
          </div>
        )}
      </SectionCard>
    );
  }

  if (onStaff && selectedStaff) {
    const s = selectedStaff;
    return (
      <SectionCard title="Staff">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-brand-600/15 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
            {initials(s.firstName, s.lastName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {/doctor|dentist/i.test(s.role) ? 'Dr. ' : ''}{s.firstName} {s.lastName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate capitalize">{s.role.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="space-y-1">
          {s.phone && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Phone size={11} />{s.phone}</p>}
          {s.email && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate"><Mail size={11} />{s.email}</p>}
          {s.nmcNo && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Shield size={11} />NMC {s.nmcNo}</p>}
        </div>
      </SectionCard>
    );
  }

  // Default — clinic profile
  return (
    <SectionCard title="Clinic">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 overflow-hidden">
          {clinic?.logo
            ? <img src={clinic.logo} alt="" className="w-full h-full object-cover" />
            : <Building2 size={18} className="text-white" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{clinic?.name || '…'}</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{activeBranch?.name || clinic?.city || 'All branches'}</p>
        </div>
      </div>
      {(clinic?.phone || clinic?.email) && (
        <div className="mt-3 space-y-1">
          {clinic?.phone && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Phone size={11} />{clinic.phone}</p>}
          {clinic?.email && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate"><Mail size={11} />{clinic.email}</p>}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Section 2 — Appointments (paginated, latest first, infinite scroll) ── */
function AppointmentsSection() {
  const pathname = usePathname();
  const { activeBranch } = useAuthStore();
  const { selectedPatient, selectedStaff } = useContextPanelStore();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const onPatients = pathname?.startsWith('/dashboard/patients');
  const onStaff    = pathname?.startsWith('/dashboard/staff');

  const filters = useMemo(() => {
    if (onPatients && selectedPatient) return { patientId: selectedPatient.id };
    if (onStaff && selectedStaff)      return { dentistId: selectedStaff.id };
    return { branchId: activeBranch?.id };
  }, [onPatients, onStaff, selectedPatient, selectedStaff, activeBranch?.id]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['context-sidebar-appointments', filters],
    queryFn: ({ pageParam = 1 }) =>
      appointmentsApi
        .list({ ...filters, page: pageParam, limit: APPOINTMENTS_PAGE_SIZE, sortBy: 'scheduledAt', order: 'DESC' })
        .then(r => r.data),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + (p?.data?.length ?? 0), 0);
      return loaded < (lastPage?.total ?? 0) ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const appointments: Appointment[] = data?.pages.flatMap(p => p?.data ?? []) ?? [];

  return (
    <SectionCard title="Appointments" action={<ArrowUpRight size={13} className="text-[var(--text-muted)]" />}>
      <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1.5">
        {isLoading && (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />)
        )}
        {!isLoading && appointments.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">No appointments yet</p>
        )}
        {appointments.map(a => (
          <div key={a.id} className="rounded-xl px-3 py-2 flex items-center gap-2.5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-gray-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {a.scheduledAt ? formatNepalDateTime(a.scheduledAt) : '—'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {onPatients
                  ? (a.dentist ? `Dr. ${a.dentist.firstName} ${a.dentist.lastName}` : a.type)
                  : (a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : a.type)}
              </p>
            </div>
          </div>
        ))}
        {isFetchingNextPage && <div className="h-10 rounded-xl bg-white/5 animate-pulse" />}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </SectionCard>
  );
}

/* ── Section 3 — Vitals (patient) / Commissions (staff) / placeholder ───── */
function VitalsOrCommissionsSection() {
  const pathname = usePathname();
  const { selectedPatient, selectedStaff } = useContextPanelStore();

  const onPatients = pathname?.startsWith('/dashboard/patients');
  const onStaff    = pathname?.startsWith('/dashboard/staff');

  const showVitals      = !!(onPatients && selectedPatient);
  const showCommissions = !!(onStaff && selectedStaff);

  // All hooks run on every render, unconditionally — only the `enabled` flag changes.
  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ['context-sidebar-vitals', selectedPatient?.id],
    queryFn: () => vitalsApi.getPatientHistory(selectedPatient!.id).then(r => r.data),
    enabled: showVitals,
  });

  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ['context-sidebar-commissions', selectedStaff?.id],
    queryFn: () => commissionsApi.getSummary({ doctorId: selectedStaff!.id }).then(r => r.data),
    enabled: showCommissions,
  });

  const { data: attendedData } = useQuery({
    queryKey: ['context-sidebar-attended', selectedStaff?.id],
    queryFn: () => appointmentsApi.list({ dentistId: selectedStaff!.id, status: 'completed', limit: 1 }).then(r => r.data),
    enabled: showCommissions,
  });

  if (showVitals) {
    const history: any[] = Array.isArray(vitalsData) ? vitalsData : (vitalsData?.data ?? []);
    const latest = history[0];

    return (
      <SectionCard title="Vitals" action={<FlaskConical size={13} className="text-[var(--text-muted)]" />}>
        {vitalsLoading && <div className="grid grid-cols-2 gap-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>}
        {!vitalsLoading && !latest && <p className="text-xs text-[var(--text-muted)] text-center py-6">No vitals recorded yet</p>}
        {latest && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatTile icon={Heart}        label="BP"      value={latest.systolic && latest.diastolic ? `${latest.systolic}/${latest.diastolic}` : '—'} color="text-red-400" />
              <StatTile icon={Activity}     label="Pulse"   value={latest.pulse ? `${latest.pulse} bpm` : '—'} color="text-brand-400" />
              <StatTile icon={Thermometer}  label="Temp"    value={latest.temperature ? `${latest.temperature}°F` : '—'} color="text-amber-400" />
              <StatTile icon={Wind}         label="SpO2"    value={latest.spo2 ? `${latest.spo2}%` : '—'} color="text-emerald-400" />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2.5 flex items-center gap-1">
              <Calendar size={10} />
              {latest.recordedAt ? format(new Date(latest.recordedAt), 'MMM d, yyyy') : '—'}
            </p>
          </>
        )}
      </SectionCard>
    );
  }

  if (showCommissions) {
    const doc = commissionsData?.doctors?.find((d: any) => d.doctorId === selectedStaff!.id) ?? commissionsData?.doctors?.[0];
    const attended = attendedData?.total ?? 0;

    return (
      <SectionCard title="Commissions" action={<TrendingUp size={13} className="text-[var(--text-muted)]" />}>
        {commissionsLoading && <div className="grid grid-cols-2 gap-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>}
        {!commissionsLoading && (
          <div className="grid grid-cols-2 gap-2">
            <StatTile icon={Banknote}        label="Commission" value={`NPR ${(doc?.totalCommission ?? 0).toLocaleString()}`} color="text-emerald-400" />
            <StatTile icon={TrendingUp}      label="Revenue"     value={`NPR ${(doc?.totalServiceRevenue ?? 0).toLocaleString()}`} color="text-amber-400" />
            <StatTile icon={ClipboardCheck}  label="Attended"    value={attended} sub="appointments" color="text-brand-400" />
            <StatTile icon={Stethoscope}     label="Services"    value={doc?.byService?.length ?? 0} />
          </div>
        )}
      </SectionCard>
    );
  }

}


/* ── Section 4 — Lab Work ─────────────────────────────────────────────────── */
const LAB_WORK_PAGE_SIZE = 8;

function LabWorkSection() {
  const pathname = usePathname();
  const { activeBranch } = useAuthStore();
  const { selectedPatient, selectedStaff } = useContextPanelStore();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const onPatients = pathname?.startsWith('/dashboard/patients');
  const onStaff    = pathname?.startsWith('/dashboard/staff');

  const filters = useMemo(() => {
    if (onPatients && selectedPatient) return { patientId: selectedPatient.id };
    if (onStaff && selectedStaff)      return { orderedById: selectedStaff.id };
    return { branchId: activeBranch?.id };
  }, [onPatients, onStaff, selectedPatient, selectedStaff, activeBranch?.id]);

  const {
    data, isLoading,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['context-sidebar-lab-work', filters],
    queryFn: ({ pageParam = 1 }) =>
      labApi.list({ ...filters, page: pageParam, limit: LAB_WORK_PAGE_SIZE }).then(r => r.data),
    getNextPageParam: (lastPage: any, pages: any[]) => {
      const loaded = pages.reduce((n: number, p: any) => n + (p?.data?.length ?? 0), 0);
      return loaded < (lastPage?.total ?? 0) ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const labs: any[] = data?.pages.flatMap((p: any) => p?.data ?? []) ?? [];

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <SectionCard title="Lab Work" action={<FlaskConical size={13} className="text-blue-400" />}>
        <div className="space-y-1.5">
          {Array(3).fill(0).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Lab Work" action={<FlaskConical size={13} className="text-blue-400" />}>
      <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1.5">
        {labs.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">No lab orders found</p>
        )}
        {labs.map(lab => {
          const sm = LAB_STATUS_META[lab.status] ?? LAB_STATUS_META.pending;
          return (
            <div key={lab.id} className="rounded-xl px-3 py-2.5 space-y-1"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">{lab.testName}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${sm.color} ${sm.bg}`}>
                  {sm.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {lab.patient ? `${lab.patient.firstName} ${lab.patient.lastName}` : '—'}
                  {lab.labName ? ` · ${lab.labName}` : ''}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] shrink-0">
                  {lab.createdAt ? format(new Date(lab.createdAt), 'MMM d') : ''}
                </p>
              </div>
            </div>
          );
        })}
        {isFetchingNextPage && <div className="h-10 rounded-xl bg-white/5 animate-pulse" />}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </SectionCard>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────────── */
const SIDEBAR_WIDTH = 308;
const RAIL_WIDTH = 56;

export default function ContextSidebar() {
  const {
    contextSidebarCollapsed, toggleContextSidebar,
    contextSidebarClosed, setContextSidebarClosed,
    navHidden,
  } = useUILayoutStore();

  // "Closed" hides the sidebar entirely (incl. the rail); "collapsed" shrinks it to an icon rail.
  if (contextSidebarClosed) {
    return (
      <button
        onClick={() => setContextSidebarClosed(false)}
        title="Show patient panel"
        className={`hidden xl:flex items-center justify-center fixed left-3 z-[60] w-9 h-9 rounded-xl shadow-lg mt-1 transition-transform hover:scale-105 transition-[top] duration-300 ${navHidden ? "top-3" : "top-[76px]"}`}
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <PanelRightOpen size={15} className="text-[var(--text-muted)]" />
      </button>
    );
  }

  if (contextSidebarCollapsed) {
    return (
      <aside className={`hidden xl:flex flex-col items-center fixed left-3 z-[60] py-4 gap-2 rounded-2xl transition-[top] duration-300 ${navHidden ? "top-3" : "top-[76px]"}`}
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', width: RAIL_WIDTH, height: 'calc(100vh - 88px)' }}>
        <button onClick={toggleContextSidebar} title="Expand panel"
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors hover:bg-white/5"
          style={{ border: '1px solid var(--border)' }}>
          <ChevronsRight size={14} className="text-[var(--text-muted)]" />
        </button>
        {[Building2, Calendar, FlaskConical].map((Icon, i) => (
          <button key={i} onClick={toggleContextSidebar} title="Expand panel"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
            <Icon size={14} className="text-[var(--text-muted)]" />
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setContextSidebarClosed(true)} title="Close panel"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-400/10 hover:text-red-400"
          style={{ border: '1px solid var(--border)' }}>
          <X size={14} className="text-[var(--text-muted)]" />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`hidden xl:flex flex-col fixed left-3 z-[60] overflow-y-auto px-3 py-4 space-y-3 rounded-2xl transition-[top] duration-300 ${navHidden ? "top-3" : "top-[76px]"}`}
      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', width: SIDEBAR_WIDTH, height: 'calc(100vh - 88px)' }}>
      <div className="flex items-center justify-between px-1 pb-1 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Overview</p>
        <div className="flex items-center gap-1">
          <button onClick={toggleContextSidebar} title="Collapse panel"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
            <ChevronsLeft size={13} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => setContextSidebarClosed(true)} title="Close panel"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-400/10 hover:text-red-400">
            <X size={13} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <ProfileSection />
        <AppointmentsSection />
        <VitalsOrCommissionsSection />
        <LabWorkSection />
      </motion.div>
    </aside>
  );
}