/**
 * app/site/[subdomain]/manifest.ts
 * Generates a per-clinic web app manifest for PWA support and favicon.
 * Next.js 14+ automatically serves this as /manifest.webmanifest
 */

import type { MetadataRoute } from 'next';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

export default async function manifest({
  params,
}: {
  params: { subdomain: string };
}): Promise<MetadataRoute.Manifest> {
  const { subdomain } = params;

  let clinicName  = 'Clinic';
  let themeColor  = '#2563eb';
  let iconUrl     = '/icon-192.png';

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/website-builder/public/${subdomain}`,
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const data = await res.json();
      clinicName = data.clinic?.name     ?? clinicName;
      themeColor = data.website?.theme?.colors?.primary ?? themeColor;
      iconUrl    = data.website?.seo?.ogImage ?? data.clinic?.logo ?? iconUrl;
    }
  } catch {
    // Fall back to defaults — non-critical
  }

  const base = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'clinickarobar.com';

  return {
    name:             clinicName,
    short_name:       clinicName.split(/\s+/)[0],
    description:      `${clinicName} — Book appointments online`,
    start_url:        `https://${subdomain}.${base}/`,
    display:          'browser',
    background_color: '#ffffff',
    theme_color:      themeColor,
    categories:       ['health', 'medical'],
    icons: [
      {
        src:     iconUrl.startsWith('http') ? iconUrl : `/icon-192.png`,
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     iconUrl.startsWith('http') ? iconUrl : `/icon-192.png`,
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'maskable',
      },
      {
        src:   iconUrl.startsWith('http') ? iconUrl : `/icon-512.png`,
        sizes: '512x512',
        type:  'image/png',
      },
    ],
  };
}
