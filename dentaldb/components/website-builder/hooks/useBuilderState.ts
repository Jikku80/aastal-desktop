import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SectionType =
  | 'hero' | 'about' | 'services' | 'team' | 'testimonials'
  | 'appointment-booking' | 'available-slots' | 'working-hours'
  | 'contact' | 'gallery' | 'faq' | 'stats' | 'cta-banner'
  | 'rich-text' | 'divider' | 'spacer' | 'map' | 'social-proof'
  | 'video' | 'branches' | 'products'
  | 'ai-chatbot' | 'whatsapp-button' | 'blog-articles' | 'clinic-info' | 'patient-login';

export interface SectionConfig {
  id:          string;
  type:        SectionType;
  visible:     boolean;
  settings:    Record<string, any>;
  layout?:     'full' | 'contained' | 'wide';
  background?: { type: 'color' | 'gradient' | 'image'; value: string };
  padding?:    { top: number; bottom: number };
  anchor?:     string;
}

export interface PageConfig {
  id:        string;
  slug:      string;
  title:     string;
  enabled:   boolean;
  isHome:    boolean;
  seo?:      { title?: string; description?: string };
  sections:  SectionConfig[];
}

export interface ThemeConfig {
  primaryColor:    string;
  secondaryColor:  string;
  accentColor:     string;
  backgroundColor: string;
  textColor:       string;
  fontHeading:     string;
  fontBody:        string;
  borderRadius:    'none' | 'sm' | 'md' | 'lg' | 'full';
  buttonStyle:     'filled' | 'outlined' | 'ghost';
  spacing:         'compact' | 'normal' | 'spacious';
}

export type NavVariant    = 'classic' | 'centered' | 'minimal' | 'dark' | 'transparent-light' | 'transparent-dark' | 'gradient' | 'glass' | 'colored' | 'white-shadow';
export type FooterVariant = 'classic' | 'minimal' | 'dark' | 'centered' | 'columns-only';

export interface GlobalSettings {
  nav: {
    logo?:       string;
    logoText?:   string;
    sticky:      boolean;
    transparent: boolean;
    variant?:    NavVariant;
    bgColor?:    string;
    textColor?:  string;
    ctaButton?:  { text: string; action: 'book' | 'call' | 'link' | 'scroll'; value?: string };
    links:       { label: string; pageId: string }[];
  };
  footer: {
    tagline?:       string;
    variant?:       FooterVariant;
    bgColor?:       string;
    columns:        { heading: string; links: { label: string; href: string }[] }[];
    showSocials:    boolean;
    socials?:       { facebook?: string; instagram?: string; twitter?: string; youtube?: string; tiktok?: string };
    copyrightText?: string;
    showPoweredBy?: boolean;
  };
  favicon?: string;
}

export interface SeoConfig {
  title?:                  string;
  description?:            string;
  keywords?:               string[];
  ogImage?:                string;
  noindex?:                boolean;
  canonicalDomain?:        string;
  favicon?:                string;
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
  aggregateRating?: {
    ratingValue?: number;
    reviewCount?:  number;
  };
}

// ── History snapshot ──────────────────────────────────────────────────────────

interface Snapshot {
  pages:          PageConfig[];
  globalSettings: GlobalSettings;
  theme:          ThemeConfig;
  seo:            SeoConfig;
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface BuilderStore {
  pages:          PageConfig[];
  globalSettings: GlobalSettings;
  theme:          ThemeConfig;
  seo:            SeoConfig;

  subdomain: string;
  clinicId:  string;

  selectedPageId:    string | null;
  selectedSectionId: string | null;
  leftPanel:         'pages' | 'library' | 'layers' | 'themes';
  rightPanel:        'section' | 'global' | 'theme' | 'seo' | 'domain';
  previewDevice:     'desktop' | 'tablet' | 'mobile';
  saveStatus:        'idle' | 'saving' | 'saved' | 'error';
  isPublished:       boolean;
  setIsPublished:    (v: boolean) => void;
  isDirty:           boolean;

  past:   Snapshot[];
  future: Snapshot[];

  setPages:           (pages: PageConfig[]) => void;
  setGlobalSettings:  (gs: Partial<GlobalSettings>) => void;
  setTheme:           (t: Partial<ThemeConfig>) => void;
  setSeo:             (s: Partial<SeoConfig>) => void;
  setSelectedPage:    (id: string | null) => void;
  setSelectedSection: (id: string | null) => void;
  setLeftPanel:       (p: 'pages' | 'library' | 'layers' | 'themes') => void;
  setRightPanel:      (p: 'section' | 'global' | 'theme' | 'seo' | 'domain') => void;
  setPreviewDevice:   (d: 'desktop' | 'tablet' | 'mobile') => void;
  setSaveStatus:      (s: 'idle' | 'saving' | 'saved' | 'error') => void;
  setSubdomain:       (s: string) => void;
  setClinicId:        (s: string) => void;

  addPage:       (page: Omit<PageConfig, 'id'>) => void;
  deletePage:    (pageId: string) => void;
  updatePage:    (pageId: string, updates: Partial<PageConfig>) => void;
  reorderPages:  (pageIds: string[]) => void;

  addSection:       (pageId: string, section: Omit<SectionConfig, 'id'>, position?: number) => void;
  deleteSection:    (pageId: string, sectionId: string) => void;
  updateSection:    (pageId: string, sectionId: string, updates: Partial<SectionConfig>) => void;
  reorderSections:  (pageId: string, sectionIds: string[]) => void;
  duplicateSection: (pageId: string, sectionId: string) => void;

  pushHistory: () => void;
  undo:        () => void;
  redo:        () => void;
  canUndo:     () => boolean;
  canRedo:     () => boolean;

  loadFromApi: (data: {
    pages:          PageConfig[];
    globalSettings: GlobalSettings;
    theme:          ThemeConfig;
    seo:            SeoConfig;
    isPublished?:   boolean;
    subdomain?:     string;
    clinicId?:      string;
  }) => void;

  getSnapshot:      () => Snapshot;
  broadcastChanges: () => void;
  getSelectedPage:    () => PageConfig | null;
  getSelectedSection: () => SectionConfig | null;
}

const MAX_HISTORY = 30;

// Exported so page.tsx and seoUtils.ts can use them as fallbacks
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

// BroadcastChannel for real-time preview sync
let _channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!_channel) {
    try {
      _channel = new BroadcastChannel('website-builder-sync');
      // Respond to preview pages that open mid-session and request a fresh sync
      _channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'REQUEST_PREVIEW_SYNC') {
          // Re-broadcast current state so the requesting preview page gets up-to-date data
          useBuilderStore.getState().broadcastChanges();
        }
      };
    } catch { return null; }
  }
  return _channel;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  pages:             [],
  globalSettings:    DEFAULT_GLOBAL_SETTINGS,
  theme:             DEFAULT_THEME,
  seo:               {},
  subdomain:         '',
  clinicId:          '',
  selectedPageId:    null,
  selectedSectionId: null,
  leftPanel:         'pages',
  rightPanel:        'global',
  previewDevice:     'desktop',
  saveStatus:        'idle',
  isPublished:       false,
  isDirty:           false,
  past:              [],
  future:            [],

  broadcastChanges: () => {
    const ch = getChannel();
    if (!ch) return;
    const { pages, globalSettings, theme, seo, isPublished, subdomain, clinicId } = get();
    try {
      ch.postMessage({ type: 'BUILDER_UPDATE', pages, globalSettings, theme, seo, isPublished, subdomain, clinicId });
    } catch {}
  },

  loadFromApi: ({ pages, globalSettings, theme, seo, isPublished, subdomain, clinicId }) => {
    const rawSeo = seo || {};
    const normalisedSeo: SeoConfig = {
      ...rawSeo,
      keywords: Array.isArray(rawSeo.keywords)
        ? rawSeo.keywords
        : typeof rawSeo.keywords === 'string'
          ? (rawSeo.keywords as string).split(',').map((k: string) => k.trim()).filter(Boolean)
          : undefined,
      aggregateRating:
        rawSeo.aggregateRating &&
        typeof rawSeo.aggregateRating === 'object' &&
        !Array.isArray(rawSeo.aggregateRating)
          ? {
              ratingValue:
                typeof (rawSeo.aggregateRating as any).ratingValue === 'number'
                  ? (rawSeo.aggregateRating as any).ratingValue
                  : typeof (rawSeo.aggregateRating as any).ratingValue === 'string'
                    ? parseFloat((rawSeo.aggregateRating as any).ratingValue) || undefined
                    : undefined,
              reviewCount:
                typeof (rawSeo.aggregateRating as any).reviewCount === 'number'
                  ? (rawSeo.aggregateRating as any).reviewCount
                  : typeof (rawSeo.aggregateRating as any).reviewCount === 'string'
                    ? parseInt((rawSeo.aggregateRating as any).reviewCount, 10) || undefined
                    : undefined,
            }
          : undefined,
      latitude:
        typeof rawSeo.latitude === 'string'
          ? parseFloat(rawSeo.latitude as any) || undefined
          : rawSeo.latitude,
      longitude:
        typeof rawSeo.longitude === 'string'
          ? parseFloat(rawSeo.longitude as any) || undefined
          : rawSeo.longitude,
    };

    set({
      pages,
      globalSettings:    deepMerge(DEFAULT_GLOBAL_SETTINGS, globalSettings || {}) as GlobalSettings,
      theme:             { ...DEFAULT_THEME, ...(theme || {}) },
      seo:               normalisedSeo,
      isPublished:       isPublished ?? false,
      subdomain:         subdomain || '',
      clinicId:          clinicId  || '',
      selectedPageId:    pages.find(p => p.isHome)?.id || pages[0]?.id || null,
      selectedSectionId: null,
      past:              [],
      future:            [],
      isDirty:           false,
    });
  },

  getSnapshot: () => {
    const { pages, globalSettings, theme, seo } = get();
    return JSON.parse(JSON.stringify({ pages, globalSettings, theme, seo }));
  },

  pushHistory: () => {
    const snap = get().getSnapshot();
    set(state => ({
      past:    [...state.past.slice(-MAX_HISTORY + 1), snap],
      future:  [],
      isDirty: true,
    }));
    // NOTE: broadcastChanges() is NOT called here intentionally.
    // Each mutating action (updateSection, setTheme, etc.) calls broadcastChanges
    // AFTER its own set() so the preview receives the new state, not the pre-mutation state.
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  undo: () => {
    const { past, future, getSnapshot } = get();
    if (!past.length) return;
    const current  = getSnapshot();
    const previous = past[past.length - 1];
    set({ ...previous, past: past.slice(0, -1), future: [current, ...future], isDirty: true });
    setTimeout(() => get().broadcastChanges(), 0); // safe here since set() is synchronous
  },

  redo: () => {
    const { past, future, getSnapshot } = get();
    if (!future.length) return;
    const current = getSnapshot();
    const next    = future[0];
    set({ ...next, past: [...past, current], future: future.slice(1), isDirty: true });
    setTimeout(() => get().broadcastChanges(), 0);
  },

  setPages: (pages) => {
    get().pushHistory();
    set({ pages, isDirty: true });
    setTimeout(() => get().broadcastChanges(), 0);
  },

  setGlobalSettings: (gs) => {
    get().pushHistory();
    set(state => ({
      globalSettings: deepMerge(state.globalSettings, gs) as GlobalSettings,
      isDirty: true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  setTheme: (t) => {
    get().pushHistory();
    set(state => ({ theme: { ...state.theme, ...t }, isDirty: true }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  setSeo: (s) => {
    get().pushHistory();
    set(state => ({ seo: { ...state.seo, ...s }, isDirty: true }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  setSelectedPage:    (id) => set({ selectedPageId: id, selectedSectionId: null, rightPanel: 'global' }),
  setSelectedSection: (id) => set({ selectedSectionId: id, rightPanel: id ? 'section' : 'global' }),
  setLeftPanel:       (p)  => set({ leftPanel: p }),
  setRightPanel:      (p)  => set({ rightPanel: p }),
  setPreviewDevice:   (d)  => set({ previewDevice: d }),
  setSaveStatus:      (s)  => set({ saveStatus: s }),
  setIsPublished:     (v)  => set({ isPublished: v }),
  setSubdomain:       (s)  => set({ subdomain: s }),
  setClinicId:        (s)  => set({ clinicId: s }),

  addPage: (page) => {
    get().pushHistory();
    const newPage: PageConfig = { ...page, id: uuidv4(), sections: page.sections || [] };
    set(state => ({
      pages:          [...state.pages, newPage],
      selectedPageId: newPage.id,
      isDirty:        true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  deletePage: (pageId) => {
    const state = get();
    const page  = state.pages.find(p => p.id === pageId);
    if (!page || page.isHome) return;
    state.pushHistory();
    const remaining = state.pages.filter(p => p.id !== pageId);
    set({ pages: remaining, selectedPageId: remaining[0]?.id || null, isDirty: true });
    setTimeout(() => get().broadcastChanges(), 0);
  },

  updatePage: (pageId, updates) => {
    get().pushHistory();
    set(state => ({
      pages:   state.pages.map(p => p.id === pageId ? { ...p, ...updates } : p),
      isDirty: true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  reorderPages: (pageIds) => {
    get().pushHistory();
    set(state => {
      const map      = new Map(state.pages.map(p => [p.id, p]));
      const newPages = pageIds.map(id => map.get(id)!).filter(Boolean);
      const existing = state.globalSettings?.nav?.links ?? [];
      const order    = new Map(pageIds.map((id, idx) => [id, idx]));
      const reordered = [...existing].sort((a, b) => {
        const ai = order.has(a.pageId) ? order.get(a.pageId)! : Infinity;
        const bi = order.has(b.pageId) ? order.get(b.pageId)! : Infinity;
        return ai - bi;
      });
      return {
        pages:          newPages,
        globalSettings: { ...state.globalSettings, nav: { ...state.globalSettings.nav, links: reordered } },
        isDirty:        true,
      };
    });
    setTimeout(() => get().broadcastChanges(), 0);
  },

  addSection: (pageId, sectionDef, position) => {
    get().pushHistory();
    const newSection: SectionConfig = { ...sectionDef, id: uuidv4() };
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== pageId) return p;
        const sections = [...p.sections];
        if (position !== undefined && position >= 0 && position <= sections.length) {
          sections.splice(position, 0, newSection);
        } else {
          sections.push(newSection);
        }
        return { ...p, sections };
      }),
      selectedSectionId: newSection.id,
      rightPanel:        'section',
      isDirty:           true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  deleteSection: (pageId, sectionId) => {
    get().pushHistory();
    set(state => ({
      pages: state.pages.map(p =>
        p.id !== pageId ? p : { ...p, sections: p.sections.filter(s => s.id !== sectionId) },
      ),
      selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
      isDirty:           true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  updateSection: (pageId, sectionId, updates) => {
    get().pushHistory();
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          sections: p.sections.map(s => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              ...updates,
              id:       s.id,
              settings: updates.settings ? { ...s.settings, ...updates.settings } : s.settings,
            };
          }),
        };
      }),
      isDirty: true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  reorderSections: (pageId, sectionIds) => {
    get().pushHistory();
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== pageId) return p;
        const map = new Map(p.sections.map(s => [s.id, s]));
        return { ...p, sections: sectionIds.map(id => map.get(id)!).filter(Boolean) };
      }),
      isDirty: true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  duplicateSection: (pageId, sectionId) => {
    get().pushHistory();
    set(state => ({
      pages: state.pages.map(p => {
        if (p.id !== pageId) return p;
        const idx = p.sections.findIndex(s => s.id === sectionId);
        if (idx === -1) return p;
        const clone    = { ...JSON.parse(JSON.stringify(p.sections[idx])), id: uuidv4() };
        const sections = [...p.sections];
        sections.splice(idx + 1, 0, clone);
        return { ...p, sections };
      }),
      isDirty: true,
    }));
    setTimeout(() => get().broadcastChanges(), 0);
  },

  getSelectedPage: () => {
    const { pages, selectedPageId } = get();
    return pages.find(p => p.id === selectedPageId) || null;
  },

  getSelectedSection: () => {
    const { pages, selectedPageId, selectedSectionId } = get();
    const page = pages.find(p => p.id === selectedPageId);
    return page?.sections.find(s => s.id === selectedSectionId) || null;
  },
}));

// ── Deep merge ────────────────────────────────────────────────────────────────

function deepMerge(target: any, source: any): any {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}