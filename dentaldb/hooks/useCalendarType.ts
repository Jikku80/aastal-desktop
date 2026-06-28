'use client';
import { useAuthStore } from '@/store/auth.store';
import type { CalendarType } from '@/lib/calendar';

/**
 * Returns the clinic's calendar preference: 'BS' (Nepali, default) or 'AD' (Gregorian).
 * Reads from the auth store's clinic settings — same source of truth as the appointments page.
 */
export function useCalendarType(): CalendarType {
  const { clinic } = useAuthStore();
  return ((clinic as any)?.settings?.calendarType) === 'AD' ? 'AD' : 'BS';
}
