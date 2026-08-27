'use client';

import React from 'react';
import { Star } from 'lucide-react';
import type { ThemeConfig } from '../../hooks/useBuilderState';

// ── Shared helpers ────────────────────────────────────────────────────────────
export const resolveImg = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

export function SectionTitle({ title, subtitle, theme, light = false, centered = true }: { title?: string; subtitle?: string; theme: ThemeConfig; light?: boolean; centered?: boolean; }) {
  if (!title) return null;
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''}`}>
      <h2 className="text-3xl font-bold mb-3" style={{ color: light ? '#fff' : theme.textColor, fontFamily: theme.fontHeading }}>{title}</h2>
      {subtitle && <p className="text-lg max-w-2xl mx-auto" style={{ color: light ? 'rgba(255,255,255,0.75)' : '#6b7280' }}>{subtitle}</p>}
    </div>
  );
}

export function StarRating({ rating = 5, color }: { rating?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array(5).fill(0).map((_, i) => <Star key={i} size={14} fill={i < rating ? color : 'none'} stroke={color} />)}
    </div>
  );
}
