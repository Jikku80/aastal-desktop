'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PublicSiteLayout } from '../../components/PublicSiteLayout';
import { SitePageRenderer } from '../../components/SitePageRenderer';
import { websiteApi } from '@/lib/api/websiteApi';

interface SiteData {
  website: {
    pages:          any[];
    globalSettings: any;
    theme:          any;
    seo:            any;
    subdomain:      string;
    isPublished:    boolean;
  };
  clinic:   Record<string, any> | null;
  branches: Record<string, any>[];
}

export default function PreviewPage() {
  const params       = useParams<{ subdomain: string }>();
  const searchParams = useSearchParams();
  const slug         = searchParams.get('page') ?? 'home';

  const [data,  setData]  = useState<SiteData | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  // Keep latest slug in a ref so the message handler always uses the current value
  const slugRef = useRef(slug);
  useEffect(() => { slugRef.current = slug; }, [slug]);

  // Shared handler used by both BroadcastChannel and window.postMessage
  const applyUpdate = (payload: any) => {
    if (payload?.type !== 'BUILDER_UPDATE') return;
    const { pages, globalSettings, theme, seo, isPublished, clinic, branches } = payload;
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        // Allow builder to push live clinic/branch updates
        ...(clinic   !== undefined && { clinic:   clinic ?? null }),
        ...(branches !== undefined && { branches: branches ?? [] }),
        website: {
          ...prev.website,
          ...(pages          !== undefined && { pages }),
          ...(globalSettings !== undefined && { globalSettings }),
          ...(theme          !== undefined && { theme }),
          ...(seo            !== undefined && { seo }),
          ...(isPublished    !== undefined && { isPublished }),
        },
      };
    });
    setState('ready');
  };

  // Load initial data from API (authenticated preview endpoint)
  useEffect(() => {
    websiteApi.getPreview()
      .then((d: SiteData) => {
        if (!d) { setState('error'); return; }
        setData(d);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  // Listen for real-time updates from the builder
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('website-builder-sync');
      channel.onmessage = (event) => applyUpdate(event.data);
    } catch {
      // BroadcastChannel not supported — fall back to postMessage only
    }

    const onMessage = (event: MessageEvent) => applyUpdate(event.data);
    window.addEventListener('message', onMessage);

    // Request a fresh broadcast from the builder
    try {
      const reqChannel = new BroadcastChannel('website-builder-sync');
      reqChannel.postMessage({ type: 'REQUEST_PREVIEW_SYNC' });
      reqChannel.close();
    } catch {}

    return () => {
      channel?.close();
      window.removeEventListener('message', onMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', color: '#6b7280',
      }}>
        Loading preview…
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', flexDirection: 'column', gap: 12,
      }}>
        <p style={{ color: '#dc2626', fontWeight: 600 }}>Preview unavailable</p>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Your session may have expired. Please sign in to the dashboard and try again.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => window.location.href = '/auth/login'}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#027cc6', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => window.close()}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { website, clinic, branches } = data;

  // Resolve the active page — respect enabled flag
  const pageConf =
    (website.pages ?? []).find((p: any) =>
      slug === 'home' ? (p.isHome && p.enabled !== false) : (p.slug === slug && p.enabled !== false),
    ) ??
    (website.pages ?? []).find((p: any) => p.isHome && p.enabled !== false) ??
    (website.pages ?? []).find((p: any) => p.enabled !== false) ??
    website.pages?.[0];

  return (
    <>
      {/* Preview banner */}
      <div style={{
        position:   'fixed',
        top:        0,
        left:       0,
        right:      0,
        zIndex:     9999,
        background: '#1e1b4b',
        color:      '#c7d2fe',
        fontSize:   13,
        fontWeight: 500,
        fontFamily: 'system-ui, sans-serif',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding:    '8px 20px',
        boxShadow:  '0 2px 8px rgba(0,0,0,0.3)',
        gap:        12,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: '#4338ca', color: '#e0e7ff',
            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            Live Preview
          </span>
          {website.isPublished
            ? 'This site is live.'
            : 'Draft — edits appear here in real-time.'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.close()}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(165,180,252,0.3)',
              background: 'transparent', color: '#a5b4fc', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
            }}
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Offset the banner */}
      <div style={{ paddingTop: 38 }}>
        {pageConf ? (
          <PublicSiteLayout
            globalSettings={website.globalSettings}
            theme={website.theme}
            pages={(website.pages ?? []).filter((p: any) => p.enabled)}
            subdomain={params.subdomain}
            clinic={clinic ?? null}
            basePath={`/site/${params.subdomain}/preview`}
          >
            <SitePageRenderer
              page={pageConf}
              theme={website.theme}
              subdomain={params.subdomain}
              clinic={clinic ?? null}
              branches={branches ?? []}
              isPreview={true}
            />
          </PublicSiteLayout>
        ) : (
          <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#6b7280', fontFamily: 'system-ui, sans-serif',
          }}>
            No pages configured yet. Add sections in the builder.
          </div>
        )}
      </div>
    </>
  );
}