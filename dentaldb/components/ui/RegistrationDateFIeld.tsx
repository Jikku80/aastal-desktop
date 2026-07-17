'use client';
import { useCalendarType } from '@/hooks/useCalendarType';
import { BS_MONTHS, adToBS, bsToAD, getDaysInBSMonth } from '@/lib/calendar';
import { utcToNepalLocalInputValue } from '@/lib/timezone';

/** Convert a JS Date / ISO string to the value expected by <input type="datetime-local"> */
export function toDatetimeLocal(val: string | Date | undefined | null): string {
  if (!val) return utcToNepalLocalInputValue(new Date());
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? utcToNepalLocalInputValue(new Date()) : utcToNepalLocalInputValue(d);
}

/** Parse a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm") into a local Date, without any UTC shifting. */
export function parseDatetimeLocal(val: string | undefined): Date {
  if (!val) return new Date();
  const [datePart, timePart] = val.split('T');
  const [y, m, d] = (datePart || '').split('-').map(Number);
  const [hh, mm] = (timePart || '00:00').split(':').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

export function toDatetimeLocalString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Registration Date field. Renders a plain AD datetime-local input, unless the
 * clinic has BS selected in Settings → Clinic Profile, in which case it renders
 * Nepali (Bikram Sambat) year/month/day dropdowns + a time input instead —
 * many Nepal clinics track patient registration in BS, not the Gregorian date.
 * Either way the underlying stored value stays a normal AD ISO datetime.
 *
 * Shared between the full Patient form (PatientModal) and the inline
 * "Add new patient" quick-form inside AppointmentModal — keep both in sync
 * by editing this file rather than duplicating the logic.
 */
export function RegistrationDateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const calendarType = useCalendarType();

  if (calendarType !== 'BS') {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        type="datetime-local"
        className="input w-full"
      />
    );
  }

  const current = parseDatetimeLocal(value);
  const bs = adToBS(current);
  const timeStr = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
  const daysInMonth = getDaysInBSMonth(bs.year, bs.month);
  const thisYearBS = adToBS(new Date()).year;
  const yearOptions = Array.from({ length: 101 }, (_, i) => thisYearBS - 100 + i).reverse();

  const applyChange = (year: number, month: number, day: number, time: string) => {
    const clampedDay = Math.min(day, getDaysInBSMonth(year, month));
    const adDate = bsToAD(year, month, clampedDay);
    const [hh, mm] = time.split(':').map(Number);
    adDate.setHours(hh || 0, mm || 0, 0, 0);
    onChange(toDatetimeLocalString(adDate));
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <select
        value={bs.day}
        onChange={e => applyChange(bs.year, bs.month, Number(e.target.value), timeStr)}
        className="input w-full text-sm">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        value={bs.month}
        onChange={e => applyChange(bs.year, Number(e.target.value), bs.day, timeStr)}
        className="input w-full text-sm">
        {BS_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select
        value={bs.year}
        onChange={e => applyChange(Number(e.target.value), bs.month, bs.day, timeStr)}
        className="input w-full text-sm">
        {yearOptions.map(y => <option key={y} value={y}>{y} BS</option>)}
      </select>
      <input
        type="time"
        value={timeStr}
        onChange={e => applyChange(bs.year, bs.month, bs.day, e.target.value)}
        className="input w-full text-sm"
      />
    </div>
  );
}