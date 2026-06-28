'use client';
import FeatureGate from '@/components/layout/FeatureGate';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, LogIn, LogOut, CheckCircle, Loader2, Calendar,
  ChevronLeft, ChevronRight, Plus, Edit, Trash2, X, Sun, Coffee, Sunset,
} from 'lucide-react';
import { format, addDays, startOfWeek, parseISO, eachDayOfInterval, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { attendanceApi, shiftsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import { ActionIconButton } from '@/components/ui/ActionIconButton';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';

const STATUS_CFG = {
  present:  { label: 'Present',  dot: 'bg-emerald-400', ring: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  late:     { label: 'Late',     dot: 'bg-amber-400',   ring: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  half_day: { label: 'Half Day', dot: 'bg-blue-400',    ring: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  absent:   { label: 'Absent',   dot: 'bg-red-400',     ring: 'text-red-400 bg-red-400/10 border-red-400/20' },
  leave:    { label: 'Leave',    dot: 'bg-brand-400',   ring: 'text-brand-400 bg-brand-400/10 border-brand-400/20' },
  off:      { label: 'Off',      dot: 'bg-gray-500',    ring: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
} as const;

const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type ViewMode = 'checkin' | 'schedule' | 'calendar' | 'records';

function ShiftBadge({ shift }: { shift: any }) {
  if (!shift) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const h = parseInt(shift.startTime?.split(':')[0] ?? '8');
  const Icon = h < 10 ? Sun : h < 15 ? Coffee : Sunset;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-400/10 text-brand-400">
      <Icon size={11} />{shift.name} {shift.startTime}–{shift.endTime}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.off;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

function PatternModal({ userId, dayOfWeek, existing, shifts, onClose }: any) {
  const qc = useQueryClient();
  const [shiftId, setShiftId] = useState(existing?.shiftId ?? '');
  const upsert = useMutation({
    mutationFn: () => shiftsApi.upsertPattern({ userId, dayOfWeek, shiftId: shiftId || null }),
    onSuccess: () => { toast.success('Schedule updated'); qc.invalidateQueries({ queryKey: ['user-schedule', userId] }); onClose(); },
    onError: () => toast.error('Failed'),
  });
  const del = useMutation({
    mutationFn: () => shiftsApi.deletePattern(existing.id),
    onSuccess: () => { toast.success('Cleared'); qc.invalidateQueries({ queryKey: ['user-schedule', userId] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text-primary)]">{DAYS_FULL[dayOfWeek]} Schedule</h3>
          <ActionIconButton icon={<X />} size="sm" tooltip="Close" onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Shift</label>
            <select value={shiftId} onChange={e => setShiftId(e.target.value)} className="input w-full">
              <option value="">— Day Off —</option>
              {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {existing && (
              <button onClick={() => del.mutate()} disabled={del.isPending} className="btn-secondary text-xs text-red-400 hover:bg-red-400/5 gap-1">
                {del.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Clear
              </button>
            )}
            <button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="btn-primary flex-1 justify-center text-xs">
              {upsert.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AssignmentModal({ userId, date, existing, shifts, onClose }: any) {
  const qc = useQueryClient();
  const [type,    setType]    = useState(existing?.type ?? 'override');
  const [shiftId, setShiftId] = useState(existing?.shiftId ?? '');
  const [note,    setNote]    = useState(existing?.note ?? '');
  const upsert = useMutation({
    mutationFn: () => shiftsApi.upsertAssignment({ userId, date, shiftId: shiftId || null, type, note }),
    onSuccess: () => { toast.success('Override saved'); qc.invalidateQueries({ queryKey: ['user-assignments', userId] }); onClose(); },
    onError: () => toast.error('Failed'),
  });
  const del = useMutation({
    mutationFn: () => shiftsApi.deleteAssignment(existing.id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['user-assignments', userId] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-[var(--text-primary)]">Override — {format(parseISO(date), 'MMM d, yyyy')}</h3>
          <ActionIconButton icon={<X />} size="sm" tooltip="Close" onClick={onClose} />
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">Overrides weekly schedule for this date only</p>
        <div className="space-y-3">
          <div>
            <label className="label">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input w-full">
              <option value="override">Working (different shift)</option>
              <option value="leave">On Leave</option>
              <option value="off">Day Off</option>
            </select>
          </div>
          {type === 'override' && (
            <div>
              <label className="label">Shift</label>
              <select value={shiftId} onChange={e => setShiftId(e.target.value)} className="input w-full">
                <option value="">Select shift</option>
                {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Note</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="input w-full" placeholder="Optional reason…" />
          </div>
          <div className="flex gap-2">
            {existing && (
              <button onClick={() => del.mutate()} disabled={del.isPending} className="btn-secondary text-xs text-red-400 hover:bg-red-400/5 gap-1">
                {del.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
              </button>
            )}
            <button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="btn-primary flex-1 justify-center text-xs">
              {upsert.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Save Override'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AttendancePageInner() {
  const { activeBranch, user } = useAuthStore();
  const { can } = usePermissions();
  const qc      = useQueryClient();
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const isAdmin = can('attendance.manage') && !branchLocked;

  const [viewMode,       setViewMode]       = useState<ViewMode>('checkin');
  const [filterUser,     setFilterUser]     = useState('');
  const [filterDate,     setFilterDate]     = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter,   setStatusFilter]   = useState('');
  const [month,          setMonth]          = useState(new Date().getMonth() + 1);
  const [year,           setYear]           = useState(new Date().getFullYear());
  const [calWeekStart,   setCalWeekStart]   = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [patternModal,   setPatternModal]   = useState<{ dayOfWeek: number; existing: any } | null>(null);
  const [assignModal,    setAssignModal]    = useState<{ date: string; existing?: any } | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState(user?.id ?? '');

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceApi.today().then(r => r.data),
    refetchInterval: 30_000,
  });
  const attendance    = todayData?.attendance;
  const resolvedShift = todayData?.resolvedShift;
  const checkedIn  = !!attendance?.checkIn;
  const checkedOut = !!attendance?.checkOut;
  const isOff   = resolvedShift?.type === 'off';
  const isLeave = resolvedShift?.type === 'leave';

  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess: () => { toast.success('Checked in!'); qc.invalidateQueries({ queryKey: ['attendance-today'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Check-in failed'),
  });
  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(),
    onSuccess: () => { toast.success('Checked out — see you tomorrow!'); qc.invalidateQueries({ queryKey: ['attendance-today'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Check-out failed'),
  });

  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) });
  const { data: mySchedule = [] } = useQuery({
    queryKey: ['user-schedule', scheduleTarget],
    queryFn: () => shiftsApi.getUserSchedule(scheduleTarget).then(r => r.data),
    enabled: viewMode === 'schedule',
  });
  const calStart = format(calWeekStart, 'yyyy-MM-dd');
  const calEnd   = format(addDays(calWeekStart, 6), 'yyyy-MM-dd');
  const { data: assignments = [] } = useQuery({
    queryKey: ['user-assignments', scheduleTarget, calStart, calEnd],
    queryFn: () => shiftsApi.getUserAssignments(scheduleTarget, calStart, calEnd).then(r => r.data),
    enabled: viewMode === 'calendar',
  });
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['attendance-list', filterDate, filterUser, statusFilter, activeBranch?.id],
    queryFn: () => attendanceApi.list({ date: filterDate, userId: filterUser || undefined, status: statusFilter || undefined, branchId: activeBranch?.id, limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: isAdmin && viewMode === 'records',
  });
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance-monthly', year, month],
    queryFn: () => attendanceApi.monthlySummary(year, month).then(r => r.data),
    enabled: isAdmin && viewMode === 'records',
  });
  const { data: staffData = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => usersApi.listStaff({ limit: 100 }).then(r => r.data?.data ?? r.data ?? []),
    enabled: isAdmin,
    initialData: [],
  });

  const records: any[] = Array.isArray(listData) ? listData : (listData as any)?.data ?? [];
  const assignMap = new Map((assignments as any[]).map((a: any) => [a.date, a]));
  const calDays   = eachDayOfInterval({ start: calWeekStart, end: addDays(calWeekStart, 6) });
  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'checkin',  label: 'Today' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'calendar', label: 'Calendar' },
    ...(isAdmin ? [{ id: 'records' as ViewMode, label: 'Records' }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Attendance" />
      <div className="px-4 pt-2 shrink-0"><BranchReadOnlyBanner /></div>
      <div className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full space-y-4 sm:space-y-5 pb-10">

        {/* Tabs — scrollable on mobile */}
        <div className="flex p-1 rounded-xl gap-0.5 overflow-x-auto"
          style={{ background: 'var(--bg-elevated)', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setViewMode(t.id)}
              className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                viewMode === t.id
                  ? 'text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              style={viewMode === t.id ? { background: 'var(--bg-surface)' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TODAY */}
        {viewMode === 'checkin' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              {/* Date + time + shift info */}
              <div>
                <p className="text-xs text-[var(--text-muted)]">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-4xl sm:text-5xl font-bold font-mono text-[var(--text-primary)] mt-0.5">
                  {format(new Date(), 'h:mm a')}
                </p>
                <div className="mt-2">
                  {todayLoading
                    ? <div className="h-5 w-32 bg-white/5 rounded animate-pulse" />
                    : isOff    ? <StatusPill status="off" />
                    : isLeave  ? <StatusPill status="leave" />
                    : resolvedShift?.shift ? <ShiftBadge shift={resolvedShift.shift} />
                    : <span className="text-xs text-[var(--text-muted)]">No shift assigned</span>}
                </div>
                {attendance && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {attendance.checkIn && (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <LogIn size={13} /> {format(new Date(attendance.checkIn), 'h:mm a')}
                        {attendance.lateMinutes > 0 && <span className="text-amber-400">({attendance.lateMinutes}m late)</span>}
                      </span>
                    )}
                    {attendance.checkOut && (
                      <span className="flex items-center gap-1.5 text-brand-400">
                        <LogOut size={13} />{format(new Date(attendance.checkOut), 'h:mm a')}
                      </span>
                    )}
                    {attendance.hoursWorked && (
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        <Clock size={13} />{Number(attendance.hoursWorked).toFixed(1)}h
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action button — full width on mobile */}
              <div>
                {isOff || isLeave ? (
                  <div className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-medium text-[var(--text-muted)]"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    {isLeave ? '🏖️ On Leave' : '📅 Day Off'}
                  </div>
                ) : !checkedIn ? (
                  <button onClick={() => !branchLocked && checkInMutation.mutate()} disabled={checkInMutation.isPending || branchLocked}
                    className={`btn-primary w-full sm:w-auto gap-2 py-3 px-8 justify-center text-base${branchLocked ? ' opacity-50 cursor-not-allowed' : ''}`}>
                    {checkInMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    Check In
                  </button>
                ) : !checkedOut ? (
                  <button onClick={() => !branchLocked && checkOutMutation.mutate()} disabled={checkOutMutation.isPending || branchLocked}
                    className={`btn-secondary w-full sm:w-auto gap-2 py-3 px-8 justify-center text-base hover:text-red-400 hover:border-red-400/30${branchLocked ? ' opacity-50 cursor-not-allowed' : ''}`}>
                    {checkOutMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                    Check Out
                  </button>
                ) : (
                  <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-emerald-400 font-medium"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <CheckCircle size={18} /> Day complete!
                  </div>
                )}
              </div>
            </div>
            {attendance?.status && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <StatusPill status={attendance.status} />
              </div>
            )}
          </motion.div>
        )}

        {/* SCHEDULE */}
        {viewMode === 'schedule' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {isAdmin && (
              <select value={scheduleTarget} onChange={e => setScheduleTarget(e.target.value)}
                className="input text-xs py-1.5 w-full sm:w-auto">
                <option value={user?.id ?? ''}>My Schedule</option>
                {(staffData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            )}
            <div className="card overflow-hidden">
              <div className="px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="font-semibold text-[var(--text-primary)]">Weekly Shift Schedule</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Standing schedule — applies when no date override exists</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {DAYS_FULL.map((dayName, idx) => {
                  const entry   = (mySchedule as any[]).find((d: any) => d.dayOfWeek === idx);
                  const pattern = entry?.pattern;
                  return (
                    <div key={idx} className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-white/2 transition-colors gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="text-xs font-semibold w-7 sm:w-8 text-[var(--text-muted)] shrink-0">{DAYS_SHORT[idx]}</span>
                        <span className="text-sm text-[var(--text-primary)] hidden sm:block">{dayName}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        {pattern?.shift
                          ? <ShiftBadge shift={pattern.shift} />
                          : pattern
                          ? <span className="text-xs text-[var(--text-muted)]">Day Off</span>
                          : <span className="text-xs text-[var(--text-muted)] italic">Not set</span>}
                        {isAdmin && (
                          <ActionIconButton
                            icon={pattern ? <Edit /> : <Plus />}
                            size="sm" variant={pattern ? 'default' : 'primary'}
                            tooltip={pattern ? 'Edit' : 'Set shift'}
                            onClick={() => setPatternModal({ dayOfWeek: idx, existing: pattern })}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* CALENDAR */}
        {viewMode === 'calendar' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {isAdmin && (
              <select value={scheduleTarget} onChange={e => setScheduleTarget(e.target.value)}
                className="input text-xs py-1.5 w-full sm:w-auto">
                <option value={user?.id ?? ''}>My Calendar</option>
                {(staffData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            )}
            <div className="flex items-center justify-between">
              <button onClick={() => setCalWeekStart(d => subDays(d, 7))} className="btn-ghost gap-1 text-xs">
                <ChevronLeft size={14} />Prev
              </button>
              <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] text-center">
                {format(calWeekStart, 'MMM d')} – {format(addDays(calWeekStart, 6), 'MMM d, yyyy')}
              </p>
              <button onClick={() => setCalWeekStart(d => addDays(d, 7))} className="btn-ghost gap-1 text-xs">
                Next<ChevronRight size={14} />
              </button>
            </div>

            {/* Calendar grid: 2 cols on mobile, 4 on sm, 7 on lg */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {calDays.map(day => {
                const ds    = format(day, 'yyyy-MM-dd');
                const asgn  = assignMap.get(ds);
                const isToday = ds === new Date().toISOString().slice(0, 10);
                return (
                  <div key={ds} className={`card p-2.5 sm:p-3 flex flex-col gap-1.5 ${isToday ? 'ring-1 ring-brand-500/40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)]">{DAYS_SHORT[day.getDay()]}</p>
                        <p className={`text-sm font-bold ${isToday ? 'text-brand-400' : 'text-[var(--text-primary)]'}`}>
                          {format(day, 'd')}
                        </p>
                      </div>
                      {isAdmin && (
                        <ActionIconButton
                          icon={asgn ? <Edit /> : <Plus />} size="sm"
                          variant={asgn ? 'default' : 'primary'}
                          tooltip={asgn ? 'Edit override' : 'Add override'}
                          onClick={() => setAssignModal({ date: ds, existing: asgn })}
                        />
                      )}
                    </div>
                    <div className="text-[10px]">
                      {asgn
                        ? asgn.type === 'off'   ? <span className="text-gray-400">Day Off</span>
                          : asgn.type === 'leave' ? <span className="text-brand-400">Leave</span>
                          : asgn.shift           ? <span className="text-brand-400">{asgn.shift.name}</span>
                          :                        <span className="text-[var(--text-muted)]">Override</span>
                        : <span className="text-[var(--text-muted)]">Routine</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* RECORDS */}
        {viewMode === 'records' && isAdmin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Filters — stack on mobile */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="input text-xs py-1.5 w-full sm:w-auto" />
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                className="input text-xs py-1.5 w-full sm:w-auto">
                <option value="">All employees</option>
                {(staffData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="input text-xs py-1.5 w-full sm:w-auto">
                <option value="">All statuses</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Status summary chips */}
            {records.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <div key={k} className="card p-2.5 sm:p-3 text-center">
                    <p className={`text-base sm:text-lg font-bold ${v.ring.split(' ')[0]}`}>
                      {records.filter(r => r.status === k).length}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{v.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Daily records table — horizontal scroll */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {format(parseISO(filterDate), 'EEEE, MMM d, yyyy')}
                </p>
                <span className="text-xs text-[var(--text-muted)]">{records.length} records</span>
              </div>
              {listLoading
                ? <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-[var(--text-muted)]" /></div>
                : records.length === 0
                ? <div className="text-center py-12 text-sm text-[var(--text-muted)]">No records</div>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: '520px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                          {['Employee', 'Shift', 'In', 'Out', 'Hrs', 'Late', 'Status'].map(h => (
                            <th key={h} className="text-left px-3 sm:px-4 py-2.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r: any) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-white/2 transition-colors">
                            <td className="px-3 sm:px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                                  {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-[var(--text-primary)] text-xs whitespace-nowrap">{r.user?.firstName} {r.user?.lastName}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{r.user?.role?.replace('_', ' ')}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5"><ShiftBadge shift={r.shift} /></td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">{r.checkIn ? format(new Date(r.checkIn), 'h:mm a') : '—'}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">{r.checkOut ? format(new Date(r.checkOut), 'h:mm a') : '—'}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-[var(--text-secondary)]">{r.hoursWorked ? `${Number(r.hoursWorked).toFixed(1)}h` : '—'}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs">{r.lateMinutes > 0 ? <span className="text-amber-400">{r.lateMinutes}m</span> : <span className="text-[var(--text-muted)]">—</span>}</td>
                            <td className="px-3 sm:px-4 py-2.5"><StatusPill status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>

            {/* Monthly summary table — horizontal scroll */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Monthly Summary</p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
                    className="btn-ghost w-7 h-7 p-0 justify-center"><ChevronLeft size={13} /></button>
                  <span className="text-xs font-medium text-[var(--text-primary)] min-w-[72px] text-center">
                    {format(new Date(year, month - 1, 1), 'MMM yyyy')}
                  </span>
                  <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
                    className="btn-ghost w-7 h-7 p-0 justify-center"><ChevronRight size={13} /></button>
                </div>
              </div>
              {summaryLoading
                ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[var(--text-muted)]" /></div>
                : !summaryData?.length
                ? <div className="text-center py-8 text-sm text-[var(--text-muted)]">No data</div>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: '480px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                          {['Employee', 'Present', 'Late', 'Half Day', 'Absent', 'Leave', 'Hours'].map(h => (
                            <th key={h} className="text-left px-3 sm:px-4 py-2.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(summaryData as any[]).map((row: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-white/2">
                            <td className="px-3 sm:px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                                  {row.user?.firstName?.[0]}{row.user?.lastName?.[0]}
                                </div>
                                <p className="text-xs font-medium text-[var(--text-primary)] whitespace-nowrap">{row.user?.firstName} {row.user?.lastName}</p>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-emerald-400 font-medium">{row.present}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-amber-400 font-medium">{row.late}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-blue-400 font-medium">{row.halfDay}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-red-400 font-medium">{row.absent}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-brand-400 font-medium">{row.leave}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-xs text-[var(--text-secondary)]">{Number(row.totalHours).toFixed(1)}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {patternModal && (
          <PatternModal userId={scheduleTarget} dayOfWeek={patternModal.dayOfWeek}
            existing={patternModal.existing} shifts={shifts} onClose={() => setPatternModal(null)} />
        )}
        {assignModal && (
          <AssignmentModal userId={scheduleTarget} date={assignModal.date}
            existing={assignModal.existing} shifts={shifts} onClose={() => setAssignModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <FeatureGate feature="attendance">
      <AttendancePageInner />
    </FeatureGate>
  );
}