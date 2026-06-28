export interface SiteData {
  content:     SiteContent;
  theme:       SiteTheme;
  seo:         SiteSEO;
  clinic:      ClinicInfo;
  isPublished: boolean;
  templateId:  string;
  subdomain:   string;
}

export interface SiteTheme {
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  fontHeading:    string;
  fontBody:       string;
}

export interface PageData {
  title:        string;
  enabled:      boolean;
  hasBooking:   boolean;
  headline?:    string;
  subheadline?: string;
  ctaText?:     string;
  content?:     string;
}

export interface SiteContent {
  hero:         { headline: string; subheadline: string; ctaText: string; backgroundImage?: string };
  about:        { title: string; description: string };
  services:     { title: string; description: string; icon: string }[];
  team:         { name: string; role: string; bio: string }[];
  testimonials: { name: string; text: string; rating: number }[];
  contact:      { address: string; phone: string; email: string; mapEmbed?: string };
  openingHours: Record<string, { start: string; end: string } | null>;
  gallery?:     string[];
  _blocks?:     { id: string; visible: boolean }[];
  _pages?:      Record<string, PageData>;
  _banners?:    { url: string; label: string }[];
  _doctorImages?: { name: string; url: string }[];
  _offers?:     { id: any; title: string; description: string; bannerUrl?: string; validFrom?: string; validTo?: string; showOnHome?: boolean }[];
  _logoUrl?:    string;
  _faviconUrl?: string;
}

export interface SiteSEO {
  title:              string;
  description:        string;
  keywords:           string[];
  googleAnalyticsId?: string;
  facebookPixelId?:   string;
}

export interface ClinicInfo {
  name:         string;
  phone?:       string;
  email?:       string;
  address?:     string;
  workingHours?: Record<string, any>;
}

export const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
export const DAY_LABELS: Record<string,string> = {
  monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday',
  thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday',
};
export const DAY_SHORT: Record<string,string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed',
  thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun',
};

export function fmtHours(h: { start: string; end: string } | null | undefined): string {
  if (!h) return 'Closed';
  const f = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    return `${hh % 12 || 12}${mm ? `:${String(mm).padStart(2,'0')}` : ''}${hh >= 12 ? 'PM' : 'AM'}`;
  };
  return `${f(h.start)} – ${f(h.end)}`;
}

export function getTodayKey(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

export function isVisible(data: SiteData, id: string): boolean {
  const blocks = data.content?._blocks;
  if (!blocks) return true;
  const found = blocks.find((b: any) => b.id === id);
  return found ? found.visible !== false : true;
}

export function getOpeningHours(data: SiteData) {
  return data.content?.openingHours || data.clinic?.workingHours || {};
}

/** Returns the enabled pages list for multi-page templates */
export function getEnabledPages(data: SiteData): { id: string; title: string }[] {
  const pages = data.content?._pages;
  const defaults = [
    { id: 'home',    title: 'Home' },
    { id: 'about',   title: 'About Us' },
    { id: 'doctors', title: 'Our Doctors' },
    { id: 'contact', title: 'Contact Us' },
  ];
  if (!pages) return defaults;
  return defaults.filter(p => pages[p.id]?.enabled !== false)
    .map(p => ({ id: p.id, title: pages[p.id]?.title || p.title }));
}