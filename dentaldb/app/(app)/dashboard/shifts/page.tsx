'use client';
import FeatureGate from '@/components/layout/FeatureGate';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, X, Edit, Trash2, Loader2, Sun, Coffee, Sunset, Moon,
  Clock, Users, ChevronDown, ChevronRight, Check, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { shiftsApi, usersApi } from '@/lib/api';
import { useAuthStore }        from '@/store/auth.store';
import { usePermissions }      from '@/store/permissions.store';
import Header                  from '@/components/layout/Header';
import { ActionIconButton, ActionIconGroup } from '@/components/ui/ActionIconButton';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';

const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function shiftIcon(startTime?: string) {
  if (!startTime) return Clock;
  const h = parseInt(startTime.split(':')[0] ?? '8');
  if (h < 9)  return Sun;
  if (h < 14) return Coffee;
  if (h < 18) return Sunset;
  return Moon;
}

function ShiftBadge({ shift, size = 'sm' }: { shift: any; size?: 'sm' | 'md' }) {
  if (!shift) return <span className={`${size === 'md' ? 'text-sm' : 'text-xs'} text-[var(--text-muted)]`}>Day Off</span>;
  const Icon = shiftIcon(shift.startTime);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${
      size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'
    } bg-brand-400/10 text-brand-400`}>
      <Icon size={size === 'md' ? 13 : 10} />
      {shift.name} · {shift.startTime}–{shift.endTime}
    </span>
  );
}

// ── Create / Edit Shift Modal ─────────────────────────────────────────────────
const shiftFormSchema = z.object({
  name:     z.string().min(1, 'Shift name is required').max(60, 'Name too long'),
  start:    z.string().min(1, 'Start time is required'),
  end:      z.string().min(1, 'End time is required'),
  grace:    z.coerce.number().min(0, 'Min 0').max(60, 'Max 60 minutes'),
  minHours: z.coerce.number().min(0.5, 'Min 0.5').max(12, 'Max 12 hours'),
}).refine(d => d.end > d.start, { message: 'End time must be after start time', path: ['end'] });
type ShiftFormData = z.infer<typeof shiftFormSchema>;

function ShiftFormModal({ shift, onClose }: { shift?: any; onClose: () => void }) {
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      name:     shift?.name                      ?? '',
      start:    shift?.startTime                 ?? '08:00',
      end:      shift?.endTime                   ?? '17:00',
      grace:    shift?.graceMinutes              ?? 15,
      minHours: shift?.minHoursForPresent        ?? 4,
    },
  });

  const save = useMutation({
    mutationFn: (d: ShiftFormData) => shift
      ? shiftsApi.update(shift.id, { name: d.name, startTime: d.start, endTime: d.end, graceMinutes: d.grace, minHoursForPresent: d.minHours })
      : shiftsApi.create({ name: d.name, startTime: d.start, endTime: d.end, graceMinutes: d.grace, minHoursForPresent: d.minHours }),
    onSuccess: () => {
      toast.success(shift ? 'Shift updated' : 'Shift created');
      qc.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-[var(--text-primary)] text-base">
            {shift ? 'Edit Shift' : 'Create New Shift'}
          </h3>
          <ActionIconButton icon={<X />} tooltip="Close" size="sm" onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Shift Name <span className="text-red-400">*</span></label>
            <input {...register('name')} className={`input w-full ${errors.name ? 'border-red-500/70 bg-red-500/5' : ''}`}
              placeholder="e.g. Morning, Day, Evening, Night" />
            {errors.name && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time <span className="text-red-400">*</span></label>
              <input type="time" {...register('start')} className={`input w-full ${errors.start ? 'border-red-500/70 bg-red-500/5' : ''}`} />
              {errors.start && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.start.message}</p>}
            </div>
            <div>
              <label className="label">End Time <span className="text-red-400">*</span></label>
              <input type="time" {...register('end')} className={`input w-full ${errors.end ? 'border-red-500/70 bg-red-500/5' : ''}`} />
              {errors.end && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.end.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Grace Period (min)</label>
              <input type="number" {...register('grace')} className={`input w-full ${errors.grace ? 'border-red-500/70 bg-red-500/5' : ''}`} min={0} max={60} />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Late after this many minutes past start</p>
              {errors.grace && <p className="mt-0.5 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.grace.message}</p>}
            </div>
            <div>
              <label className="label">Min Hours = Present</label>
              <input type="number" step="0.5" {...register('minHours')} className={`input w-full ${errors.minHours ? 'border-red-500/70 bg-red-500/5' : ''}`} min={0.5} max={12} />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Below this threshold = Half Day</p>
              {errors.minHours && <p className="mt-0.5 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.minHours.message}</p>}
            </div>
          </div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            type="submit"
            disabled={save.isPending}
            className="btn-primary flex-1 justify-center gap-2">
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {shift ? 'Save Changes' : 'Create Shift'}
          </button>
        </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Day row ───────────────────────────────────────────────────────────────────
function DayRow({ idx, pattern, shifts, memberId }: { idx: number; pattern: any; shifts: any[]; memberId: string }) {
  const qc = useQueryClient();
  const [isEditing,   setIsEditing]   = useState(false);
  const [editShiftId, setEditShiftId] = useState(pattern?.shiftId ?? '');

  const upsert = useMutation({
    mutationFn: () => shiftsApi.upsertPattern({ userId: memberId, dayOfWeek: idx, shiftId: editShiftId || null }),
    onSuccess: () => {
      toast.success('Schedule saved');
      qc.invalidateQueries({ queryKey: ['user-schedule', memberId] });
      setIsEditing(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const del = useMutation({
    mutationFn: () => shiftsApi.deletePattern(pattern.id),
    onSuccess: () => {
      toast.success('Cleared');
      qc.invalidateQueries({ queryKey: ['user-schedule', memberId] });
      setIsEditing(false);
    },
  });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 sm:px-4 py-3"
        style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xs font-bold w-7 sm:w-8 text-[var(--text-muted)] shrink-0">{DAYS_SHORT[idx]}</span>
          <span className="text-sm font-medium text-[var(--text-primary)] hidden sm:block">{DAYS_FULL[idx]}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {pattern?.shift
            ? <ShiftBadge shift={pattern.shift} />
            : pattern
            ? <span className="text-xs text-[var(--text-muted)] italic">Day Off</span>
            : <span className="text-xs text-[var(--text-muted)] italic">Not set</span>}
          <button
            onClick={() => { setEditShiftId(pattern?.shiftId ?? ''); setIsEditing(v => !v); }}
            className="btn-ghost text-xs py-1 px-2 sm:px-2.5 gap-1 shrink-0">
            {isEditing ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>
      {isEditing && (
        <div className="px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <select value={editShiftId} onChange={e => setEditShiftId(e.target.value)} className="input text-xs py-1.5 flex-1">
            <option value="">— Day Off —</option>
            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
          </select>
          <button onClick={() => upsert.mutate()} disabled={upsert.isPending}
            className="btn-primary text-xs py-1.5 px-3 gap-1 shrink-0">
            {upsert.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </button>
          {pattern && (
            <ActionIconButton icon={<Trash2 />} variant="danger" size="sm"
              tooltip="Clear this day" loading={del.isPending}
              onClick={() => del.mutate(undefined as any)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Member Schedule Panel ─────────────────────────────────────────────────────
function MemberSchedulePanel({ member, shifts, onClose }: { member: any; shifts: any[]; onClose: () => void }) {
  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['user-schedule', member.id],
    queryFn: () => shiftsApi.getUserSchedule(member.id).then(r => r.data),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Weekly Schedule</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {member.firstName} {member.lastName}
              <span className="mx-1.5 text-[var(--text-muted)]">·</span>
              <span className="capitalize">{member.role?.replace('_', ' ')}</span>
            </p>
          </div>
          <ActionIconButton icon={<X />} tooltip="Close" onClick={onClose} />
        </div>

        <div className="p-4 sm:p-5 space-y-2">
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Click <strong className="text-[var(--text-secondary)]">Edit</strong> on any day to assign a shift or mark it as a day off.
          </p>
          {isLoading
            ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
            : DAYS_FULL.map((_, idx) => {
                const entry   = (schedule as any[]).find((d: any) => d.dayOfWeek === idx);
                const pattern = entry?.pattern ?? null;
                return <DayRow key={idx} idx={idx} pattern={pattern} shifts={shifts} memberId={member.id} />;
              })
          }
        </div>
      </motion.div>
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────
function MemberScheduleRow({ member, shifts, onManage }: { member: any; shifts: any[]; onManage: () => void }) {
  const { data: schedule = [] } = useQuery({
    queryKey: ['user-schedule', member.id],
    queryFn: () => shiftsApi.getUserSchedule(member.id).then(r => r.data),
  });

  const patternCount = (schedule as any[]).filter((d: any) => d.pattern?.shiftId).length;
  const offCount     = (schedule as any[]).filter((d: any) => d.pattern && !d.pattern?.shiftId).length;
  const unsetCount   = 7 - patternCount - offCount;

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
          {member.firstName?.[0]}{member.lastName?.[0]}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {member.firstName} {member.lastName}
          </p>
          <p className="text-xs text-[var(--text-muted)] capitalize truncate">
            {member.role?.replace('_', ' ')}
          </p>
        </div>

        {/* Manage button — always visible */}
        <button onClick={onManage} className="btn-primary text-xs py-1.5 px-3 sm:px-4 gap-1 shrink-0">
          <Edit size={12} /> <span className="hidden sm:inline">Manage</span><span className="sm:hidden">Edit</span>
        </button>
      </div>

      {/* 7-day indicator dots + summary — below on mobile */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1">
          {DAYS_SHORT.map((d, i) => {
            const entry    = (schedule as any[]).find((s: any) => s.dayOfWeek === i);
            const pattern  = entry?.pattern;
            const hasShift = !!pattern?.shiftId;
            const isOff    = pattern && !pattern.shiftId;
            return (
              <div key={d} title={`${DAYS_FULL[i]}: ${hasShift ? (pattern?.shift?.name ?? 'Shift') : isOff ? 'Off' : 'Not set'}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  hasShift ? 'bg-brand-500/20 text-brand-400' :
                  isOff    ? 'bg-gray-500/20 text-gray-500' :
                             'bg-white/5 text-[var(--text-muted)]'
                }`}>
                {d[0]}
              </div>
            );
          })}
        </div>
        <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
          {patternCount}w · {offCount}off · {unsetCount}?
        </span>
      </div>
    </div>
  );
}

// ── Non-admin: My Schedule view ───────────────────────────────────────────────
function MyScheduleView({ shifts }: { shifts: any[] }) {
  const { user } = useAuthStore();
  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['user-schedule', user?.id],
    queryFn: () => shiftsApi.getMySchedule().then(r => r.data),
  });

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-2xl mx-auto w-full">
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-[var(--text-primary)]">My Weekly Schedule</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Your standing shift schedule — set by your admin</p>
        </div>
        {isLoading
          ? <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
          : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {DAYS_FULL.map((dayName, idx) => {
                const entry   = (schedule as any[]).find((d: any) => d.dayOfWeek === idx);
                const pattern = entry?.pattern;
                return (
                  <div key={idx} className="flex items-center justify-between px-4 sm:px-5 py-3.5 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs font-bold w-7 sm:w-8 text-[var(--text-muted)] shrink-0">{DAYS_SHORT[idx]}</span>
                      <span className="text-sm text-[var(--text-primary)] hidden sm:block">{dayName}</span>
                    </div>
                    {pattern?.shift
                      ? <ShiftBadge shift={pattern.shift} size="md" />
                      : pattern
                      ? <span className="text-sm text-[var(--text-muted)]">Day Off</span>
                      : <span className="text-sm text-[var(--text-muted)] italic">Not assigned</span>}
                  </div>
                );
              })}
            </div>
          )
        }
        {(schedule as any[]).every((d: any) => !d.pattern) && !isLoading && (
          <div className="px-5 py-4 text-center">
            <p className="text-xs text-[var(--text-muted)]">No schedule assigned yet. Contact your admin to set up your weekly shifts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function ShiftsPageInner() {
  const qc      = useQueryClient();
  const { can } = usePermissions();
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const isAdmin = can('shift.manage') && !branchLocked;

  const [activeTab,     setActiveTab]     = useState<'shifts' | 'members'>('shifts');
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift,  setEditingShift]  = useState<any>(null);
  const [memberPanel,   setMemberPanel]   = useState<any>(null);
  const [search,        setSearch]        = useState('');

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });
  const { data: staffData = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.listStaff({ limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: isAdmin,
    initialData: [],
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.delete(id),
    onSuccess: () => { toast.success('Shift deleted'); qc.invalidateQueries({ queryKey: ['shifts'] }); },
    onError: () => toast.error('Cannot delete — may be in use'),
  });

  const filteredStaff = ((staffData ?? []) as any[]).filter((m: any) =>
    `${m.firstName} ${m.lastName} ${m.role} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="My Schedule" />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>
        <MyScheduleView shifts={shifts as any[]} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header
        title="Shift Mgmt"
        action={activeTab === 'shifts'
          ? { label: 'New Shift', onClick: () => { setEditingShift(null); setShowShiftForm(true); } }
          : undefined}
      />

      <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full space-y-4 sm:space-y-5">

        {/* Tab bar */}
        <div className="flex p-1 rounded-xl gap-0.5 w-full sm:w-fit" style={{ background: 'var(--bg-elevated)' }}>
          {(['shifts', 'members'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === t
                  ? 'text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              style={activeTab === t ? { background: 'var(--bg-surface)' } : {}}>
              {t === 'shifts' ? '🕐 Shift Templates' : '👥 Members'}
            </button>
          ))}
        </div>

        {/* SHIFT TEMPLATES */}
        {activeTab === 'shifts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Define reusable shift templates here, then assign them to members in the{' '}
              <button onClick={() => setActiveTab('members')} className="text-brand-400 hover:underline font-medium">
                Member Schedules
              </button>{' '}tab.
            </p>

            {shiftsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : (shifts as any[]).length === 0 ? (
              <div className="card p-12 sm:p-16 text-center">
                <Clock size={32} className="mx-auto text-[var(--text-muted)] opacity-20 mb-4" />
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">No shifts created yet</p>
                <p className="text-xs text-[var(--text-muted)] mb-5">
                  Create shift templates like Morning (8am–4pm) or Evening (4pm–12am)
                </p>
                <button onClick={() => setShowShiftForm(true)} className="btn-primary mx-auto gap-2">
                  <Plus size={14} /> Create First Shift
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(shifts as any[]).map((shift: any) => {
                  const Icon = shiftIcon(shift.startTime);
                  const startParts = (shift.startTime || '08:00').split(':').map(Number);
                  const endParts   = (shift.endTime   || '17:00').split(':').map(Number);
                  const [sh, sm2] = startParts;
                  const [eh, em2] = endParts;
                  const durationH = ((eh * 60 + em2) - (sh * 60 + sm2)) / 60;

                  return (
                    <motion.div key={shift.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="card p-4 group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center shrink-0">
                            <Icon size={18} className="text-brand-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{shift.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{shift.startTime} – {shift.endTime}</p>
                          </div>
                        </div>
                        {/* Actions: always visible on mobile, hover on desktop */}
                        <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <ActionIconButton icon={<Edit />} size="sm" tooltip="Edit shift"
                            onClick={() => { setEditingShift(shift); setShowShiftForm(true); }} />
                          <ActionIconButton icon={<Trash2 />} size="sm" variant="danger" tooltip="Delete shift"
                            loading={deleteShiftMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete "${shift.name}"? Members assigned to it will have no shift.`)) {
                                deleteShiftMutation.mutate(shift.id);
                              }
                            }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                        <span>⏱ {durationH.toFixed(1)}h shift</span>
                        <span>±{shift.graceMinutes}min grace</span>
                        <span>≥{shift.minHoursForPresent}h → Present</span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Add new tile */}
                <button
                  onClick={() => { setEditingShift(null); setShowShiftForm(true); }}
                  className="card p-4 flex flex-col items-center justify-center gap-2 min-h-[110px] transition-all hover:border-brand-500/40"
                  style={{ borderStyle: 'dashed' }}>
                  <Plus size={20} className="text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">Add Shift</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* MEMBER SCHEDULES */}
        {activeTab === 'members' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, role or email…"
                className="input w-full sm:max-w-sm text-sm"
              />
              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {filteredStaff.length} member{filteredStaff.length !== 1 ? 's' : ''}
              </span>
            </div>

            {(shifts as any[]).length === 0 && (
              <div className="px-4 py-3 rounded-xl text-xs flex items-start gap-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <span className="text-amber-400 shrink-0">⚠</span>
                <span className="text-[var(--text-secondary)]">
                  No shifts exist yet. Go to the{' '}
                  <button onClick={() => setActiveTab('shifts')} className="text-brand-400 hover:underline font-medium">
                    Shift Templates
                  </button>{' '}tab to create them first.
                </span>
              </div>
            )}

            {staffLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="card p-12 text-center">
                <Users size={24} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
                <p className="text-sm text-[var(--text-muted)]">No staff found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStaff.map((member: any) => (
                  <MemberScheduleRow
                    key={member.id} member={member}
                    shifts={shifts as any[]}
                    onManage={() => setMemberPanel(member)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showShiftForm && (
          <ShiftFormModal shift={editingShift} onClose={() => { setShowShiftForm(false); setEditingShift(null); }} />
        )}
        {memberPanel && (
          <MemberSchedulePanel member={memberPanel} shifts={shifts as any[]} onClose={() => setMemberPanel(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShiftsPage() {
  return (
    <FeatureGate feature="attendance">
      <ShiftsPageInner />
    </FeatureGate>
  );
}