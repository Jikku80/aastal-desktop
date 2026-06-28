// ── Shared helpers, types, and color utilities ────────────────────────────────
import type { PageConfig, SectionConfig, ThemeConfig } from '@/lib/seoUtils';
import { sanitizeImageUrl } from '@/lib/sanitizeImageUrl';

export type { PageConfig, SectionConfig, ThemeConfig };

// ── Shared prop type ──────────────────────────────────────────────────────────
export type SecProps = {
  s:              Record<string, any>;
  theme:          ThemeConfig;
  subdomain:      string;
  clinic:         Record<string, any> | null;
  branches:       Record<string, any>[];
  containerClass: string;
  isPreview?:     boolean;
};

/** Returns true if a hex/rgb colour is perceptually dark */
export function isColorDark(color: string): boolean {
  if (!color) return false;
  const hex = color.replace('#', '');
  if (hex.length === 3 || hex.length === 6) {
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return false;
}

/** Resolve an image URL — backend may return a relative path like /uploads/… */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/uploads/') || url.startsWith('/public/')) {
    const base =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ??
      (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${url}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return sanitizeImageUrl(url) ?? '';
  }
  if (url.startsWith('//')) {
    return sanitizeImageUrl('https:' + url) ?? '';
  }
  return '';
}

/**
 * Returns adaptive surface colors based on whether the theme background is dark.
 */
export function themeColors(theme: ThemeConfig) {
  const isDark   = isColorDark(theme.backgroundColor);
  const bg       = theme.backgroundColor || '#ffffff';
  const text     = theme.textColor       || '#111827';
  const primary  = theme.primaryColor    || '#0ea5e9';

  return {
    isDark,
    sectionBg:      bg,
    sectionAltBg:   isDark ? 'rgba(255,255,255,0.04)' : '#f8faff',
    sectionDarkBg:  isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
    sectionWhite:   isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    cardBg:         isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
    cardBorder:     isDark ? 'rgba(255,255,255,0.10)' : '#f0f0f0',
    cardShadow:     isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
    headingColor:   text,
    bodyColor:      isDark ? 'rgba(255,255,255,0.60)' : '#6b7280',
    mutedColor:     isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af',
    labelColor:     isDark ? 'rgba(255,255,255,0.70)' : '#374151',
    inputBg:        isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    inputBorder:    isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb',
    inputText:      isDark ? 'rgba(255,255,255,0.85)' : '#1f2937',
    inputPlaceholder: isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af',
  };
}