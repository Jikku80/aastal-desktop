// Single source of truth for the website-builder right panel's design system.
//
// This supersedes the previously-duplicated local token objects that lived in:
//   - DomainSettings.tsx        (const dk = {...})
//   - ThemeEditor.tsx           (const dk = {...})
//   - GlobalSettingsEditor.tsx  (const dk = {...})
//   - SeoEditor.tsx             (const dk = {...})
//   - section-editors/EditorComponents.tsx (const t = {...})
//
// Values are based on the most complete of those (EditorComponents.tsx's `t`),
// with color key names canonicalized to the shorter `dk`-style names
// (muted/label instead of textMuted/textLabel, surfaceHover instead of
// surfaceHov) since that naming was used in the majority of files.
//
// fontSize/spacing/radius scales are new additions (the originals only had
// ad-hoc inline numbers) — intended for the Phase D UX redesign to consume,
// bumped up from the very tight values found across the panel today.

export const tokens = {
  // Flat color palette — kept flat (not nested under `color`) so existing
  // `dk.foo` / `t.foo` call sites only need their object name swapped for
  // `tokens`, with no restructuring of the accessor chain.
  bg: '#111318',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  surfaceDeep: 'rgba(0,0,0,0.25)',
  border: 'rgba(255,255,255,0.08)',
  borderFocus: '#6366f1',
  text: '#e2e4ef',
  muted: '#6b7080',
  label: '#8b8fa8',
  accent: '#6366f1',
  accentLight: 'rgba(99,102,241,0.15)',
  danger: '#f87171',
  dangerLight: 'rgba(248,113,113,0.1)',
  success: '#4ade80',

  // Font stacks
  font: "'Inter','Geist','Segoe UI',system-ui,sans-serif",
  fontMono: "'JetBrains Mono','Fira Code',monospace",

  // Font-size scale (px). Base body text bumped 11-12 -> 13, labels bumped
  // 10-11 -> 11.5, per the Phase D redesign brief.
  fontSize: {
    xs: 10.5,   // fine print / meta text
    label: 11.5, // field labels, section headings
    sm: 12,      // secondary body text
    base: 13,    // primary body / field text
    md: 14,      // emphasized text, section titles
    lg: 16,
    xl: 18,
  },

  // Spacing scale (px). Loosened from the panel's current 4-8px gaps.
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },

  // Corner-radius scale (px), replacing ad-hoc per-file radius numbers.
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};

export type DesignTokens = typeof tokens;
