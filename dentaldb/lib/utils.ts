import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';

// Tailwind class merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date helpers
export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy · h:mm a');
}

export function formatTimeOnly(date: string | Date) {
  return format(new Date(date), 'h:mm a');
}

export function formatRelative(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d · h:mm a');
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Currency
export function formatNPR(amount: number | string) {
  return `NPR ${Number(amount).toLocaleString('en-NP')}`;
}

// Initials
export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Truncate
export function truncate(str: string, maxLen = 50) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

// Status label maps
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  rescheduled: 'Rescheduled',
};

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  cleaning: 'Teeth Cleaning',
  filling: 'Filling',
  extraction: 'Extraction',
  root_canal: 'Root Canal',
  crown: 'Crown',
  orthodontics: 'Orthodontics',
  whitening: 'Whitening',
  xray: 'X-Ray',
  emergency: 'Emergency',
  followup: 'Follow-up',
  other: 'Other',
};

export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

// Generate avatar URL fallback
export function avatarUrl(name: string, size = 40) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=027cc6&color=fff&bold=true`;
}

// Download helper
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Sleep utility (for testing)
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Deep merge objects
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge((target as any)[key] || {}, source[key] as any);
    } else {
      (result as any)[key] = source[key];
    }
  }
  return result;
}
