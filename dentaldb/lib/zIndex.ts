/**
 * Centralized z-index scale.
 *
 * Root cause of the "notifications/overlays appear behind navbar" bug:
 * z-index values across the app were ad-hoc magic numbers (z-30, z-40,
 * z-50, z-[60], z-[100], z-[110]...) chosen independently per component,
 * with no shared reference. The navbar (TopNav) sits at 100, but the
 * notification dropdown was written before that and used z-50 — lower
 * than the navbar it needs to float above.
 *
 * Use these tiers for any new fixed/absolute overlay instead of guessing
 * a number. Each tier leaves headroom for internal layering.
 */
export const Z = {
  SIDEBAR: 40,            // Desktop fixed sidebar, mobile sidebar backdrop/panel
  CONTEXT_SIDEBAR: 60,    // Right-hand context/widget sidebar
  NAVBAR: 100,            // TopNav bar itself (desktop + mobile menu panel)
  NAVBAR_POPOVER: 120,    // Anything that must float above the navbar while the
                          // user is still "in" the nav (user menu, branch switcher,
                          // notification bell dropdown, search palette)
  TOAST: 150,             // react-hot-toast (default 9999, listed for reference only)
  MODAL: 200,             // Standard modals/dialogs
  MODAL_POPOVER: 210,     // Comboboxes/menus nested inside a modal
  CRITICAL_GATE: 300,     // Subscription/paywall gates that must sit above everything
} as const;
