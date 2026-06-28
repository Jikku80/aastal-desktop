import NepaliDate from 'nepali-date-converter';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type CalendarType = 'BS' | 'AD';

export const BS_MONTHS = [
  'Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin',
  'Kartik','Mangsir','Poush','Magh','Falgun','Chaitra',
];

// Days-per-BS-month lookup (extend as needed)
const BS_DAYS_IN_MONTH: Record<number, number[]> = {
  2079: [31,31,32,32,31,30,30,29,30,29,30,31],
  2080: [31,31,32,32,31,30,30,29,30,29,30,30],
  2081: [31,31,32,32,31,31,30,29,30,29,30,30],
  2082: [31,32,31,32,31,30,30,30,29,29,30,30],
  2083: [31,31,32,32,31,30,30,30,29,29,30,30],
  2084: [31,31,32,32,31,30,30,30,29,29,30,30],
  2085: [31,31,32,32,31,30,30,29,30,29,30,30],

  2086: [31,31,32,32,31,30,30,29,30,29,30,30],
  2087: [31,31,32,32,31,30,30,29,30,29,30,30],
  2088: [31,31,32,31,32,30,30,29,30,29,30,30],
  2089: [31,31,32,32,31,30,30,29,30,29,30,30],
  2090: [31,31,32,32,31,30,30,29,30,29,30,30],
  2091: [31,32,31,32,31,30,30,30,29,29,30,30],
  2092: [31,31,32,32,31,30,30,30,29,29,30,30],
  2093: [31,31,32,32,31,30,30,30,29,29,30,30],
  2094: [31,31,32,32,31,30,30,29,30,29,30,30],
  2095: [31,31,32,32,31,30,30,29,30,29,30,30],
};

// ── Low-level converters ──────────────────────────────────────────────────────

export function adToBS(ad: Date): { year: number; month: number; day: number } {
  try {
    const nd = new NepaliDate(ad);
    return { year: nd.getYear(), month: nd.getMonth(), day: nd.getDate() };
  } catch {
    return { year: 2081, month: 0, day: 1 };
  }
}

export function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  try {
    const nd = new NepaliDate(bsYear, bsMonth, bsDay);
    return nd.toJsDate();
  } catch {
    return new Date();
  }
}

export function getDaysInBSMonth(bsYear: number, bsMonth: number): number {
  return BS_DAYS_IN_MONTH[bsYear]?.[bsMonth] ?? 30;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/** e.g. "Baisakh 15, 2082 BS" */
export function toBSFull(date: Date): string {
  try {
    const { year, month, day } = adToBS(date);
    return `${BS_MONTHS[month]} ${day}, ${year} BS`;
  } catch { return ''; }
}

/** e.g. "Baisakh 2082 BS" */
export function toBSMonthYear(date: Date): string {
  try {
    const { year, month } = adToBS(date);
    return `${BS_MONTHS[month]} ${year} BS`;
  } catch { return ''; }
}

/** Short label for chart X-axes: "Baisakh 2082" (no "BS" suffix to save space) */
export function toBSMonthShort(date: Date): string {
  try {
    const { year, month } = adToBS(date);
    return `${BS_MONTHS[month]} ${year}`;
  } catch { return ''; }
}

/**
 * Returns the AD Date that is the first day of the BS month containing `adDate`.
 * Example: if adDate is in Baisakh 2082, returns the AD equivalent of Baisakh 1, 2082.
 */
export function bsStartOfMonth(adDate: Date): Date {
  try {
    const { year, month } = adToBS(adDate);
    return bsToAD(year, month, 1);
  } catch {
    return startOfMonth(adDate);
  }
}

/**
 * Returns the AD Date that is the last day of the BS month containing `adDate`.
 */
export function bsEndOfMonth(adDate: Date): Date {
  try {
    const { year, month } = adToBS(adDate);
    const days = getDaysInBSMonth(year, month);
    return bsToAD(year, month, days);
  } catch {
    return endOfMonth(adDate);
  }
}

// ── Universal helpers (pick BS or AD based on calendarType) ──────────────────

/**
 * Format a date respecting the clinic calendar setting.
 * BS → "Baisakh 15, 2082 BS"
 * AD → "Apr 15, 2025"
 */
export function formatDate(date: Date, calendarType: CalendarType): string {
  if (calendarType === 'BS') return toBSFull(date);
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a month+year respecting the clinic calendar setting.
 * BS → "Baisakh 2082 BS"
 * AD → "April 2025"
 */
export function formatMonthYear(date: Date, calendarType: CalendarType): string {
  if (calendarType === 'BS') return toBSMonthYear(date);
  return format(date, 'MMMM yyyy');
}

/**
 * Short month label for chart axes.
 * BS → "Baisakh 2082"
 * AD → "Apr 2025"
 */
export function formatMonthLabel(date: Date, calendarType: CalendarType): string {
  if (calendarType === 'BS') return toBSMonthShort(date);
  return format(date, 'MMM yyyy');
}

/**
 * Returns [startDate, endDate] for the current month in the given calendar system,
 * expressed as AD Date objects (which the backend expects).
 */
export function currentMonthRange(calendarType: CalendarType): { start: Date; end: Date } {
  const today = new Date();
  if (calendarType === 'BS') {
    return { start: bsStartOfMonth(today), end: bsEndOfMonth(today) };
  }
  return { start: startOfMonth(today), end: endOfMonth(today) };
}

/**
 * Returns [startDate, endDate] for a given month offset (0 = current, -1 = previous…)
 * in the given calendar system, as AD Date objects.
 */
export function monthRangeByOffset(
  offsetMonths: number,
  calendarType: CalendarType,
): { start: Date; end: Date } {
  if (calendarType === 'BS') {
    const today = new Date();
    const { year, month } = adToBS(today);
    let y = year;
    let m = month + offsetMonths;
    while (m < 0)  { y--; m += 12; }
    while (m > 11) { y++; m -= 12; }
    const days = getDaysInBSMonth(y, m);
    return { start: bsToAD(y, m, 1), end: bsToAD(y, m, days) };
  }
  const base = subMonths(new Date(), -offsetMonths);
  return { start: startOfMonth(base), end: endOfMonth(base) };
}
