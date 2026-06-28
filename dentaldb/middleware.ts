/**
 * middleware.ts
 *
 * Responsibilities:
 *  1. Route /sitemap.xml and /robots.txt to the backend SEO API
 *  2. Custom-domain → /site/custom-domain?page=<slug> rewrites with x-clinic-host header
 *  3. Subdomain → /site/[subdomain]?page=<slug> rewrites
 *  4. Blog path routing for both subdomain and custom-domain sites
 *  5. Trailing slash 301 normalisation
 *
 * NOTE: Custom domains are routed to /site/custom-domain (not /site/_custom).
 * Next.js does not serve routes inside underscore-prefixed folders (_custom) —
 * they are treated as private/non-routable, which causes nginx to receive a 404.
 * /site/_custom is kept as a private utility folder; /site/custom-domain is the
 * actual route that nginx + Next.js will serve.
 */

import { NextResponse, type NextRequest } from 'next/server';

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'clinickarobar.com';
const API_BASE = (() => {
  const raw = process.env.API_URL ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

/** Convert a URL pathname to a page slug for ?page= routing */
function pathToPageSlug(pathname: string): string {
  // Strip leading slash; empty means home
  const slug = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!slug || slug === 'home') return 'home';
  return slug;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname, search, searchParams } = req.nextUrl;
  const rawHost  = req.headers.get('host') ?? '';
  const hostname = rawHost.replace(/:\d+$/, ''); // strip port for local dev

  // ── Pass through internal Next.js & static paths ──────────────────────────
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/')   ||
    pathname === '/favicon.ico'    ||
    pathname === '/manifest.json'  ||
    pathname === '/manifest.webmanifest' ||
    pathname.includes('.')  // static files (images, fonts etc)
  ) {
    return NextResponse.next();
  }

  // ── Main app / admin domain — pass through ─────────────────────────────────
  const isMainDomain =
    hostname === SITE_DOMAIN ||
    hostname === `www.${SITE_DOMAIN}` ||
    hostname === `app.${SITE_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (isMainDomain) {
    return NextResponse.next();
  }

  // ── Subdomain clinic sites (e.g. myclinic.clinickarobar.com) ───────────────
  if (hostname.endsWith(`.${SITE_DOMAIN}`)) {
    const subdomain = hostname
      .replace(`.${SITE_DOMAIN}`, '')
      .replace(/^www\./, '');

    if (!subdomain) return NextResponse.next();

    // Trailing slash normalisation
    if (pathname !== '/' && pathname.endsWith('/')) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(0, -1);
      return NextResponse.redirect(url, 301);
    }

    // Route sitemap.xml & robots.txt to backend
    if (pathname === '/sitemap.xml') {
      return NextResponse.rewrite(
        new URL(`${API_BASE}/api/v1/seo/${subdomain}/sitemap.xml`),
      );
    }
    if (pathname === '/robots.txt') {
      return NextResponse.rewrite(
        new URL(`${API_BASE}/api/v1/seo/${subdomain}/robots.txt`),
      );
    }

    // Blog routes
    if (pathname === '/blog' || pathname.startsWith('/blog/')) {
      const slug = pathname.replace(/^\/blog\/?/, '');
      const newPath = slug
        ? `/site/${subdomain}/blog/${slug}`
        : `/site/${subdomain}/blog`;
      return NextResponse.rewrite(new URL(`${newPath}${search}`, req.url));
    }

    // Convert path-based navigation to ?page= for subdomain sites
    const pageSlug = pathToPageSlug(pathname);
    const targetUrl = new URL(`/site/${subdomain}`, req.url);
    if (pageSlug !== 'home') {
      targetUrl.searchParams.set('page', pageSlug);
    }
    // Preserve any existing search params (except page which we set above)
    searchParams.forEach((value, key) => {
      if (key !== 'page') targetUrl.searchParams.set(key, value);
    });
    return NextResponse.rewrite(targetUrl);
  }

  // ── Custom domain sites ────────────────────────────────────────────────────
  // Route to /site/custom-domain (NOT /site/_custom — underscore-prefixed
  // folders are non-routable in Next.js and will 404 from nginx).
  const identifier = hostname.replace(/^www\./, '');

  // Trailing slash normalisation
  if (pathname !== '/' && pathname.endsWith('/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 301);
  }

  // Sitemap & robots → backend
  if (pathname === '/sitemap.xml') {
    return NextResponse.rewrite(
      new URL(`${API_BASE}/api/v1/seo/${identifier}/sitemap.xml`),
    );
  }
  if (pathname === '/robots.txt') {
    return NextResponse.rewrite(
      new URL(`${API_BASE}/api/v1/seo/${identifier}/robots.txt`),
    );
  }

  // Blog routes on custom domain
  if (pathname === '/blog' || pathname.startsWith('/blog/')) {
    const slug = pathname.replace(/^\/blog\/?/, '');
    const newPath = slug
      ? `/site/custom-domain/blog/${slug}`
      : `/site/custom-domain/blog`;
    const res = NextResponse.rewrite(new URL(`${newPath}${search}`, req.url));
    res.headers.set('x-clinic-host', hostname);
    return res;
  }

  // Convert path-based navigation to ?page= for custom domain sites
  // e.g. /doctors → /site/custom-domain?page=doctors
  //      /team    → /site/custom-domain?page=team
  //      /        → /site/custom-domain (home)
  const pageSlug = pathToPageSlug(pathname);
  const targetUrl = new URL('/site/custom-domain', req.url);
  if (pageSlug !== 'home') {
    targetUrl.searchParams.set('page', pageSlug);
  }
  // Preserve any existing search params (except page)
  searchParams.forEach((value, key) => {
    if (key !== 'page') targetUrl.searchParams.set(key, value);
  });

  const res = NextResponse.rewrite(targetUrl);
  res.headers.set('x-clinic-host', hostname);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
