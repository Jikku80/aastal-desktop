'use client';

/**
 * LiveSiteRenderer
 *
 * A client component that:
 * 1. Accepts initial SSR-fetched site data as props (for SEO + first paint)
 * 2. Re-fetches clinic + branches from the public API on mount so they are
 *    always fresh (auto-sync). The SSR data is used for the first paint and
 *    as fallback if the fetch fails.
 * 3. Subscribes to BroadcastChannel('website-builder-sync') AND window.postMessage
 *    so that ALL changes made in the builder editor (section variant, theme,
 *    globalSettings, sections reorder, etc.) propagate immediately to:
 *      - the preview page
 *      - the subdomain public page
 *      - the _custom / custom-domain pages
 */

import React, { useEffect, useState, useRef } from 'react';
import { PublicSiteLayout } from './PublicSiteLayout';
import { SitePageRenderer } from './SitePageRenderer';

interface SiteData {
  pages:          any[];
  globalSettings: any;
  theme:          any;
  seo:            any;
  subdomain:      string;
  isPublished:    boolean;
}

interface LiveSiteRendererProps {
  /** Initial data fetched server-side (SSR) */
  initialWebsite:  SiteData;
  initialClinic:   Record<string, any> | null;
  initialBranches: Record<string, any>[];
  /** Which page slug to render ('home' or a path slug) */
  slug:            string;
  /** subdomain string used for API calls inside sections */
  subdomain:       string;
  /** Show custom-domain nav/footer links without subdomain prefix */
  isCustomDomain?: boolean;
  /** Base path for nav links (e.g. '/site/myclinic') */
  basePath?:       string;
  /** Whether this is a preview pane (shows preview banner) */
  isPreview?:      boolean;
}

/** Resolve public API base — strips /api/v1 suffix if present */
function getApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
}

export function LiveSiteRenderer({
  initialWebsite,
  initialClinic,
  initialBranches,
  slug,
  subdomain,
  isCustomDomain,
  basePath,
  isPreview,
}: LiveSiteRendererProps) {
  const [website,  setWebsite]  = useState<SiteData>(initialWebsite);
  const [clinic,   setClinic]   = useState(initialClinic);
  const [branches, setBranches] = useState(initialBranches);
  const channelRef              = useRef<BroadcastChannel | null>(null);

  // ── Auto-sync: re-fetch clinic + branches on client mount ─────────────────
  useEffect(() => {
    if (!subdomain) return;
    const apiBase = getApiBase();

    // Fetch the full public payload to keep clinic & branches in sync
    fetch(`${apiBase}/api/v1/website-builder/public/${subdomain}`, {
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : null))
      .then((payload: { website?: any; clinic?: any; branches?: any[] } | null) => {
        if (!payload) return;
        if (payload.clinic   !== undefined) setClinic(payload.clinic   ?? null);
        if (payload.branches !== undefined) setBranches(payload.branches ?? []);
        // Also pull in any pages/settings updates from the server
        if (payload.website) {
          setWebsite(prev => ({
            ...prev,
            pages:          payload.website.pages          ?? prev.pages,
            globalSettings: payload.website.globalSettings ?? prev.globalSettings,
            theme:          payload.website.theme          ?? prev.theme,
            seo:            payload.website.seo            ?? prev.seo,
            isPublished:    payload.website.isPublished    ?? prev.isPublished,
          }));
        }
      })
      .catch(() => {/* silently keep SSR data */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  // ── Builder real-time sync ────────────────────────────────────────────────
  useEffect(() => {
    // BroadcastChannel (same-origin tabs, e.g. builder + public page in same browser)
    try {
      const ch = new BroadcastChannel('website-builder-sync');
      channelRef.current = ch;

      ch.onmessage = (event: MessageEvent) => {
        if (event.data?.type !== 'BUILDER_UPDATE') return;
        applyUpdate(event.data);
      };
    } catch {
      // BroadcastChannel not supported — fall back to postMessage only
    }

    // postMessage (iframe embed or cross-origin preview window)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'BUILDER_UPDATE') return;
      applyUpdate(event.data);
    };
    window.addEventListener('message', onMessage);

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
      window.removeEventListener('message', onMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyUpdate(data: any) {
    setWebsite(prev => ({
      ...prev,
      pages:          data.pages          ?? prev.pages,
      globalSettings: data.globalSettings ?? prev.globalSettings,
      theme:          data.theme          ?? prev.theme,
      seo:            data.seo            ?? prev.seo,
      isPublished:    data.isPublished    ?? prev.isPublished,
    }));
    // Allow builder to push updated clinic/branches too (for preview)
    if (data.clinic   !== undefined) setClinic(data.clinic   ?? null);
    if (data.branches !== undefined) setBranches(data.branches ?? []);
  }

  // Resolve the active page
  const activePage =
    (website.pages ?? []).find((p: any) =>
      (slug === 'home' ? p.isHome : p.slug === slug) && p.enabled !== false,
    ) ??
    (website.pages ?? []).find((p: any) => p.isHome && p.enabled !== false) ??
    (website.pages ?? []).find((p: any) => p.enabled !== false) ??
    (website.pages ?? [])[0];

  if (!activePage) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#6b7280', fontFamily: 'system-ui, sans-serif',
      }}>
        No pages configured yet.
      </div>
    );
  }

  return (
    <PublicSiteLayout
      globalSettings={website.globalSettings}
      theme={website.theme}
      pages={(website.pages ?? []).filter((p: any) => p.enabled)}
      subdomain={subdomain}
      clinic={clinic ?? null}
      isCustomDomain={isCustomDomain}
      basePath={basePath}
    >
      <SitePageRenderer
        page={activePage}
        theme={website.theme}
        subdomain={subdomain}
        clinic={clinic ?? null}
        branches={branches ?? []}
        isPreview={isPreview}
      />
    </PublicSiteLayout>
  );
}