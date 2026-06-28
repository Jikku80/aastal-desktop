/**
 * app/site/[subdomain]/sitemap.ts
 * Next.js dynamic sitemap route for subdomain-based clinic sites.
 * Proxies to the backend /seo/:identifier/sitemap.xml endpoint.
 */

import type { MetadataRoute } from 'next';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

export default async function sitemap({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<MetadataRoute.Sitemap> {
  const { subdomain } = await params;

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/seo/${subdomain}/sitemap.xml`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return [];

    const xml = await res.text();

    // Parse the XML and convert to Next.js sitemap format
    const urls: MetadataRoute.Sitemap = [];
    const locMatches = xml.matchAll(/<url>([\s\S]*?)<\/url>/g);

    for (const match of locMatches) {
      const urlBlock = match[1];
      const loc      = urlBlock.match(/<loc>(.*?)<\/loc>/)?.[1] ?? '';
      const lastmod  = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
      const changefreq = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/)?.[1] as
        MetadataRoute.Sitemap[number]['changeFrequency'] | undefined;
      const priority = urlBlock.match(/<priority>(.*?)<\/priority>/)?.[1];

      if (loc) {
        urls.push({
          url:            loc,
          lastModified:   lastmod ? new Date(lastmod) : new Date(),
          changeFrequency: changefreq,
          priority:       priority ? parseFloat(priority) : undefined,
        });
      }
    }

    return urls;
  } catch {
    return [];
  }
}
