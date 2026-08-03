import { Toaster } from 'react-hot-toast';
import Providers from '@/components/layout/Providers';
import AuthGuard from '@/components/layout/AuthGuard';
import OfflineBanner from '@/components/system/OfflineBanner';
import WatchedFolderListener from '@/components/system/WatchedFolderListener';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
        rel="stylesheet"
      />
      <Providers>
        <AuthGuard>
          <OfflineBanner />
          <WatchedFolderListener />
          {children}
        </AuthGuard>
      </Providers>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </>
  );
}