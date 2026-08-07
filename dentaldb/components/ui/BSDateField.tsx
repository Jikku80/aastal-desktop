'use client';
import { useCalendarType } from '@/hooks/useCalendarType';
import { BS_MONTHS, adToBS, bsToAD, getDaysInBSMonth } from '@/lib/calendar';

/** Format a JS Date as a plain AD ISO date string "YYYY-MM-DD" (no time, no TZ shifting). */
function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a "YYYY-MM-DD" string into a local Date. Falls back to today if empty/invalid. */
function parseISODate(val: string | undefined): Date {
  if (!val) return new Date();
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

interface BSDateFieldProps {
  /** Plain AD ISO date string "YYYY-MM-DD" — same contract as a native <input type="date">. Can be '' when unset (e.g. a clear-able filter). */
  value: string;
  onChange: (v: string) => void;
  className?: string;
  required?: boolean;
}

/**
 * Date-only field (no time component). Renders a plain AD <input type="date">
 * unless the clinic has BS selected in Settings → Clinic Profile, in which
 * case it renders Nepali (Bikram Sambat) year/month/day dropdowns instead.
 *
 * The value emitted via onChange is always a plain AD ISO date string
 * ("YYYY-MM-DD"), identical to what a native date input produces — so every
 * caller (billing due date, expense date, billing list date-range filters)
 * keeps working against the backend without any payload changes.
 *
 * Companion to RegistrationDateField (which is the datetime-local version of
 * the same idea). Keep both in sync if the BS conversion logic changes —
 * the actual conversion lives in lib/calendar.ts, shared by both.
 */
export function BSDateField({ value, onChange, className, required }: BSDateFieldProps) {
  const calendarType = useCalendarType();

  if (calendarType !== 'BS') {
    return (
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={className || 'input w-full'}
        required={required}
      />
    );
  }

  const current = parseISODate(value);
  const bs = adToBS(current);
  const daysInMonth = getDaysInBSMonth(bs.year, bs.month);
  const thisYearBS = adToBS(new Date()).year;
  const yearOptions = Array.from({ length: 101 }, (_, i) => thisYearBS - 100 + i).reverse();

  const applyChange = (year: number, month: number, day: number) => {
    const clampedDay = Math.min(day, getDaysInBSMonth(year, month));
    const adDate = bsToAD(year, month, clampedDay);
    onChange(toISODate(adDate));
  };

  const selectCls = `input text-xs px-1 ${className ?? ''}`.trim();

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: '3.2rem 5rem 4rem', minWidth: 0 }}>
      <select
        value={bs.day}
        onChange={e => applyChange(bs.year, bs.month, Number(e.target.value))}
        className={selectCls}
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        value={bs.month}
        onChange={e => applyChange(bs.year, Number(e.target.value), bs.day)}
        className={selectCls}
      >
        {BS_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select
        value={bs.year}
        onChange={e => applyChange(Number(e.target.value), bs.month, bs.day)}
        className={selectCls}
      >
        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}