import type React from 'react';
import type { ThemeConfig } from '../../hooks/useBuilderState';

// ── Shared types ──────────────────────────────────────────────────────────────
export type PreviewProps = {
  s: Record<string, any>;
  css: React.CSSProperties;
  padding: React.CSSProperties;
  theme: ThemeConfig;
  wrapperClass: string;
  liveDoctors?: any[];
  liveBranches?: any[];
};
