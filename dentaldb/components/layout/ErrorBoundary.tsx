'use client';

import React from 'react';

interface State {
  hasError: boolean;
  cleared: boolean;
  errorMessage: string;
}

/**
 * GlobalErrorBoundary
 *
 * Catches client-side exceptions that would otherwise show Next.js's
 * "Application error: a client-side exception has occurred" page.
 *
 * On first error it automatically clears all persisted Zustand stores
 * (localStorage keys) and reloads — this recovers from corrupted
 * persisted state after a major deployment without requiring users to
 * manually clear cache/cookies/localStorage (which most normal users
 * cannot do on mobile).
 */

const STORAGE_KEYS = [
  'dentalos-auth',
  'dentalos-permissions',
  'theme',
];

function clearAppStorage() {
  try {
    STORAGE_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch {}
    });
    // Also sweep any other dentalos-* keys that may have been added
    const all = Object.keys(localStorage);
    all.forEach((k) => {
      if (k.startsWith('dentalos-') || k.startsWith('clinickarobar-')) {
        try { localStorage.removeItem(k); } catch {}
      }
    });
  } catch {
    // localStorage unavailable (private mode, etc.) — ignore
  }
  try {
    sessionStorage.clear();
  } catch {}
}

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, cleared: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary] caught:', error, info);

    if (!this.state.cleared) {
      // Only clear persisted auth state for errors that look like corrupted
      // store / hydration issues — NOT for generic component render errors.
      // This prevents the infinite-reload loop when a UI component throws.
      const isStoreCorruption =
        error?.message?.includes('hydrat') ||
        error?.message?.includes('localStorage') ||
        info?.componentStack?.includes('Zustand') ||
        info?.componentStack?.includes('persist');

      if (isStoreCorruption) {
        clearAppStorage();
        this.setState({ cleared: true });
        this.reloadTimer = setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 600);
      } else {
        // For other errors (e.g. a panel component crashing), just show the
        // error UI so the user can click "Reload Now" manually instead of
        // getting an infinite-reload loop.
        this.setState({ cleared: false });
      }
    }
  }

  componentWillUnmount() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  handleManualReload = () => {
    clearAppStorage();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0d14',
            color: '#e2e4ef',
            fontFamily: "'DM Sans','Inter',system-ui,sans-serif",
            padding: '24px',
            textAlign: 'center',
          }}
        >
          {/* Spinner / reload indicator */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTopColor: '#6366f1',
              animation: 'eb-spin 0.8s linear infinite',
              marginBottom: 24,
            }}
          />
          <style>{`@keyframes eb-spin{to{transform:rotate(360deg)}}`}</style>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 8,
              color: '#e2e4ef',
            }}
          >
            {this.state.cleared ? 'Refreshing…' : 'Something went wrong'}
          </h2>

          <p
            style={{
              fontSize: 14,
              color: '#6b7280',
              maxWidth: 380,
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            {this.state.cleared
              ? 'Clearing cached data and reloading the app. This only takes a second.'
              : 'The app encountered an unexpected error. We\'re resetting your session now.'}
          </p>

          <button
            onClick={this.handleManualReload}
            style={{
              padding: '10px 28px',
              borderRadius: 10,
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            Reload Now
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}