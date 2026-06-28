'use client';

/**
 * app/(app)/dashboard/seo/page.tsx
 * Fixed: dark mode support, no emojis, mobile responsive
 */

import { useState } from 'react';
import { SeoDashboard } from '@/components/seo/SeoDashboard';
import { BlogAdminPage } from '@/components/seo/BlogAdminPage';
import OnlineOnlyGate from '@/components/system/OnlineOnlyGate';

type View = 'seo' | 'blog';

export default function SeoBlogPage() {
  const [view, setView] = useState<View>('seo');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top nav */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setView('seo')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'seo'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          SEO Settings
        </button>
        <button
          onClick={() => setView('blog')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'blog'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Blog Manager
        </button>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
          Manage SEO, sitemap, robots.txt, and blog posts to boost Google rankings
        </span>
      </div>

      <div className="p-4 sm:p-6">
        <OnlineOnlyGate featureName="SEO & Blog Manager">
          {view === 'seo'  && <SeoDashboard />}
          {view === 'blog' && <BlogAdminPage />}
        </OnlineOnlyGate>
      </div>
    </div>
  );
}
