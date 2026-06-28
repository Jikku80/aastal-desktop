/**
 * app/site/_custom/robots.ts
 * Next.js dynamic robots.txt for custom-domain clinic sites.
 */

import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs       = await headers();
  const host       = hdrs.get('x-clinic-host') ?? '';
  const identifier = host.replace(/^www\./, '');

  const siteBase = host ? `https://${host}` : 'https://clinickarobar.com';

  if (!identifier) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/seo/${identifier}/robots.txt`,
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      return {
        rules:   { userAgent: '*', disallow: '/' },
        sitemap: `${siteBase}/sitemap.xml`,
      };
    }

    const txt          = await res.text();
    const isDisallowAll = txt.includes('Disallow: /') && !txt.includes('Allow: /');

    if (isDisallowAll) {
      return {
        rules:   { userAgent: '*', disallow: '/' },
        sitemap: `${siteBase}/sitemap.xml`,
      };
    }

    const disallowLines = [...txt.matchAll(/^Disallow:\s*(.+)$/gm)]
      .map(m => m[1].trim())
      .filter(Boolean);

    return {
      rules: {
        userAgent: '*',
        allow:     '/',
        disallow:  disallowLines.length ? disallowLines : undefined,
      },
      sitemap: `${siteBase}/sitemap.xml`,
    };
  } catch {
    return {
      rules:   { userAgent: '*', disallow: '/' },
      sitemap: `${siteBase}/sitemap.xml`,
    };
  }
}
