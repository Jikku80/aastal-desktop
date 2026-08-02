'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        mutations: { retry: 0 },
      },
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        MotionConfig reducedMotion="user" makes every framer-motion
        animation in the dashboard (there are 300+ motion.* elements across
        ~48 files) automatically respect the OS-level "reduce motion"
        accessibility setting — which a lot of people on older/slower
        devices turn on specifically because animations feel janky. Without
        this wrapper, framer-motion drives transforms directly via RAF and
        completely ignores that setting (a plain CSS
        `@media (prefers-reduced-motion: reduce)` rule, like the one on the
        marketing page, has no effect on it). One line, zero visual change
        for anyone who hasn't enabled that setting, real relief for anyone
        who has.
      */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
