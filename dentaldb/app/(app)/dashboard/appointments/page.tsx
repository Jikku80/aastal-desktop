'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isToday, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { formatNepalClockTime, formatNepalClockTimeParts, formatNepalDateKey, nepalLocalInputToUTCISOString, utcToNepalLocalInputValue } from '@/lib/timezone';
import { AnimatePresence } from 'framer-motion';
import {
  Clock, ChevronLeft, ChevronRight, List, Search, X, Calendar, Plus, SortAsc, SortDesc, Upload,
} from 'lucide-react';
import { appointmentsApi, patientsApi } from '@/lib/api';
import { useSearchParams, useRouter as useNavRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import AppointmentModal from '@/components/appointments/AppointmentModal';
import AppointmentDetailPanel from '@/components/appointments/AppointmentDetailPanel';
import type { Appointment } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import toast from 'react-hot-toast';
import NepaliDate from 'nepali-date-converter';
import { BranchReadOnlyBanner, useBranchReadOnly } from '@/components/layout/BranchReadOnlyBanner';
import GenericImportModal from '@/components/layout/GenericImportModal';

// ── BS date helpers ───────────────────────────────────────────────────────────
const BS_MONTHS = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];

// Days-in-month lookup for BS years (extendable)
const BS_DAYS_IN_MONTH: Record<number, number[]> = {
  2079: [31,31,32,32,31,30,30,29,30,29,30,31],
  2080: [31,31,32,32,31,30,30,29,30,29,30,30],
  2081: [31,31,32,32,31,31,30,29,30,29,30,30],
  2082: [31,32,31,32,31,30,30,30,29,29,30,30],
  2083: [31,31,32,32,31,30,30,30,29,29,30,30],
  2084: [31,31,32,32,31,30,30,30,29,29,30,30],
};

/**
 * Resolve a patientId for an imported appointment row.
 * Looks up an existing patient by phone number first; if none is found,
 * creates a new minimal patient record (requires first + last name) and
 * uses that. Throws if neither an existing match nor enough info to
 * create a new patient is available — the row is then marked failed by
 * GenericImportModal.
 */
async function resolvePatientIdForImport(data: {
  patientFirstName?: string;
  patientLastName?: string;
  phone?: string;
}): Promise<string> {
  const { patientFirstName, patientLastName, phone } = data;

  if (phone) {
    const res = await patientsApi.list({ search: phone, limit: 1 });
    const found = res?.data?.data?.[0] ?? res?.data?.[0];
    if (found?.id) return found.id;
  }

  if (!patientFirstName || !patientLastName) {
    throw new Error(
      'No matching patient found for this row, and a first + last name is required to create a new one.',
    );
  }

  const created = await patientsApi.create({
    firstName: patientFirstName,
    lastName:  patientLastName,
    phone:     phone || undefined,
  });
  const newId = created?.data?.id ?? created?.data?.data?.id;
  if (!newId) throw new Error('Failed to create patient record for this row.');
  return newId;
}

function adToBS(ad: Date): { year: number; month: number; day: number } {
  try {
    const nd = new NepaliDate(ad);
    return { year: nd.getYear(), month: nd.getMonth(), day: nd.getDate() };
  } catch {
    return { year: 2081, month: 0, day: 1 };
  }
}

function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  try {
    const nd = new NepaliDate(bsYear, bsMonth, bsDay);
    return nd.toJsDate();
  } catch {
    return new Date();
  }
}

function getDaysInBSMonth(bsYear: number, bsMonth: number): number {
  return BS_DAYS_IN_MONTH[bsYear]?.[bsMonth] ?? 30;
}

function toBSFull(date: Date): string {
  try {
    const { year, month, day } = adToBS(date);
    return `${BS_MONTHS[month]} ${day}, ${year} BS`;
  } catch { return ''; }
}
function toBSMonthYear(date: Date): string {
  try {
    const { year, month } = adToBS(date);
    return `${BS_MONTHS[month]} ${year} BS`;
  } catch { return ''; }
}

// Returns the AD date range actually shown on screen for the current view.
// A BS month frequently spans two different Gregorian months, so relying on
// a single `format(date, 'yyyy-MM')` to fetch data can silently miss
// appointments that fall in the second AD month of a BS month — this is
// most visible right after navigating (which resets the anchor day to 1)
// and then navigating back.
function getVisibleRange(date: Date, calView: CalView, calendarType: 'BS' | 'AD'): { from: Date; to: Date } {
  if (calView === 'month') {
    if (calendarType === 'BS') {
      const { year, month } = adToBS(date);
      const totalDays = getDaysInBSMonth(year, month);
      return { from: bsToAD(year, month, 1), to: bsToAD(year, month, totalDays) };
    }
    return {
      from: new Date(date.getFullYear(), date.getMonth(), 1),
      to:   new Date(date.getFullYear(), date.getMonth() + 1, 0),
    };
  }
  if (calView === 'week') {
    const from = startOfWeek(date);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    return { from, to };
  }
  return { from: date, to: date };
}

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { 'en-US': enUS } });
const DnDCalendar = withDragAndDrop(BigCalendar as any);

// ── AD (Gregorian) month calendar grid ───────────────────────────────────────
function ADMonthCalendar({
  date, appointments, onSelectDate, onSelectApt, canCreate,
}: {
  date: Date;
  appointments: Appointment[];
  onSelectDate: (d: Date) => void;
  onSelectApt: (a: Appointment) => void;
  canCreate: boolean;
}) {
  const year  = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const firstDay  = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun
  const today = new Date();

  const aptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const key = formatNepalDateKey(apt.scheduledAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return map;
  }, [appointments]);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const AD_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 rounded-xl"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={d}
            className={`text-center py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400/70' : 'text-[var(--text-muted)]'}`}
            style={{ borderRight: i < 6 ? '1px solid var(--border)' : undefined }}>
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full">
          {cells.map((day, idx) => {
            if (day === null) {
              return (
                <div key={`e${idx}`}
                  style={{
                    borderRight: (idx % 7) < 6 ? '1px solid var(--border)' : undefined,
                    borderBottom: '1px solid var(--border)',
                    background: 'rgba(0,0,0,0.12)',
                    minHeight: 76,
                  }} />
              );
            }
            const cellDate = new Date(year, month, day);
            const adKey    = format(cellDate, 'yyyy-MM-dd');
            const dayApts  = aptsByDate.get(adKey) || [];
            const isToday_ = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSat    = cellDate.getDay() === 6;
            const isSun    = cellDate.getDay() === 0;

            return (
              <div key={`d${day}`}
                onClick={() => canCreate && onSelectDate(cellDate)}
                className={`relative p-1 sm:p-1.5 transition-colors flex flex-col ${canCreate ? 'cursor-pointer hover:bg-white/5' : ''}`}
                style={{
                  borderRight: (idx % 7) < 6 ? '1px solid var(--border)' : undefined,
                  borderBottom: '1px solid var(--border)',
                  background: isToday_ ? 'rgba(14,157,232,0.07)' : 'transparent',
                  minHeight: 76,
                }}>
                <div className={`inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold mb-1 shrink-0 self-start ${
                  isToday_ ? 'bg-brand-500 text-white' : isSat || isSun ? 'text-red-400' : 'text-[var(--text-secondary)]'
                }`}>
                  {day}
                </div>
                <div className="space-y-0.5 overflow-hidden flex-1">
                  {dayApts.slice(0, 3).map(apt => (
                    <button
                      key={apt.id}
                      onClick={e => { e.stopPropagation(); onSelectApt(apt); }}
                      className="w-full text-left truncate rounded font-medium leading-snug px-1 py-px"
                      style={{
                        fontSize: '9px',
                        background: (TYPE_COLORS[apt.type] || TYPE_COLORS.default) + '20',
                        color: TYPE_COLORS[apt.type] || TYPE_COLORS.default,
                        borderLeft: `2px solid ${TYPE_COLORS[apt.type] || TYPE_COLORS.default}`,
                      }}>
                      <span className="hidden sm:inline">{formatNepalClockTime(apt.scheduledAt)} </span>
                      {apt.patient?.firstName} {apt.patient?.lastName?.[0]}.
                    </button>
                  ))}
                  {dayApts.length > 3 && (
                    <p className="text-[9px] text-[var(--text-muted)] pl-1 leading-tight">+{dayApts.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  consultation: '#3b82f6', cleaning: '#10b981', filling: '#f59e0b',
  extraction: '#ef4444', root_canal: '#8b5cf6', crown: '#ec4899',
  orthodontics: '#14b8a6', emergency: '#dc2626', followup: '#6366f1', default: '#0e9de8',
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-brand-500/10 text-brand-400',
  confirmed: 'bg-emerald-500/10 text-emerald-400',
  completed: 'bg-gray-500/10 text-gray-400',
  cancelled: 'bg-red-500/10 text-red-400',
  no_show: 'bg-orange-500/10 text-orange-400',
};

type PageView = 'calendar' | 'list';
type CalView = 'month' | 'week' | 'day';

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

// ── Nepali BS month calendar grid ─────────────────────────────────────────────
function BSMonthCalendar({
  date, appointments, onSelectDate, onSelectApt, canCreate,
}: {
  date: Date;
  appointments: Appointment[];
  onSelectDate: (d: Date) => void;
  onSelectApt: (a: Appointment) => void;
  canCreate: boolean;
}) {
  const bs = adToBS(date);
  const { year: bsYear, month: bsMonth } = bs;
  const totalDays    = getDaysInBSMonth(bsYear, bsMonth);
  const firstADDate  = bsToAD(bsYear, bsMonth, 1);
  const startWeekday = firstADDate.getDay(); // 0=Sun
  const todayBS      = adToBS(new Date());

  const aptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const key = formatNepalDateKey(apt.scheduledAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return map;
  }, [appointments]);

  // Build grid: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 rounded-xl"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={d}
            className={`text-center py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-red-400/70' : 'text-[var(--text-muted)]'}`}
            style={{ borderRight: i < 6 ? '1px solid var(--border)' : undefined }}>
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full">
          {cells.map((bsDay, idx) => {
            if (bsDay === null) {
              return (
                <div key={`e${idx}`}
                  style={{
                    borderRight: (idx % 7) < 6 ? '1px solid var(--border)' : undefined,
                    borderBottom: '1px solid var(--border)',
                    background: 'rgba(0,0,0,0.12)',
                    minHeight: 76,
                  }} />
              );
            }

            const adDate  = bsToAD(bsYear, bsMonth, bsDay);
            const adKey   = format(adDate, 'yyyy-MM-dd');
            const dayApts = aptsByDate.get(adKey) || [];
            const isToday = todayBS.year === bsYear && todayBS.month === bsMonth && todayBS.day === bsDay;
            const isSat   = adDate.getDay() === 6;
            const isSun   = adDate.getDay() === 0;

            return (
              <div key={`d${bsDay}`}
                onClick={() => canCreate && onSelectDate(adDate)}
                className={`relative p-1 sm:p-1.5 transition-colors flex flex-col ${
                  canCreate ? 'cursor-pointer hover:bg-white/5' : ''
                }`}
                style={{
                  borderRight: (idx % 7) < 6 ? '1px solid var(--border)' : undefined,
                  borderBottom: '1px solid var(--border)',
                  background: isToday ? 'rgba(14,157,232,0.07)' : 'transparent',
                  minHeight: 76,
                }}>
                {/* Day number badge */}
                <div className={`inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold mb-1 shrink-0 self-start ${
                  isToday
                    ? 'bg-brand-500 text-white'
                    : isSat || isSun
                    ? 'text-red-400'
                    : 'text-[var(--text-secondary)]'
                }`}>
                  {bsDay}
                </div>

                {/* Events */}
                <div className="space-y-0.5 overflow-hidden flex-1">
                  {dayApts.slice(0, 3).map(apt => (
                    <button
                      key={apt.id}
                      onClick={e => { e.stopPropagation(); onSelectApt(apt); }}
                      className="w-full text-left truncate rounded font-medium leading-snug px-1 py-px"
                      style={{
                        fontSize: '9px',
                        background: (TYPE_COLORS[apt.type] || TYPE_COLORS.default) + '20',
                        color: TYPE_COLORS[apt.type] || TYPE_COLORS.default,
                        borderLeft: `2px solid ${TYPE_COLORS[apt.type] || TYPE_COLORS.default}`,
                      }}>
                      <span className="hidden sm:inline">{formatNepalClockTime(apt.scheduledAt)} </span>
                      {apt.patient?.firstName} {apt.patient?.lastName?.[0]}.
                    </button>
                  ))}
                  {dayApts.length > 3 && (
                    <p className="text-[9px] text-[var(--text-muted)] pl-1 leading-tight">+{dayApts.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Desktop Today Sidebar ─────────────────────────────────────────────────────
function TodaySidebar({ todayApts, onSelect, calendarType }: { todayApts: Appointment[]; onSelect: (a: Appointment) => void; calendarType: 'BS' | 'AD' }) {
  const today = new Date();
  const todayLabel = calendarType === 'BS' ? toBSFull(today) : format(today, 'EEEE, MMMM d, yyyy');
  return (
    <div className="hidden lg:flex w-64 shrink-0 flex-col border-l" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Today · {todayApts.length}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{todayLabel}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {todayApts.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">No appointments today</p>
        ) : todayApts.map(apt => (
          <button key={apt.id} onClick={() => onSelect(apt)}
            className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 transition-colors card"
            style={{ borderLeft: `3px solid ${TYPE_COLORS[apt.type] || TYPE_COLORS.default}` }}>
            <div className="flex items-center justify-between mb-0.5 gap-1">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {apt.patient?.firstName} {apt.patient?.lastName}
              </p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ml-1 shrink-0 ${STATUS_COLORS[apt.status] || ''}`}>
                {apt.status}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              <Clock size={9} className="inline mr-1" />
              {formatNepalClockTime(apt.scheduledAt)} · {apt.durationMinutes}m
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Mobile Today Strip ────────────────────────────────────────────────────────
function MobileTodayStrip({ todayApts, onSelect }: { todayApts: Appointment[]; onSelect: (a: Appointment) => void }) {
  if (todayApts.length === 0) return null;
  return (
    <div className="lg:hidden shrink-0 mb-2">
      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
        Today · {todayApts.length}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {todayApts.map(apt => (
          <button key={apt.id} onClick={() => onSelect(apt)}
            className="shrink-0 text-left p-2.5 rounded-xl card"
            style={{ width: 172, borderLeft: `3px solid ${TYPE_COLORS[apt.type] || TYPE_COLORS.default}` }}>
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {apt.patient?.firstName} {apt.patient?.lastName}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {formatNepalClockTime(apt.scheduledAt)} · {apt.durationMinutes}m
            </p>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_COLORS[apt.status] || ''}`}>
              {apt.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({
  appointments, onSelect, canCreate, onNew, calendarType,
}: { appointments: Appointment[]; onSelect: (a: Appointment) => void; canCreate: boolean; onNew: () => void; calendarType: 'BS' | 'AD' }) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    let list = [...appointments];
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    list.sort((a, b) => {
      const diff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });
    return list;
  }, [appointments, sortDir, statusFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of filtered) {
      const key = formatNepalDateKey(apt.scheduledAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="input text-xs h-9" style={{ flex: 1, minWidth: 0 }}>
          <option value="">All Statuses</option>
          {['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="btn-secondary h-9 px-3 text-xs flex items-center gap-1.5 shrink-0">
          {sortDir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
          <span className="hidden sm:inline">{sortDir === 'asc' ? 'Oldest' : 'Newest'}</span>
        </button>
        <span className="text-xs text-[var(--text-muted)] shrink-0">{filtered.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={32} className="text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-muted)]">No appointments found</p>
            {canCreate && (
              <button onClick={onNew} className="btn-primary mt-4 text-sm gap-2">
                <Plus size={14} /> New Appointment
              </button>
            )}
          </div>
        ) : groups.map(([dateStr, apts]) => {
          const d = parseISO(dateStr);
          const todayFlag = isToday(d);
          return (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex flex-col text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${todayFlag ? 'bg-brand-500/20 text-brand-400' : 'text-[var(--text-muted)]'}`}>
                  <span>{todayFlag ? 'Today — ' : ''}{calendarType === 'BS' ? toBSFull(d) : format(d, 'EEE, MMMM d, yyyy')}</span>
                  <span className="text-[10px] font-normal opacity-75">{calendarType === 'BS' ? format(d, 'EEE, MMM d') + ' AD' : toBSFull(d)}</span>
                </div>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">{apts.length} apt{apts.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1.5">
                {apts.map(apt => (
                  <button key={apt.id} onClick={() => onSelect(apt)}
                    className="w-full card p-3 text-left hover:border-brand-500/40 transition-all"
                    style={{ borderLeft: `3px solid ${TYPE_COLORS[apt.type] || TYPE_COLORS.default}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="shrink-0 w-10 text-center">
                          <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{formatNepalClockTimeParts(apt.scheduledAt).time}</p>
                          <p className="text-[9px] text-[var(--text-muted)]">{formatNepalClockTimeParts(apt.scheduledAt).ampm}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {apt.patient?.firstName} {apt.patient?.lastName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {apt.type?.replace('_', ' ')} · {apt.durationMinutes}m
                            {apt.dentist ? ` · Dr. ${apt.dentist.firstName}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${STATUS_COLORS[apt.status] || 'bg-gray-500/10 text-gray-400'}`}>
                        {apt.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [pageView, setPageView]     = useState<PageView>('calendar');
  const [calView, setCalView]       = useState<CalView>('month');
  const [date, setDate]             = useState(new Date());
  const [showModal, setShowModal]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedApt, setSelected]  = useState<Appointment | null>(null);
  const searchParams = useSearchParams();
  const navRouter = useNavRouter();
  useEffect(() => {
    const deepLinkId = searchParams.get('id');
    if (!deepLinkId) return;
    appointmentsApi.get(deepLinkId).then(r => {
      setSelected(r.data);
      navRouter.replace('/dashboard/appointments');
    }).catch(() => { /* appointment may have been deleted/cancelled */ });
  }, [searchParams]);
  const [newAptDate, setNewAptDate] = useState<Date | null>(null);
  const [searchRaw, setSearchRaw]   = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const search = useDebounce(searchRaw, 300);
  const qc = useQueryClient();
  const { activeBranch, clinic } = useAuthStore();
  const { can } = usePermissions();
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const canCreate = can('appointment.create') && !branchLocked;
  const canUpdate = can('appointment.update') && !branchLocked;

  // Read calendar type from clinic settings: 'BS' (default, Nepali) or 'AD' (English)
  const calendarType: 'BS' | 'AD' = ((clinic as any)?.settings?.calendarType) === 'AD' ? 'AD' : 'BS';

  useEffect(() => {
    if (window.innerWidth >= 640) setCalView('month');
  }, []);

  const { from: visibleFrom, to: visibleTo } = useMemo(
    () => getVisibleRange(date, calView, calendarType),
    [date, calView, calendarType],
  );

  const { data: aptData } = useQuery({
    queryKey: ['appointments', format(visibleFrom, 'yyyy-MM-dd'), format(visibleTo, 'yyyy-MM-dd'), activeBranch?.id, pageView],
    queryFn: () => {
      if (pageView === 'list') {
        return appointmentsApi.list({ limit: 500, branchId: activeBranch?.id, order: 'ASC' }).then(r => r.data);
      }
      return appointmentsApi
        .list({
          from: format(visibleFrom, 'yyyy-MM-dd'),
          to:   format(visibleTo, 'yyyy-MM-dd'),
          limit: 300,
          branchId: activeBranch?.id,
        })
        .then(r => r.data);
    },
  });

  const appointments: Appointment[] = aptData?.data ?? (Array.isArray(aptData) ? aptData : []);
  const filtered = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(a =>
      `${a.patient?.firstName ?? ''} ${a.patient?.lastName ?? ''}`.toLowerCase().includes(q) ||
      (a.type ?? '').toLowerCase().includes(q) ||
      (a.status ?? '').toLowerCase().replace('_', ' ').includes(q),
    );
  }, [appointments, search]);

  const events = useMemo(() => filtered.map(apt => ({
    id: apt.id,
    title: `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.trim() || 'Patient',
    start: new Date(apt.scheduledAt),
    end: new Date(apt.endsAt || new Date(new Date(apt.scheduledAt).getTime() + (apt.durationMinutes || 30) * 60000)),
    resource: apt,
    color: TYPE_COLORS[apt.type] || TYPE_COLORS.default,
  })), [filtered]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayApts = appointments
    .filter(a => format(new Date(a.scheduledAt), 'yyyy-MM-dd') === todayStr)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Calendar navigation — BS navigates by Nepali month, AD by Gregorian month
  const nav = (dir: -1 | 1) => setDate(d => {
    if (calView === 'month') {
      if (calendarType === 'BS') {
        const bs = adToBS(d);
        let newMonth = bs.month + dir;
        let newYear  = bs.year;
        if (newMonth < 0)  { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0;  newYear++; }
        return bsToAD(newYear, newMonth, 1);
      } else {
        const n = new Date(d);
        n.setDate(1);
        n.setMonth(n.getMonth() + dir);
        return n;
      }
    }
    const n = new Date(d);
    if (calView === 'week') n.setDate(n.getDate() + dir * 7);
    else n.setDate(n.getDate() + dir);
    return n;
  });

  const dragMutation = useMutation({
    mutationFn: ({ id, start }: { id: string; start: Date }) =>
      appointmentsApi.update(id, { scheduledAt: start.toISOString() }),
    onSuccess: () => { toast.success('Appointment rescheduled'); qc.invalidateQueries({ queryKey: ['appointments'] }); },
    onError: () => toast.error('Failed to reschedule'),
  });

  const handleEventDrop = useCallback(({ event, start }: any) => {
    if (!canUpdate) return;
    dragMutation.mutate({ id: event.id, start: new Date(start) });
  }, [canUpdate, dragMutation]);

  const handleEventResize = useCallback(({ event, start }: any) => {
    if (!canUpdate) return;
    dragMutation.mutate({ id: event.id, start: new Date(start) });
  }, [canUpdate, dragMutation]);

  const handleSelectSlot = useCallback(({ start }: any) => {
    if (!canCreate) return;
    if (!activeBranch) { toast.error('Select a branch before creating an appointment.'); return; }
    setNewAptDate(new Date(start));
    setShowModal(true);
  }, [canCreate, activeBranch]);

  const handleSuccess = () => { setShowModal(false); setNewAptDate(null); qc.invalidateQueries({ queryKey: ['appointments'] }); };
  const handleNewClick = () => {
    if (!activeBranch) { toast.error('Select a branch before creating an appointment.'); return; }
    setNewAptDate(null); setShowModal(true);
  };

  // Calendar label — BS shows Nepali month/year, AD shows English
  const bs = adToBS(date);
  const calLabel = calendarType === 'BS'
    ? calView === 'month'
      ? `${BS_MONTHS[bs.month]} ${bs.year} BS`
      : calView === 'week'
      ? `${format(date, 'MMM d')} · ${BS_MONTHS[bs.month]} ${bs.year} BS`
      : `${format(date, 'EEE, MMM d')} · ${BS_MONTHS[bs.month]} ${bs.day}, ${bs.year} BS`
    : calView === 'month'
      ? format(date, 'MMMM yyyy')
      : calView === 'week'
      ? `Week of ${format(date, 'MMM d, yyyy')}`
      : format(date, 'EEEE, MMMM d, yyyy');

  const calSubLabel = calendarType === 'BS'
    ? calView === 'month' ? format(date, 'MMMM yyyy') + ' AD' : undefined
    : calView === 'month' ? `${BS_MONTHS[bs.month]} ${bs.year} BS` : undefined;

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <Header
        title="Appointments"
        action={canCreate ? { label: 'New appointment', onClick: handleNewClick } : undefined}
      />

      {!activeBranch && <div className="px-4 pt-3"><NoBranchBanner action="create appointments" /></div>}
      <div className="px-4 pt-2"><BranchReadOnlyBanner /></div>
      <style>{`
        .rbc-time-view .rbc-allday-cell      { display: none !important; }
        .rbc-time-view .rbc-time-header-row  { display: none !important; }
        .rbc-time-header.rbc-overflowing     { border-right: none !important; }
        .rbc-time-header                     { border-bottom: 1px solid var(--border) !important; }
        .rbc-calendar                        { background: transparent !important; color: var(--text-primary) !important; }
        .rbc-month-view, .rbc-time-view      { border-color: var(--border) !important; }
        .rbc-header                          { border-color: var(--border) !important; color: var(--text-muted) !important; font-size: 11px !important; font-weight: 600 !important; padding: 6px 4px !important; }
        .rbc-day-bg + .rbc-day-bg,
        .rbc-month-row + .rbc-month-row,
        .rbc-time-slot                       { border-color: var(--border) !important; }
        .rbc-today                           { background: rgba(14,157,232,0.06) !important; }
        .rbc-off-range-bg                    { background: rgba(0,0,0,0.15) !important; }
        .rbc-time-gutter .rbc-label          { font-size: 10px !important; color: var(--text-muted) !important; padding: 0 4px !important; }
        .rbc-current-time-indicator          { background-color: #0e9de8 !important; }
        .rbc-show-more                       { color: #0e9de8 !important; font-size: 10px !important; }
        .rbc-event                           { font-size: 11px !important; }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-3 lg:p-4 min-w-0">

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-1.5 mb-2 shrink-0 min-w-0">
            {pageView === 'calendar' && (
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <button onClick={() => nav(-1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--text-secondary)] shrink-0">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => nav(1)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--text-secondary)] shrink-0">
                  <ChevronRight size={15} />
                </button>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">{calLabel}</span>
                  {calSubLabel && (
                    <span className="text-[10px] text-[var(--text-muted)] truncate leading-tight hidden sm:block">
                      {calSubLabel}
                    </span>
                  )}
                </div>
              </div>
            )}

            {pageView === 'list' && (
              <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 min-w-0 truncate">
                All Appointments
              </span>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowSearch(s => !s)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${showSearch ? 'bg-brand-500/15 text-brand-400' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}>
                {showSearch ? <X size={15} /> : <Search size={15} />}
              </button>

              <div className="flex items-center p-0.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <button onClick={() => setPageView('calendar')}
                  className={`h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${pageView === 'calendar' ? 'bg-brand-600 text-white' : 'text-[var(--text-secondary)]'}`}>
                  <Calendar size={13} />
                  <span className="hidden sm:inline">Cal</span>
                </button>
                <button onClick={() => setPageView('list')}
                  className={`h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${pageView === 'list' ? 'bg-brand-600 text-white' : 'text-[var(--text-secondary)]'}`}>
                  <List size={13} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {canCreate && (
                <button onClick={handleNewClick}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-600 text-white">
                  <Plus size={15} />
                </button>
              )}
              {canCreate && (
                <button
                  onClick={() => {
                    if (!activeBranch) { toast.error('Select a branch first.'); return; }
                    setShowImport(true);
                  }}
                  title="Import from CSV/Excel"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 text-[var(--text-secondary)]">
                  <Upload size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="relative mb-2 shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                autoFocus
                value={searchRaw}
                onChange={e => setSearchRaw(e.target.value)}
                placeholder="Search patient, type, status…"
                className="input h-9 w-full text-sm"
                style={{ paddingLeft: '2rem', paddingRight: searchRaw ? '2rem' : '0.75rem' }}
              />
              {searchRaw && (
                <button onClick={() => setSearchRaw('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {search && (
            <p className="text-[11px] text-[var(--text-muted)] mb-2 shrink-0">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{search}&quot;
            </p>
          )}

          {/* Cal sub-view row: Month / Week / Day */}
          {pageView === 'calendar' && (
            <div className="flex items-center gap-1 mb-2 shrink-0">
              <div className="flex flex-1 p-0.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {(['month', 'week', 'day'] as CalView[]).map(v => (
                  <button key={v} onClick={() => setCalView(v)}
                    className={`flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-all ${v === calView ? 'bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {v === 'month' ? 'Month' : v}
                  </button>
                ))}
              </div>
              <button onClick={() => setDate(new Date())}
                className="btn-secondary text-xs h-9 px-3 shrink-0">
                Today
              </button>
            </div>
          )}

          {/* Mobile today strip */}
          {pageView === 'calendar' && calView !== 'month' && (
            <MobileTodayStrip todayApts={todayApts} onSelect={setSelected} />
          )}

          {/* Views */}
          {pageView === 'list' ? (
            <ListView appointments={filtered} onSelect={setSelected} canCreate={canCreate} onNew={handleNewClick} calendarType={calendarType} />
          ) : calView === 'month' ? (
            calendarType === 'BS' ? (
              /* ── Nepali BS month grid ── */
              <BSMonthCalendar
                date={date}
                appointments={filtered}
                onSelectDate={d => { setNewAptDate(d); setShowModal(true); }}
                onSelectApt={setSelected}
                canCreate={canCreate}
              />
            ) : (
              /* ── English AD (Gregorian) month grid ── */
              <ADMonthCalendar
                date={date}
                appointments={filtered}
                onSelectDate={d => { setNewAptDate(d); setShowModal(true); }}
                onSelectApt={setSelected}
                canCreate={canCreate}
              />
            )
          ) : (
            /* ── Week / Day: react-big-calendar ── */
            <div className="flex-1 overflow-hidden rounded-xl min-h-0" style={{ background: 'var(--bg-surface)' }}>
              <DnDCalendar
                localizer={localizer}
                events={events}
                view={calView}
                onView={v => setCalView(v as CalView)}
                date={date}
                onNavigate={setDate}
                onSelectEvent={(e: any) => setSelected(e.resource)}
                onSelectSlot={handleSelectSlot}
                onEventDrop={canUpdate ? handleEventDrop : undefined}
                onEventResize={canUpdate ? handleEventResize : undefined}
                selectable={canCreate}
                resizable={canUpdate}
                draggableAccessor={() => canUpdate}
                style={{ height: '100%', padding: '4px' }}
                eventPropGetter={(e: any) => ({
                  style: {
                    backgroundColor: e.color, border: 'none',
                    borderRadius: '5px', fontSize: '11px',
                    padding: '1px 5px', cursor: canUpdate ? 'grab' : 'pointer',
                  },
                })}
                components={{ toolbar: () => null }}
              />
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {pageView === 'calendar' && (
          <TodaySidebar todayApts={todayApts} onSelect={setSelected} calendarType={calendarType} />
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <AppointmentModal
            onClose={() => { setShowModal(false); setNewAptDate(null); }}
            onSuccess={handleSuccess}
            initialDate={newAptDate || undefined}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedApt && (
          <AppointmentDetailPanel
            apt={selectedApt}
            onClose={() => setSelected(null)}
            onUpdate={() => { qc.invalidateQueries({ queryKey: ['appointments'] }); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showImport && (
          <GenericImportModal
            title="Import Appointments"
            sampleColumns={['Patient First Name','Patient Last Name','Phone','Doctor ID','Scheduled At','Ends At','Type','Notes']}
            columnSpecs={[
              { field: 'patientFirstName', aliases: ['patient first name','firstname','first name','patient firstname'] },
              { field: 'patientLastName',  aliases: ['patient last name','lastname','last name','patient lastname'] },
              { field: 'phone',            aliases: ['phone','mobile','contact'] },
              { field: 'doctorId',         aliases: ['doctor id','dentist id','doctorid','dentistid'] },
              { field: 'scheduledAt',      aliases: ['scheduled at','scheduled','start','start time','date time','datetime'], transform: v => new Date(v).toISOString() },
              { field: 'endsAt',           aliases: ['ends at','end','end time'], transform: v => new Date(v).toISOString() },
              { field: 'type',             aliases: ['type','appointment type'] },
              { field: 'notes',            aliases: ['notes','note','remarks'] },
            ]}
            requiredFields={['scheduledAt', 'doctorId']}
            onImportRow={async (data) => {
              const { patientFirstName, patientLastName, phone, doctorId, ...rest } = data;
              const patientId = await resolvePatientIdForImport({ patientFirstName, patientLastName, phone });
              await appointmentsApi.create({
                ...rest,
                patientId,
                dentistId: doctorId,
                type: rest.type || 'checkup',
                branchId: activeBranch?.id,
              });
            }}
            onClose={() => setShowImport(false)}
            onSuccess={() => { setShowImport(false); qc.invalidateQueries({ queryKey: ['appointments'] }); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}