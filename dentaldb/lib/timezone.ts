/**
 * Centralized Nepal-timezone handling.
 *
 * ROOT CAUSE of the "1:00 PM shows as 4:00 AM" bug:
 * Every part of the app that touched appointment times relied on the
 * *implicit* local timezone of whatever machine happened to be running
 * (the user's browser for the <input type="datetime-local"> value, and
 * the server's process timezone — UTC in production — when parsing it).
 * Those two "local" timezones almost never matched Nepal's UTC+5:45,
 * so the same instant rendered differently in different places.
 *
 * Nepal Standard Time has a fixed, non-DST offset of UTC+5:45, so we can
 * do exact arithmetic instead of depending on the Intl/tz database for
 * conversion. We still use Intl for *display* formatting (AM/PM, month
 * names) but always pin the timeZone explicitly to 'Asia/Kathmandu'.
 */

export const NEPAL_TIME_ZONE = 'Asia/Kathmandu';
export const NEPAL_OFFSET_MINUTES = 5 * 60 + 45; // UTC+5:45, fixed year-round

/**
 * Convert a `<input type="datetime-local">` value (e.g. "2026-06-24T13:00"),
 * which represents a Nepal wall-clock time chosen by the user, into a
 * correct UTC ISO string suitable for sending to the API.
 *
 * This must NOT use `new Date(value)` directly — that interprets the naive
 * string using the *runtime's* local timezone, not Nepal's.
 */
export function nepalLocalInputToUTCISOString(value: string): string {
  if (!value) return value;
  // value: "YYYY-MM-DDTHH:mm" (or with seconds)
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = '0'] = (timePart || '00:00').split(':');

  // Treat the parsed components as Nepal local time by building the UTC
  // instant directly: UTC = NepalLocalTime - 5:45.
  const asIfUTC = Date.UTC(
    year,
    month - 1,
    day,
    Number(hour),
    Number(minute),
    Number(second),
  );
  const utcMillis = asIfUTC - NEPAL_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis).toISOString();
}

/**
 * Convert a stored UTC instant (ISO string or Date) into the value format
 * required by `<input type="datetime-local">`, expressed in Nepal time,
 * so edit/reschedule forms pre-fill with the correct local time.
 */
export function utcToNepalLocalInputValue(value: string | Date): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  const nepalMillis = date.getTime() + NEPAL_OFFSET_MINUTES * 60 * 1000;
  const nepal = new Date(nepalMillis);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${nepal.getUTCFullYear()}-${pad(nepal.getUTCMonth() + 1)}-${pad(nepal.getUTCDate())}` +
    `T${pad(nepal.getUTCHours())}:${pad(nepal.getUTCMinutes())}`
  );
}

/**
 * Format a stored UTC instant for display, always in Nepal time, regardless
 * of the viewing device's timezone settings. Use this everywhere an
 * appointment/queue/billing timestamp is rendered to a user.
 */
export function formatNepalTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NEPAL_TIME_ZONE,
    ...options,
  }).format(date);
}

/** "Jun 24, 2026, 1:00 PM" */
export function formatNepalDateTime(value: string | Date | null | undefined): string {
  return formatNepalTime(value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** "1:00 PM" */
export function formatNepalClockTime(value: string | Date | null | undefined): string {
  return formatNepalTime(value, { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Splits clock time into { time: "1:00", ampm: "PM" } for UIs that render them separately. */
export function formatNepalClockTimeParts(value: string | Date | null | undefined): { time: string; ampm: string } {
  if (!value) return { time: '—', ampm: '' };
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return { time: '—', ampm: '' };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NEPAL_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { time: `${get('hour')}:${get('minute')}`, ampm: get('dayPeriod') };
}

/**
 * Today's calendar date *in Nepal time*, returned as a plain JS Date
 * constructed from local (runtime) year/month/day components at noon.
 *
 * Why this exists: `new Date()` gives the runtime's own local "now", which
 * only matches Nepal's calendar day by coincidence (when the server/browser
 * happens to also be set to UTC+5:45). Anywhere the app needs to know
 * *which day it is in Nepal* — e.g. highlighting "today" on the calendar
 * grid, or building `NepaliDate`/date-fns comparisons that read a Date's
 * local getters (getFullYear/getMonth/getDate) — pass the result of this
 * function instead of `new Date()`. Because it's built with the local
 * `Date(y, m, d, 12)` constructor, any code that later reads it back with
 * local getters (date-fns, nepali-date-converter, etc.) reconstructs the
 * same y/m/d, regardless of what timezone the runtime is actually in.
 */
export function getNepalToday(): Date {
  const key = formatNepalDateKey(new Date());
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** "2026-06-24" in Nepal time — use this (not date-fns format on a raw Date) when grouping/keying by calendar day. */
export function formatNepalDateKey(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NEPAL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "Jun 24, 2026" */
export function formatNepalDate(value: string | Date | null | undefined): string {
  return formatNepalTime(value, { year: 'numeric', month: 'short', day: 'numeric' });
}