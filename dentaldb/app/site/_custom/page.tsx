/**
 * app/site/custom-domain/page.tsx
 *
 * Primary route for all custom-domain clinic sites.
 * Middleware routes custom domains here (x-clinic-host header carries the
 * original hostname). This is the routable counterpart of app/site/_custom/
 * (_custom is non-routable in Next.js because of the underscore prefix).
 *
 * Uses LiveSiteRenderer for real-time builder sync (BroadcastChannel).
 */

import type { Metadata }     from 'next';
import { headers }            from 'next/headers';
import { notFound }           from 'next/navigation';
import { SchemaScript }       from '@/components/seo/SchemaScript';
import { AnalyticsScripts }   from '@/components/seo/AnalyticsScripts';
import { LiveSiteRenderer }   from '../components/LiveSiteRenderer';
import {
  buildSeoMetadata,
  buildClinicSchema,
  buildLocalBusinessSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
  extractFaqsFromSections,
  getCanonicalDomain,
  DEFAULT_THEME,
  DEFAULT_GLOBAL_SETTINGS,
  type WebsiteData,
  type ClinicData,
  type PageConfig,
} from '@/lib/seoUtils';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

interface SitePayload {
  website:  WebsiteData;
  clinic:   ClinicData | null;
  branches: Record<string, any>[];
}

async function getSiteData(identifier: string): Promise<SitePayload | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/website-builder/public/${identifier}`,
      // no-store so every request is fresh; Next.js dedupes within the same render
      { next: { revalidate: 0 }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json() as Promise<SitePayload>;
  } catch {
    return null;
  }
}

/**
 * Resolve the page to render.
 * - Try the requested slug first (home or named).
 * - A page is considered "active" when enabled is true OR undefined (older
 *   saved pages that predate the enabled flag default to visible).
 * - Only fall back to the home page when the requested page is truly disabled
 *   (enabled === false) or doesn't exist.
 */
function resolveActivePage(pages: PageConfig[], slug: string): PageConfig | undefined {
  const isEnabled = (p: PageConfig) => p.enabled !== false; // undefined → enabled

  const requested = pages.find(p =>
    slug === 'home' ? p.isHome : p.slug === slug,
  );

  if (requested && isEnabled(requested)) return requested;

  return pages.find(p => p.isHome && isEnabled(p));
}

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const hdrs                    = await headers();
  const host                    = hdrs.get('x-clinic-host') ?? '';
  const { page: slug = 'home' } = await searchParams;
  const identifier              = host.replace(/^www\./, '');

  const data = await getSiteData(identifier);
  if (!data) return { title: 'Clinic Website' };

  const { website, clinic } = data;
  const page = resolveActivePage(website.pages ?? [], slug);

  return buildSeoMetadata(
    website,
    clinic,
    page
      ? {
          title:       page.title,
          description: page.seo?.description ?? undefined,
          slug:        page.slug,
          isHome:      page.isHome,
        }
      : undefined,
  );
}

export default async function CustomDomainPage({ searchParams }: PageProps) {
  const hdrs                    = await headers();
  const host                    = hdrs.get('x-clinic-host') ?? '';
  const { page: slug = 'home' } = await searchParams;

  if (!host) notFound();

  const identifier = host.replace(/^www\./, '');
  const data       = await getSiteData(identifier);
  if (!data) notFound();

  const { website, clinic, branches } = data;
  // Use the website's own subdomain for all public API calls inside sections
  const subdomain = website.subdomain ?? identifier;
  const domain    = getCanonicalDomain(website);
  const seo       = website.seo ?? {};

  // Resolve the active page with the corrected enabled logic
  const activePage = resolveActivePage(website.pages ?? [], slug);
  if (!activePage) notFound();

  // ── Schemas ────────────────────────────────────────────────────────────────
  const schemas: Record<string, any>[] = [];

  const clinicSchema = buildClinicSchema(website, clinic);
  if (Object.keys(clinicSchema).length > 0) schemas.push(clinicSchema);

  schemas.push(buildLocalBusinessSchema(website, clinic));

  if (!activePage.isHome) {
    schemas.push(buildBreadcrumbSchema([
      { name: clinic?.name ?? 'Home', url: `${domain}/` },
      { name: activePage.title,        url: `${domain}/${activePage.slug}` },
    ]));
  }

  const faqs = extractFaqsFromSections(activePage.sections ?? []);
  if (faqs.length > 0) schemas.push(buildFaqSchema(faqs));

  // Serialise initial data for the client renderer.
  // Pass the full pages array (all section settings, variants, etc. intact).
  const initialWebsite = {
    pages:          website.pages          ?? [],
    globalSettings: website.globalSettings ?? DEFAULT_GLOBAL_SETTINGS,
    theme:          website.theme          ?? DEFAULT_THEME,
    seo:            website.seo            ?? {},
    subdomain:      website.subdomain      ?? subdomain,
    isPublished:    (website as any).isPublished ?? false,
  };

  return (
    <>
      <AnalyticsScripts
        googleAnalyticsId={seo.googleAnalyticsId}
        googleTagManagerId={seo.googleTagManagerId}
        facebookPixelId={seo.facebookPixelId}
        googleSiteVerification={seo.googleSiteVerification}
        bingSiteVerification={seo.bingSiteVerification}
        yandexVerification={seo.yandexVerification}
      />

      <SchemaScript schema={schemas} />

      {/*
        LiveSiteRenderer is a 'use client' component.
        It renders the SSR-fetched data immediately (same visual output as before)
        AND re-fetches clinic/branches on mount for auto-sync,
        AND subscribes to BroadcastChannel so every builder change (variant, theme,
        section settings, nav, footer…) reflects here in real-time without a reload.
      */}
      <LiveSiteRenderer
        initialWebsite={initialWebsite}
        initialClinic={clinic ?? null}
        initialBranches={branches ?? []}
        slug={slug}
        subdomain={subdomain}
        isCustomDomain
      />
    </>
  );
}