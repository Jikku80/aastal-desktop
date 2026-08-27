import { useEffect, useState } from 'react';
import type React from 'react';
import { useBuilderStore, type SectionConfig, type ThemeConfig } from '../../hooks/useBuilderState';

// ── Live data hooks used by team/branches/etc in builder canvas ───────────────

function useLiveDoctors(subdomain: string, enabled: boolean) {
  const [doctors, setDoctors] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled || !subdomain) return;
    import('@/lib/api/websiteApi').then(({ websitePublicApi }) => {
      websitePublicApi.getDoctors(subdomain).then(setDoctors).catch(() => {});
    });
  }, [subdomain, enabled]);
  return doctors;
}

function useLiveBranches(subdomain: string, enabled: boolean) {
  const [branches, setBranches] = useState<any[]>([]);
  useEffect(() => {
    if (!enabled || !subdomain) return;
    import('@/lib/api/websiteApi').then(({ websitePublicApi }) => {
      websitePublicApi.getBranches(subdomain).then(setBranches).catch(() => {});
    });
  }, [subdomain, enabled]);
  return branches;
}

export interface SectionRenderProps {
  css: React.CSSProperties;
  padding: React.CSSProperties;
  wrapperClass: string;
  theme: ThemeConfig;
  liveDoctors: any[];
  liveBranches: any[];
}

/**
 * Computes the shared render setup (css vars, padding/spacing, wrapper class,
 * border style, live-data fetches) for a given section — mirrors exactly what
 * SectionRenderer.tsx used to compute inline before the Phase A split.
 */
export function useSectionRenderProps(section: SectionConfig): SectionRenderProps {
  const { theme, subdomain } = useBuilderStore();
  const s: Record<string, any> = section.settings ?? {};

  // Fetch live data for team/branches when dataSource = 'live-api'
  const liveDoctors  = useLiveDoctors(subdomain,  section.type === 'team'     && s.dataSource !== 'manual');
  const liveBranches = useLiveBranches(subdomain, section.type === 'branches' && s.dataSource !== 'manual');

  const RADIUS_MAP: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '9999px' };
  const css = {
    '--primary':   theme.primaryColor,
    '--secondary': theme.secondaryColor,
    '--accent':    theme.accentColor,
    '--bg':        theme.backgroundColor,
    '--text':      theme.textColor,
    '--radius':    RADIUS_MAP[theme.borderRadius] ?? '8px',
    fontFamily:    theme.fontBody,
  } as React.CSSProperties;

  const SPACING_MAP: Record<string, string> = { none: '0px', compact: '40px', normal: '64px', spacious: '96px', large: '128px' };
  const spacingVal = SPACING_MAP[s.sectionSpacing ?? 'normal'] ?? '64px';
  const basePadding = section.padding
    ? { paddingTop: section.padding.top, paddingBottom: section.padding.bottom }
    : { paddingTop: spacingVal, paddingBottom: spacingVal };

  const bgOverride: React.CSSProperties = {};
  if (s.sectionBgType === 'color' && s.sectionBgColor) bgOverride.background = s.sectionBgColor;
  else if (s.sectionBgType === 'gradient' && s.sectionBgGradient) bgOverride.background = s.sectionBgGradient;

  const padding = { ...basePadding };
  const WRAPPER_MAP: Record<string, string> = {
    full: 'w-full', contained: 'w-full max-w-6xl mx-auto px-8',
    wide: 'w-full max-w-7xl mx-auto px-4', narrow: 'w-full max-w-4xl mx-auto px-8',
  };
  const wrapperKey = s.containerWidth ?? section.layout ?? 'contained';
  const wrapperClass = WRAPPER_MAP[wrapperKey] ?? 'w-full max-w-6xl mx-auto px-8';

  const borderStyle: React.CSSProperties = {};
  if (s.sectionBorder && s.sectionBorder !== 'none') {
    const bc = s.sectionBorderColor ?? '#e5e7eb';
    if (s.sectionBorder === 'top')    borderStyle.borderTop    = `1px solid ${bc}`;
    if (s.sectionBorder === 'bottom') borderStyle.borderBottom = `1px solid ${bc}`;
    if (s.sectionBorder === 'both')   { borderStyle.borderTop = `1px solid ${bc}`; borderStyle.borderBottom = `1px solid ${bc}`; }
    if (s.sectionBorder === 'all')    borderStyle.border = `1px solid ${bc}`;
  }
  const mergedCss = { ...css, ...bgOverride, ...borderStyle } as React.CSSProperties;

  return { css: mergedCss, padding, wrapperClass, theme, liveDoctors, liveBranches };
}
