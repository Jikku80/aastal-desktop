import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Docker production image (copies only what's needed)
  output: 'standalone',

  // Allow images from any clinic's custom domain + our CDN / S3
  images: {
    remotePatterns: [
      // Your own backend uploads
      {
        protocol: 'https',
        hostname: 'api.clinickarobar.com',
        pathname: '/uploads/**',
      },
      // Common image CDNs clinics might use
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      // Wildcard for any custom domain (Next ≥ 13.4 supports this)
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security & caching headers for public clinic sites
  async headers() {
    return [
      {
        // Public clinic pages: security headers + CSP
        source: '/site/:path*',
        headers: [
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          // CSP: restrict scripts to self; images from any https; no inline scripts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",   // Next.js needs unsafe-inline
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' https: data: blob:",   // allow any https image
              "connect-src 'self' https://app.clinickarobar.com https://api.clinickarobar.com https://*.clinickarobar.com https://nominatim.openstreetmap.org",
              "frame-src https://www.google.com https://maps.google.com https://www.openstreetmap.org",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // Dashboard: stricter no-external-scripts policy
        source: '/(app)/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options',         value: 'DENY' },
        ],
      },
    ];
  },

  // Redirect root domain hits to the app subdomain
  async redirects() {
    return [
      // If someone hits clinickarobar.com/ directly, redirect to app
      // (only in production — keep localhost free)
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source:      '/',
              has: [{ type: 'host' as const, value: 'clinickarobar.com' }],
              destination: 'https://app.clinickarobar.com',
              permanent:   false,
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
