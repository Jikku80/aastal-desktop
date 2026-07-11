/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_USER_FRONTEND_URL — URL of the user-facing patient portal frontend
// e.g. https://app.clinickarobar.com  (no trailing slash)
// Used by LoginSection.tsx in the website-builder public site renderer.
const nextConfig = {
  output: 'standalone', 

  // ── Compression ─────────────────────────────────────────────────────────────
  compress: true,

  // ── Remove X-Powered-By header (minor hardening) ─────────────────────────────
  poweredByHeader: false,

  // ── Images ───────────────────────────────────────────────────────────────────
  images: {
    // NOTE: next.config.ts (now deleted as part of merging the two
    // conflicting configs) had a much broader `{ protocol: 'https', hostname: '**' }`
    // wildcard pattern here, allowing any https image host. Kept this
    // file's narrower explicit allowlist instead rather than silently
    // widening it — add specific hostnames back if clinics need other
    // image CDNs that aren't in this list.
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com'          },
      { protocol: 'https', hostname: '**.cloudinary.com'         },
      { protocol: 'https', hostname: 'res.cloudinary.com'        },
      { protocol: 'https', hostname: '**.supabase.co'            },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.digitaloceanspaces.com' },
      { protocol: 'https', hostname: '**.googleapis.com'         },
      { protocol: 'https', hostname: '**.unsplash.com'           },
    ],
    formats:          ['image/avif', 'image/webp'],
    deviceSizes:      [640, 750, 828, 1080, 1200, 1920],
    imageSizes:       [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL:  3600,
  },

  // ── Headers ───────────────────────────────────────────────────────────────────
  async headers() {
    return [
      // Sitemap — cache 1 hour, stale-while-revalidate 24 hours
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'Content-Type',  value: 'application/xml; charset=utf-8' },
        ],
      },
      // robots.txt — cache 24 hours
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' },
          { key: 'Content-Type',  value: 'text/plain; charset=utf-8' },
        ],
      },
      // Security + performance headers on all clinic site pages
      {
        source: '/site/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff'                        },
          { key: 'X-Frame-Options',          value: 'SAMEORIGIN'                     },
          { key: 'X-XSS-Protection',         value: '1; mode=block'                  },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin'},
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
          // ISR-friendly caching for SSR pages
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=600' },
          // CSP — ported from next.config.ts during the Electron-migration
          // config merge (Next.js disallows both .js and .ts configs
          // existing simultaneously; this repo had both, with diverging
          // content — see PR notes). Confirm the connect-src allowlist
          // still matches your actual domains; *.clinickarobar.com and the
          // OSM/Google Maps entries were carried over as-is from the .ts file.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' https://app.clinickarobar.com https://www.clinickarobar.com https://api.clinickarobar.com https://*.clinickarobar.com https://nominatim.openstreetmap.org http://localhost:4000",
              "frame-src https://www.google.com https://maps.google.com https://www.openstreetmap.org",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Dashboard: stricter no-external-scripts policy (ported from next.config.ts)
      {
        source: '/(app)/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options',         value: 'DENY' },
        ],
      },
      // Immutable cache for Next.js static assets
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // ── Redirects: trailing slash normalisation ───────────────────────────────────
  async redirects() {
    return [
      {
        source:      '/site/:subdomain/blog/',
        destination: '/site/:subdomain/blog',
        permanent:   true,
      },
      {
        source:      '/site/:subdomain/blog/:slug/',
        destination: '/site/:subdomain/blog/:slug',
        permanent:   true,
      },
      // Root-domain → app subdomain redirect, ported from next.config.ts.
      // Skipped outside production (and effectively a no-op in the
      // Electron-packaged app, which never serves on clinickarobar.com).
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source:      '/',
              has: [{ type: 'host', value: 'clinickarobar.com' }],
              destination: 'https://app.clinickarobar.com',
              permanent:   false,
            },
          ]
        : []),
    ];
  },

  // ── Rewrites: proxy sitemap/robots for subdomain sites ───────────────────────
  // (Custom-domain rewrites are handled in middleware.ts instead)
  async rewrites() {
    const apiBase = (
      process.env.API_URL ?? 'http://localhost:4000'
    ).replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');

    return {
      beforeFiles: [
        // ── Proxy all /api/v1/* → backend (fixes 404 on /blog, /seo/*, etc.) ──
        {
          source:      '/api/v1/:path*',
          destination: `${apiBase}/api/v1/:path*`,
        },
      ],
      afterFiles:  [],
      fallback: [
        // Subdomain sitemap
        {
          source:      '/sitemap.xml',
          destination: `${apiBase}/api/v1/seo/:subdomain/sitemap.xml`,
          has: [
            { type: 'host', value: '(?<subdomain>[^.]+)\\.clinickarobar\\.com' },
          ],
        },
        // Subdomain robots.txt
        {
          source:      '/robots.txt',
          destination: `${apiBase}/api/v1/seo/:subdomain/robots.txt`,
          has: [
            { type: 'host', value: '(?<subdomain>[^.]+)\\.clinickarobar\\.com' },
          ],
        },
      ],
    };
  },
};

module.exports = nextConfig;