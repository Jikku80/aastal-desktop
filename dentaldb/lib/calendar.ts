import NepaliDate, { dateConfigMap } from 'nepali-date-converter';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type CalendarType = 'BS' | 'AD';

export const BS_MONTHS = [
  'Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin',
  'Kartik','Mangsir','Poush','Magh','Falgun','Chaitra',
];

// Keys as used by nepali-date-converter's own dateConfigMap, in month-index (0-11) order.
// Only the transliteration differs from BS_MONTHS above (Asar/Aswin vs Ashadh/Ashwin) —
// same calendar, same order.
const LIB_MONTH_KEYS = [
  'Baisakh','Jestha','Asar','Shrawan','Bhadra','Aswin',
  'Kartik','Mangsir','Poush','Magh','Falgun','Chaitra',
] as const;

// ── Low-level converters ──────────────────────────────────────────────────────
// All BS↔AD math and day-count lookups are delegated to nepali-date-converter
// (a maintained, tested library) rather than a hand-typed table — a hand-rolled
// lookup table risks silently producing wrong dates in years nobody remembered
// to add, which is worse than not converting at all.

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

/**
 * Days in a given BS month, read straight from nepali-date-converter's own
 * data table (the same table it uses internally for BS↔AD conversion), so
 * this can never drift out of sync with adToBS/bsToAD. Covers BS 2000–2090
 * (~AD 1943–2033); outside that range the library itself can't convert
 * reliably either, so we fall back to 30 rather than guessing further.
 */
export function getDaysInBSMonth(bsYear: number, bsMonth: number): number {
  const yearConfig = (dateConfigMap as Record<number, Record<string, number>>)[bsYear];
  const key = LIB_MONTH_KEYS[bsMonth];
  return yearConfig?.[key] ?? 30;
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

/** Short day-level label for chart X-axes: "Baisakh 15" (no year, no "BS" suffix) */
export function toBSDayShort(date: Date): string {
  try {
    const { month, day } = adToBS(date);
    return `${BS_MONTHS[month]} ${day}`;
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
 * Short day-level label for chart axes (no year).
 * BS → "Baisakh 15"
 * AD → "Apr 15"
 */
export function formatDayLabel(date: Date, calendarType: CalendarType): string {
  if (calendarType === 'BS') return toBSDayShort(date);
  return format(date, 'MMM d');
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