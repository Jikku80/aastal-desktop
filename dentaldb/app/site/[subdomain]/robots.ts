/**
 * app/site/[subdomain]/robots.ts
 * Next.js dynamic robots.txt route for subdomain-based clinic sites.
 * Proxies to the backend /seo/:identifier/robots.txt endpoint.
 */

import type { MetadataRoute } from 'next';
import { getCanonicalDomain } from '@/lib/seoUtils';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

export default async function robots({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<MetadataRoute.Robots> {
  const { subdomain } = await params;

  const siteBase = process.env.NEXT_PUBLIC_SITE_DOMAIN
    ? `https://${subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN}`
    : `https://${subdomain}.clinickarobar.com`;

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/seo/${subdomain}/robots.txt`,
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      // Fallback: disallow all if site not found / not published
      return {
        rules: { userAgent: '*', disallow: '/' },
        sitemap: `${siteBase}/sitemap.xml`,
      };
    }

    const txt = await res.text();
    const isDisallowAll = txt.includes('Disallow: /') && !txt.includes('Allow: /');

    if (isDisallowAll) {
      return {
        rules: { userAgent: '*', disallow: '/' },
        sitemap: `${siteBase}/sitemap.xml`,
      };
    }

    // Parse disallow directives from the robots.txt
    const disallowLines = [...txt.matchAll(/^Disallow:\s*(.+)$/gm)]
      .map(m => m[1].trim())
      .filter(Boolean);

    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: disallowLines.length ? disallowLines : undefined,
      },
      sitemap: `${siteBase}/sitemap.xml`,
    };
  } catch {
    return {
      rules: { userAgent: '*', disallow: '/' },
      sitemap: `${siteBase}/sitemap.xml`,
    };
  }
}
