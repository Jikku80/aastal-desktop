/**
 * Centralized Nepal-timezone handling for the backend.
 *
 * Nepal Standard Time is a fixed UTC+5:45 offset with no DST, so exact
 * arithmetic is safe and avoids depending on the host's TZ env var
 * (production containers default to UTC, which previously caused
 * `new Date(dto.scheduledAt)` to silently misinterpret the naive
 * datetime string the frontend sent).
 */

export const NEPAL_OFFSET_MINUTES = 5 * 60 + 45; // UTC+5:45

/**
 * Parse an incoming scheduling datetime that may either:
 *  - already include an explicit UTC offset / "Z" (a real instant), or
 *  - be a naive "YYYY-MM-DDTHH:mm[:ss]" string with no offset, which must
 *    be interpreted as Nepal local wall-clock time (NOT server-local time).
 */
export function parseAsNepalTime(value: string | Date): Date {
  if (value instanceof Date) return value;

  const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(value.trim());
  if (hasOffset) {
    return new Date(value);
  }

  const [datePart, timePart = '00:00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = '0'] = timePart.split(':');

  const asIfUTC = Date.UTC(
    year,
    (month || 1) - 1,
    day || 1,
    Number(hour) || 0,
    Number(minute) || 0,
    Number(second) || 0,
  );
  return new Date(asIfUTC - NEPAL_OFFSET_MINUTES * 60 * 1000);
}

/** Format a stored UTC instant as Nepal wall-clock time for server-generated text (notifications, conflict messages, PDFs, etc). */
export function formatNepalTime(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', ...options }).format(date);
}

/** "Jun 24, 2026, 1:00 PM" in Nepal time, for notification bodies etc. */
export function formatNepalDateTime(value: Date | string): string {
  return formatNepalTime(value, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/** Today's Nepal-local Y/M/D, regardless of the server process's timezone. */
export function nepalTodayParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Build the correct UTC instant for a given Nepal-local Y/M/D and hour/minute (e.g. clinic open at 9:00 NPT). */
export function nepalWallClockToUTC(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const asIfUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
  return new Date(asIfUTC - NEPAL_OFFSET_MINUTES * 60 * 1000);
}

/**
 * A Date object whose UTC-getter components (getUTCFullYear/Month/Date/Hours...)
 * read out as Nepal's current wall-clock time. This is NOT a real instant —
 * never send it back to a client or store it. It exists purely so we can
 * reuse `getUTCFullYear()` etc. to read "Nepal-local" date parts without
 * depending on the host's TZ env var.
 */
function nepalShiftedNow(): Date {
  return new Date(Date.now() + NEPAL_OFFSET_MINUTES * 60 * 1000);
}

/** Correct UTC instant for the start of "today" in Nepal (00:00 NPT), regardless of server timezone. */
export function nepalStartOfTodayUTC(): Date {
  const n = nepalShiftedNow();
  return nepalWallClockToUTC(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), 0, 0);
}

/** Correct UTC instant for the end of "today" in Nepal (23:59:59.999 NPT). */
export function nepalEndOfTodayUTC(): Date {
  return new Date(nepalStartOfTodayUTC().getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Nepal-local day bounds for "N days ago" (0 = today), as correct UTC instants. */
export function nepalDayBoundsUTC(daysAgo: number = 0): { start: Date; end: Date } {
  const start = new Date(nepalStartOfTodayUTC().getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/** Day-of-week index (0=Mon..6=Sun) for "N days ago", in Nepal-local terms. */
export function nepalDayOfWeek(daysAgo: number = 0): number {
  const { start } = nepalDayBoundsUTC(daysAgo);
  const shifted = new Date(start.getTime() + NEPAL_OFFSET_MINUTES * 60 * 1000);
  const jsDay = shifted.getUTCDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon..6=Sun
}
