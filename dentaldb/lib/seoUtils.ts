/**
 * lib/seoUtils.ts
 * All client + server-side SEO helpers consumed by every clinic site page.
 * No external dependencies — safe for both Server and Client components.
 *
 * Single source of truth for shared types. Components import from here,
 * never the other way around.
 */

import type { Metadata } from 'next';

// ── Re-export builder types so consumers can import from one place ─────────────
export type {
  ThemeConfig,
  GlobalSettings,
  PageConfig,
  SectionConfig,
  NavVariant,
  FooterVariant,
} from '@/components/website-builder/hooks/useBuilderState';

import type {
  ThemeConfig,
  GlobalSettings,
  PageConfig,
  SectionConfig,
} from '@/components/website-builder/hooks/useBuilderState';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface SeoConfig {
  title?:                  string;
  description?:            string;
  keywords?:               string[];
  ogImage?:                string;
  googleAnalyticsId?:      string;
  googleTagManagerId?:     string;
  facebookPixelId?:        string;
  googleSiteVerification?: string;
  bingSiteVerification?:   string;
  yandexVerification?:     string;
  city?:                   string;
  country?:                string;
  latitude?:               number;
  longitude?:              number;
  clinicType?:             string;
  favicon?:                string; 
  aggregateRating?: {
    ratingValue: number;
    reviewCount:  number;
  };
  noindex?:         boolean;
  canonicalDomain?: string;
}

export interface WebsiteData {
  seo?:            SeoConfig | null;
  subdomain:       string;
  customDomain?:   string | null;
  isPublished?:    boolean;
  pages?:          PageConfig[];
  globalSettings?: GlobalSettings | null;
  theme?:          ThemeConfig | null;
}

export interface ClinicData {
  name:          string;
  phone?:        string | null;
  email?:        string | null;
  address?:      string | null;
  city?:         string | null;
  logo?:         string | null;
  website?:      string | null;
  workingHours?: Record<string, { start: string; end: string } | null> | null;
}

export interface PageSeoInput {
  title?:       string;
  description?: string;
  slug:         string;
  isHome:       boolean;
}

export interface FaqItem {
  question: string;
  answer:   string;
}

export interface BreadcrumbItem {
  name: string;
  url:  string;
}

export interface BlogPostSeoData {
  title:               string;
  slug:                string;
  excerpt:             string | null;
  featuredImage:       string | null;
  publishedAt:         string | null;
  updatedAt:           string | null;
  authorName:          string | null;
  readingTimeMinutes:  number;
  tags:                string[] | null;
  metaTitle:           string | null;
  metaDescription:     string | null;
  metaKeywords:        string[] | null;
  indexable:           boolean | null;
}

export interface TocEntry {
  id:    string;
  text:  string;
  level: 2 | 3;
}

// ── Default fallbacks (exported for use in pages) ─────────────────────────────

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor:    '#0ea5e9',
  secondaryColor:  '#6366f1',
  accentColor:     '#f59e0b',
  backgroundColor: '#ffffff',
  textColor:       '#111827',
  fontHeading:     'Poppins',
  fontBody:        'Inter',
  borderRadius:    'md',
  buttonStyle:     'filled',
  spacing:         'normal',
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  nav: {
    sticky:      true,
    transparent: true,
    variant:     'classic',
    links:       [],
    ctaButton:   { text: 'Book Appointment', action: 'book' },
  },
  footer: {
    tagline:       'Quality healthcare.',
    variant:       'classic',
    columns:       [],
    showSocials:   true,
    showPoweredBy: true,
    copyrightText: `© ${new Date().getFullYear()}`,
  },
};

// ── Canonical domain resolution ───────────────────────────────────────────────

export function getCanonicalDomain(website: WebsiteData): string {
  const override = website.seo?.canonicalDomain;
  if (override) {
    return `https://${override.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
  if (website.customDomain) {
    return `https://${website.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'clinickarobar.com';
  return `https://${website.subdomain}.${base}`;
}

// ── Build Next.js Metadata ────────────────────────────────────────────────────

export function buildSeoMetadata(
  website: WebsiteData,
  clinic:  ClinicData | null,
  page?:   PageSeoInput,
): Metadata {
  const seo        = website.seo ?? {};
  const domain     = getCanonicalDomain(website);
  const clinicName = clinic?.name ?? 'Clinic';
  const city       = clinic?.city ?? seo.city ?? '';

  const autoTitle = page
    ? page.isHome
      ? `${clinicName}${city ? ` — ${city}` : ''}`
      : `${page.title} | ${clinicName}${city ? `, ${city}` : ''}`
    : `${clinicName}${city ? ` — ${city}` : ''}`;

  const title = page?.title
    ? (page.isHome ? autoTitle : `${page.title} | ${clinicName}${city ? `, ${city}` : ''}`)
    : seo.title ?? autoTitle;

  const autoDesc = page && !page.isHome
    ? `${page.title} at ${clinicName}${city ? ` in ${city}` : ''}. Professional healthcare services. Book an appointment online.`
    : `${clinicName}${city ? ` in ${city}` : ''} — professional healthcare services. Book your appointment online today.`;

  const description = page?.description ?? seo.description ?? autoDesc;

  const keywordsArr: string[] = seo.keywords?.length
    ? seo.keywords
    : [
        clinicName,
        city ? `clinic ${city}` : '',
        city ? `doctor ${city}` : '',
        city ? `${clinicName} ${city}` : '',
      ].filter(Boolean);

  const canonicalPath = !page || page.isHome ? '/' : `/${page.slug}`;
  const canonical     = `${domain}${canonicalPath}`;
  const ogImage       = seo.ogImage ?? clinic?.logo ?? '';
  const allowIndex    = !seo.noindex && !!(website.isPublished);

  const metadata: Metadata = {
    title,
    description,
    keywords:   keywordsArr.join(', '),
    alternates: { canonical },
    openGraph: {
      type:        'website',
      siteName:    clinicName,
      title,
      description,
      url:         canonical,
      locale:      'en_US',
      ...(ogImage
        ? { images: [{ url: ogImage, alt: clinicName, width: 1200, height: 630 }] }
        : {}),
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index:  allowIndex,
      follow: allowIndex,
      googleBot: {
        index:               allowIndex,
        follow:              allowIndex,
        'max-image-preview': 'large',
        'max-snippet':        -1,
        'max-video-preview':  -1,
      },
    },
  };

  const verification: Record<string, string> = {};
  if (seo.googleSiteVerification) verification.google = seo.googleSiteVerification;
  if (seo.yandexVerification)     verification.yandex = seo.yandexVerification;
  if (seo.bingSiteVerification) {
    (verification as any).other = { 'msvalidate.01': seo.bingSiteVerification };
  }
  if (Object.keys(verification).length) {
    metadata.verification = verification as Metadata['verification'];
  }

  // Favicon — set from seo.favicon (uploaded by clinic), fallback to default
  const API_BASE = (() => {
    const raw = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';
    return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  })();

  const resolveFavicon = (url: string | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('/uploads/') || url.startsWith('/public/')) return `${API_BASE}${url}`;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return undefined;
  };

  const faviconUrl = resolveFavicon(seo.favicon) ?? resolveFavicon((website as any).favicon);
  if (faviconUrl) {
    const ext = faviconUrl.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/x-icon';
    metadata.icons = {
      icon:     [{ url: faviconUrl, type: mime }],
      shortcut: [{ url: faviconUrl, type: mime }],
      apple:    [{ url: faviconUrl, type: mime }],
    };
  }

  return metadata;
}

// ── Schema.org: MedicalClinic ─────────────────────────────────────────────────

export function buildClinicSchema(
  website: WebsiteData,
  clinic:  ClinicData | null,
): Record<string, any> {
  if (!clinic) return {};

  const seo    = website.seo ?? {};
  const domain = getCanonicalDomain(website);
  const type   = seo.clinicType ?? 'MedicalClinic';

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type':    type,
    '@id':      `${domain}/#clinic`,
    name:       clinic.name,
    url:        domain,
  };

  if (clinic.phone)   schema.telephone = clinic.phone;
  if (clinic.email)   schema.email     = clinic.email;
  if (clinic.website) schema.sameAs    = [clinic.website];
  if (clinic.logo) {
    schema.logo  = { '@type': 'ImageObject', url: clinic.logo };
    schema.image = clinic.logo;
  }

  const city    = clinic.city ?? seo.city ?? '';
  const country = seo.country ?? 'NP';
  if (clinic.address || city) {
    schema.address = {
      '@type':         'PostalAddress',
      streetAddress:   clinic.address ?? '',
      addressLocality: city,
      addressCountry:  country,
    };
  }

  if (seo.latitude && seo.longitude) {
    schema.geo = {
      '@type':   'GeoCoordinates',
      latitude:  seo.latitude,
      longitude: seo.longitude,
    };
    schema.hasMap = `https://www.google.com/maps?q=${seo.latitude},${seo.longitude}`;
  }

  if (seo.aggregateRating?.ratingValue && seo.aggregateRating?.reviewCount) {
    schema.aggregateRating = {
      '@type':     'AggregateRating',
      ratingValue: seo.aggregateRating.ratingValue,
      reviewCount: seo.aggregateRating.reviewCount,
      bestRating:  5,
      worstRating: 1,
    };
  }

  if (clinic.workingHours) {
    const dayMap: Record<string, string> = {
      monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
      thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
      sunday: 'Sunday',
    };
    const hours = Object.entries(clinic.workingHours)
      .filter(([day, slot]) => slot !== null && dayMap[day])
      .map(([day, slot]) => ({
        '@type':    'OpeningHoursSpecification',
        dayOfWeek:  `https://schema.org/${dayMap[day]}`,
        opens:      slot!.start,
        closes:     slot!.end,
      }));
    if (hours.length) schema.openingHoursSpecification = hours;
  }

  const socials    = website.globalSettings?.footer?.socials ?? {};
  const socialUrls = Object.values(socials).filter(
    (v): v is string => typeof v === 'string' && v.startsWith('http'),
  );
  if (socialUrls.length) {
    schema.sameAs = [...(schema.sameAs ?? []), ...socialUrls];
  }

  schema.potentialAction = {
    '@type': 'ReserveAction',
    target:  `${domain}/appointment`,
    name:    'Book Appointment',
  };

  return schema;
}

// ── Schema.org: Physician ─────────────────────────────────────────────────────

export function buildDoctorSchema(
  doctor: {
    id:              string;
    name:            string;
    avatar?:         string | null;
    bio?:            string | null;
    specialization?: string | null;
  },
  clinicSchemaId: string,
  domain:         string,
): Record<string, any> {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type':    'Physician',
    '@id':      `${domain}/doctors#doctor-${doctor.id}`,
    name:       doctor.name,
    url:        `${domain}/doctors#doctor-${doctor.id}`,
    worksFor:   { '@id': clinicSchemaId },
  };
  if (doctor.avatar)         schema.image            = doctor.avatar;
  if (doctor.bio)            schema.description      = doctor.bio;
  if (doctor.specialization) schema.medicalSpecialty = doctor.specialization;
  return schema;
}

// ── Schema.org: LocalBusiness ─────────────────────────────────────────────────

export function buildLocalBusinessSchema(
  website: WebsiteData,
  clinic:  ClinicData | null,
): Record<string, any> {
  const base = buildClinicSchema(website, clinic);
  if (!base['@type']) return base;
  return { ...base, '@type': ['LocalBusiness', base['@type'] as string] };
}

// ── Schema.org: FAQPage ───────────────────────────────────────────────────────

export function buildFaqSchema(faqs: FaqItem[]): Record<string, any> {
  if (!faqs?.length) return {};
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type':          'Question',
      name:             f.question,
      acceptedAnswer:   { '@type': 'Answer', text: f.answer },
    })),
  };
}

// ── Schema.org: BreadcrumbList ────────────────────────────────────────────────

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      item.name,
      item:      item.url,
    })),
  };
}

// ── Schema.org: BlogPosting ───────────────────────────────────────────────────

export function buildBlogPostSchema(
  post:         BlogPostSeoData,
  domain:       string,
  clinicName?:  string,
): Record<string, any> {
  return {
    '@context':    'https://schema.org',
    '@type':       'BlogPosting',
    headline:      post.title,
    description:   post.excerpt ?? post.metaDescription ?? '',
    url:           `${domain}/blog/${post.slug}`,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified:  post.updatedAt   ? new Date(post.updatedAt).toISOString()   : undefined,
    author: {
      '@type': 'Person',
      name:    post.authorName ?? clinicName ?? 'Clinic Team',
    },
    publisher: {
      '@type': 'Organization',
      name:    clinicName ?? 'Clinic',
      '@id':   domain,
    },
    ...(post.featuredImage
      ? { image: { '@type': 'ImageObject', url: post.featuredImage } }
      : {}),
    keywords:     [...(post.metaKeywords ?? []), ...(post.tags ?? [])].join(', ') || undefined,
    inLanguage:   'en',
    timeRequired: post.readingTimeMinutes ? `PT${post.readingTimeMinutes}M` : undefined,
  };
}

// ── Schema.org: Article ───────────────────────────────────────────────────────

export function buildArticleSchema(
  post:        BlogPostSeoData,
  domain:      string,
  clinicName?: string,
): Record<string, any> {
  return { ...buildBlogPostSchema(post, domain, clinicName), '@type': 'Article' };
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

export function normalizeCanonical(url: string): string {
  if (url === '/') return url;
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// ── FAQ extraction ────────────────────────────────────────────────────────────

export function extractFaqsFromSections(sections: SectionConfig[]): FaqItem[] {
  return sections
    .filter(s => s.type === 'faq')
    .flatMap(s => (s.settings?.items as FaqItem[] | undefined) ?? [])
    .filter(f => f.question && f.answer);
}

// ── Table of contents ─────────────────────────────────────────────────────────

export function buildTableOfContents(html: string): TocEntry[] {
  const toc: TocEntry[] = [];
  const re = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = parseInt(m[1], 10) as 2 | 3;
    const text  = m[2].replace(/<[^>]+>/g, '').trim();
    const id    = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);
    if (text) toc.push({ id, text, level });
  }
  return toc;
}

// ── Local SEO keywords ────────────────────────────────────────────────────────

export function buildLocalKeywords(
  clinicName:   string,
  city:         string,
  services?:    string[],
  specialties?: string[],
): string[] {
  const base = [
    clinicName,
    city,
    `${clinicName} ${city}`,
    `clinic ${city}`,
    `doctor ${city}`,
    `hospital ${city}`,
    `best clinic ${city}`,
    `book appointment ${city}`,
  ];
  const serviceKw = (services    ?? []).flatMap(s => [s, `${s} ${city}`, `${s} clinic`]);
  const specKw    = (specialties ?? []).flatMap(s => [s, `${s} doctor ${city}`]);
  return Array.from(new Set([...base, ...serviceKw, ...specKw])).filter(Boolean);
}