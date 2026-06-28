'use client';

import React from 'react';
import type { ThemeConfig } from './siteRendererHelpers';
import { isColorDark } from './siteRendererHelpers';

export function SectionTitle({
  title, subtitle, theme, centered = true,
}: {
  title?:    string;
  subtitle?: string;
  theme:     ThemeConfig;
  centered?: boolean;
}) {
  if (!title) return null;
  return (
    <div className={`mb-10 sm:mb-12 ${centered ? 'text-center' : ''}`}>
      <h2
        className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4"
        style={{ fontFamily: theme.fontHeading, color: theme.textColor }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="text-base sm:text-lg max-w-2xl mx-auto px-2"
          style={{ color: isColorDark(theme.backgroundColor) ? 'rgba(255,255,255,0.60)' : '#6b7280' }}
        >{subtitle}</p>
      )}
    </div>
  );
}