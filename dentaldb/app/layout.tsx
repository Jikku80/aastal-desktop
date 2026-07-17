import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GlobalErrorBoundary } from '@/components/layout/ErrorBoundary';

export const metadata: Metadata = {
  title: { default: 'ClinicKarobar : Clinic Practice Management', template: '%s | Aastal' },
  description: 'All-in-one clinic management for modern practices',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="antialiased">
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}