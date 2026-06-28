/**
 * Drop-in replacement for the SeoConfig interface in
 * backend/src/website-builder/entities/clinic-website.entity.ts
 *
 * Replace the existing SeoConfig interface with this one.
 * The JSONB column already exists — no migration needed for this.
 */
export interface SeoConfig {
  // ── Core meta ──────────────────────────────────────────────────────────────
  title?:        string;
  description?:  string;
  keywords?:     string[];
  ogImage?:      string;

  // ── Analytics & Tag Manager ───────────────────────────────────────────────
  googleAnalyticsId?:  string; // G-XXXXXXXXXX or UA-XXXXXXXXX-X
  googleTagManagerId?: string; // GTM-XXXXXXX
  facebookPixelId?:    string;

  // ── Search Console / Webmaster verification ───────────────────────────────
  googleSiteVerification?: string; // content value for <meta name="google-site-verification">
  bingSiteVerification?:   string; // msvalidate.01
  yandexVerification?:     string;

  // ── Local SEO ─────────────────────────────────────────────────────────────
  city?:        string;
  country?:     string; // ISO 3166-1 alpha-2, e.g. "NP"
  latitude?:    number;
  longitude?:   number;

  /** Schema.org @type for the clinic — defaults to MedicalClinic */
  clinicType?: 'MedicalClinic' | 'Dentist' | 'Optician' | 'Pharmacy' | 'Physiotherapist';

  // ── Ratings ───────────────────────────────────────────────────────────────
  aggregateRating?: {
    ratingValue: number;
    reviewCount:  number;
  };

  // ── Technical ─────────────────────────────────────────────────────────────
  /** Block all bots site-wide (staging override or manual noindex) */
  noindex?: boolean;

  /**
   * If set, overrides the auto-computed canonical domain.
   * Do NOT include trailing slash or scheme — e.g. "www.myclinic.com"
   */
  canonicalDomain?: string;
}
