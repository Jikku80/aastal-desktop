/**
 * app/site/_custom/sitemap.ts
 * Next.js dynamic sitemap for custom-domain clinic sites.
 * The x-clinic-host middleware header is used to resolve the domain identifier.
 */

import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hdrs       = await headers();
  const host       = hdrs.get('x-clinic-host') ?? '';
  const identifier = host.replace(/^www\./, '');

  if (!identifier) return [];

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/seo/${identifier}/sitemap.xml`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return [];

    const xml  = await res.text();
    const urls: MetadataRoute.Sitemap = [];
    const locMatches = xml.matchAll(/<url>([\s\S]*?)<\/url>/g);

    for (const match of locMatches) {
      const urlBlock   = match[1];
      const loc        = urlBlock.match(/<loc>(.*?)<\/loc>/)?.[1] ?? '';
      const lastmod    = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
      const changefreq = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/)?.[1] as
        MetadataRoute.Sitemap[number]['changeFrequency'] | undefined;
      const priority   = urlBlock.match(/<priority>(.*?)<\/priority>/)?.[1];

      if (loc) {
        urls.push({
          url:             loc,
          lastModified:    lastmod ? new Date(lastmod) : new Date(),
          changeFrequency: changefreq,
          priority:        priority ? parseFloat(priority) : undefined,
        });
      }
    }

    return urls;
  } catch {
    return [];
  }
}
