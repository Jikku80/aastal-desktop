import { sanitizeSettingsUrls } from './sanitize-url.util';
import { NginxProvisioningService } from './nginx-provisioning.service';
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { ClinicWebsite, PageConfig, SectionConfig, SectionType, ThemeConfig, GlobalSettings, SeoConfig } from './entities/clinic-website.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { ShiftResolver } from '../shifts/shift-resolver.service';

// ── Default theme ──────────────────────────────────────────────────────────────

const DEFAULT_THEME: ThemeConfig = {
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

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  nav: {
    sticky:      true,
    transparent: true,
    links:       [],
    ctaButton:   { text: 'Book Appointment', action: 'book' },
  },
  footer: {
    tagline:       'Quality healthcare for everyone.',
    columns:       [],
    showSocials:   true,
    copyrightText: `© ${new Date().getFullYear()} All rights reserved.`,
  },
};

// ── Section default settings helpers ──────────────────────────────────────────

function heroDefaults(clinic: Partial<Clinic> = {}): Record<string, any> {
  return {
    headline:          `Welcome to ${clinic.name || 'Our Clinic'}`,
    subheadline:       'Compassionate care, exceptional results.',
    ctaText:           'Book Appointment',
    ctaAction:         'scroll-to-booking',
    secondaryCtaText:  'Learn More',
    secondaryCtaAction:'link',
    backgroundType:    'color',
    backgroundValue:   '#0ea5e9',
    backgroundOverlay: 50,
    layout:            'center',
    showClinicLogo:    true,
    showRatingBadge:   false,
    minHeight:         'large',
  };
}

function miniHeroDefaults(title: string): Record<string, any> {
  return {
    headline:          title,
    subheadline:       '',
    ctaText:           '',
    ctaAction:         'link',
    backgroundType:    'color',
    backgroundValue:   '#0ea5e9',
    backgroundOverlay: 60,
    layout:            'center',
    showClinicLogo:    false,
    showRatingBadge:   false,
    minHeight:         'small',
  };
}

function bookingDefaults(): Record<string, any> {
  return {
    title:               'Book an Appointment',
    subtitle:            'Choose your preferred date and time',
    branchFilter:        'all',
    doctorFilter:        'all',
    calendarStyle:       'slots-grid',
    formFields: {
      patientName:  true,
      patientPhone: true,
      patientEmail: true,
      notes:        false,
      doctorSelect: true,
      branchSelect: true,
    },
    confirmationMessage: 'Your appointment has been booked successfully!',
  };
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class WebsiteBuilderService {
  private readonly logger = new Logger(WebsiteBuilderService.name);

  constructor(
    @InjectRepository(ClinicWebsite) private repo: Repository<ClinicWebsite>,
    @InjectRepository(Clinic)        private clinicRepo: Repository<Clinic>,
    @InjectRepository(Appointment)   private aptRepo: Repository<Appointment>,
    private config: ConfigService,
    private nginxProvisioning: NginxProvisioningService,
    private shiftResolver: ShiftResolver,
  ) {}

  // ── findOrCreate ─────────────────────────────────────────────────────────────

  async findOrCreate(clinicId: string): Promise<ClinicWebsite> {
    let site = await this.repo.findOne({ where: { clinicId } });
    if (!site) {
      const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
      if (!clinic) throw new NotFoundException('Clinic not found');

      site = this.repo.create({
        clinicId,
        pages:          this.buildDefaultPages(clinic),
        globalSettings: this.buildDefaultGlobalSettings(clinic),
        theme:          { ...DEFAULT_THEME },
        seo:            { title: clinic.name, description: `${clinic.name} — Book your appointment online.` },
        subdomain:      clinic.slug,
      });
      await this.repo.save(site);
    }
    return site;
  }

  // ── buildDefaultGlobalSettings ───────────────────────────────────────────────

  buildDefaultGlobalSettings(clinic: Partial<Clinic>): GlobalSettings {
    return {
      ...DEFAULT_GLOBAL_SETTINGS,
      nav: {
        ...DEFAULT_GLOBAL_SETTINGS.nav,
        logoText: clinic.name,
        logo:     clinic.logo || undefined,
      },
      footer: {
        ...DEFAULT_GLOBAL_SETTINGS.footer,
        copyrightText: `© ${new Date().getFullYear()} ${clinic.name}. All rights reserved.`,
      },
    };
  }

  // ── buildDefaultPages ─────────────────────────────────────────────────────────

  buildDefaultPages(clinic: Partial<Clinic>): PageConfig[] {
    const pages: PageConfig[] = [
      // ── HOME ──────────────────────────────────────────────────────────────────
      {
        id:      uuidv4(),
        slug:    'home',
        title:   'Home',
        enabled: true,
        isHome:  true,
        seo:     { title: `${clinic.name} — Home` },
        sections: [
          { id: uuidv4(), type: 'hero',                visible: true, layout: 'full',      settings: heroDefaults(clinic) },
          { id: uuidv4(), type: 'stats',               visible: true, layout: 'contained', settings: { title: 'By the Numbers', items: [{ value: '10+', label: 'Years Experience' }, { value: '5000+', label: 'Happy Patients' }, { value: '15+', label: 'Expert Doctors' }, { value: '98%', label: 'Satisfaction Rate' }] } },
          { id: uuidv4(), type: 'services',            visible: true, layout: 'contained', settings: { variant: 'cards', title: 'Our Services', subtitle: 'Comprehensive care tailored to your needs', items: [], layout: 'grid', columns: 3 } },
          { id: uuidv4(), type: 'team',                visible: true, layout: 'contained', settings: { variant: 'cards', title: 'Meet Our Team', subtitle: 'Experienced and caring professionals', dataSource: 'live-api', members: [], layout: 'grid', columns: 3, showSpecializations: true, showBookButton: true } },
          { id: uuidv4(), type: 'testimonials',        visible: true, layout: 'contained', settings: { variant: 'cards', title: 'What Our Patients Say', subtitle: '', items: [], layout: 'carousel' } },
          { id: uuidv4(), type: 'appointment-booking', visible: true, layout: 'contained', settings: { ...bookingDefaults(), variant: 'classic' }, anchor: 'booking' },
          { id: uuidv4(), type: 'working-hours',       visible: true, layout: 'contained', settings: { variant: 'table', title: 'Opening Hours', dataSource: 'live-api', hours: {}, showTodayHighlight: true, showClosedDays: true } },
          { id: uuidv4(), type: 'contact',             visible: true, layout: 'contained', settings: { variant: 'classic', title: 'Contact Us', subtitle: 'We\'d love to hear from you', showForm: true, showMap: false, showDetails: true, address: clinic.address || '', phone: clinic.phone || '', email: clinic.email || '' } },
        ],
      },

      // ── SERVICES ──────────────────────────────────────────────────────────────
      {
        id:      uuidv4(),
        slug:    'services',
        title:   'Services',
        enabled: true,
        isHome:  false,
        seo:     { title: `Services — ${clinic.name}` },
        sections: [
          { id: uuidv4(), type: 'hero',                visible: true, layout: 'full',      settings: miniHeroDefaults('Our Services') },
          { id: uuidv4(), type: 'services',            visible: true, layout: 'contained', settings: { variant: 'premium-cards', title: 'What We Offer', subtitle: 'Expert treatments for every patient', items: [], layout: 'grid', columns: 3, showPrices: false, showIcons: true } },
          { id: uuidv4(), type: 'faq',                 visible: true, layout: 'contained', settings: { variant: 'accordion', title: 'Services FAQ', subtitle: 'Common questions about our treatments', items: [{ id: '1', question: 'Do I need a referral?', answer: 'Most services do not require a referral. Walk-ins and direct bookings are welcome.' }, { id: '2', question: 'What insurance do you accept?', answer: 'We accept most major insurance providers. Please call to confirm before your visit.' }] } },
          { id: uuidv4(), type: 'appointment-booking', visible: true, layout: 'contained', settings: { ...bookingDefaults(), variant: 'classic' }, anchor: 'booking' },
        ],
      },

      // ── DOCTORS ───────────────────────────────────────────────────────────────
      {
        id:      uuidv4(),
        slug:    'doctors',
        title:   'Doctors',
        enabled: true,
        isHome:  false,
        seo:     { title: `Our Doctors — ${clinic.name}` },
        sections: [
          { id: uuidv4(), type: 'hero',                visible: true, layout: 'full',      settings: miniHeroDefaults('Meet Our Doctors') },
          { id: uuidv4(), type: 'team',                visible: true, layout: 'contained', settings: { variant: 'premium-profiles', title: 'Our Medical Team', subtitle: 'Qualified professionals dedicated to your health', dataSource: 'live-api', members: [], layout: 'cards', columns: 3, showSpecializations: true, showBookButton: true } },
          { id: uuidv4(), type: 'appointment-booking', visible: true, layout: 'contained', settings: { ...bookingDefaults(), variant: 'doctor-first' }, anchor: 'booking' },
        ],
      },

      // ── SHOP ──────────────────────────────────────────────────────────────────
      {
        id:      uuidv4(),
        slug:    'shop',
        title:   'Shop',
        enabled: true,
        isHome:  false,
        seo:     { title: `Shop — ${clinic.name}` },
        sections: [
          { id: uuidv4(), type: 'hero',     visible: true, layout: 'full',      settings: miniHeroDefaults('Our Product Shop') },
          { id: uuidv4(), type: 'products', visible: true, layout: 'contained', settings: { variant: 'grid', title: 'Shop Products', subtitle: 'Browse and order from our clinic inventory', layout: 'grid', columns: 3, showSearch: true, showStockBadge: true, featuredOnly: false, ctaText: 'Add to Cart' } },
        ],
      },

      // ── BLOG ──────────────────────────────────────────────────────────────────
      {
        id:      uuidv4(),
        slug:    'blog',
        title:   'Blog',
        enabled: true,
        isHome:  false,
        seo:     { title: `Health Articles — ${clinic.name}` },
        sections: [
          { id: uuidv4(), type: 'hero',          visible: true, layout: 'full',      settings: miniHeroDefaults('Health Articles') },
          { id: uuidv4(), type: 'blog-articles', visible: true, layout: 'contained', settings: { variant: 'modern-grid', title: 'Latest Articles', subtitle: 'Stay informed with our health tips and clinic news' } },
        ],
      },

      // ── CONTACT ───────────────────────────────────────────────────────────────
      {
        id:      uuidv4(),
        slug:    'contact',
        title:   'Contact',
        enabled: true,
        isHome:  false,
        seo:     { title: `Contact — ${clinic.name}` },
        sections: [
          { id: uuidv4(), type: 'hero',          visible: true, layout: 'full',      settings: miniHeroDefaults('Contact Us') },
          { id: uuidv4(), type: 'contact',       visible: true, layout: 'contained', settings: { variant: 'classic', title: 'Get in Touch', subtitle: 'We\'d love to hear from you', showForm: true, showMap: true, showDetails: true, address: clinic.address || '', phone: clinic.phone || '', email: clinic.email || '' } },
          { id: uuidv4(), type: 'working-hours', visible: true, layout: 'contained', settings: { variant: 'table', title: 'Opening Hours', dataSource: 'live-api', hours: {}, showTodayHighlight: true, showClosedDays: true } },
          { id: uuidv4(), type: 'map',           visible: true, layout: 'full',      settings: { title: 'Find Us', embedUrl: '', zoom: 15 } },
          { id: uuidv4(), type: 'branches',      visible: true, layout: 'contained', settings: { title: 'Our Locations', subtitle: '', dataSource: 'live-api', items: [] } },
        ],
      },
    ];

    return pages;
  }

  // ── find ─────────────────────────────────────────────────────────────────────

  async find(clinicId: string): Promise<ClinicWebsite> {
    return this.findOrCreate(clinicId);
  }

  // ── update ────────────────────────────────────────────────────────────────────

  async update(clinicId: string, dto: {
    pages?: PageConfig[];
    globalSettings?: Partial<GlobalSettings>;
    theme?: Partial<ThemeConfig>;
    seo?: Partial<SeoConfig>;
    subdomain?: string;
    customDomain?: string;
    isPublished?: boolean;
  }): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);

    if (dto.pages !== undefined) {
      site.pages = dto.pages;
    }

    if (dto.globalSettings !== undefined) {
      const merged = this.deepMerge(site.globalSettings, dto.globalSettings);
      site.globalSettings = sanitizeSettingsUrls(merged) as GlobalSettings;
    }

    if (dto.theme !== undefined) {
      site.theme = { ...site.theme, ...dto.theme } as ThemeConfig;
    }

    if (dto.seo !== undefined) {
      const mergedSeo = { ...site.seo, ...dto.seo };
      site.seo = sanitizeSettingsUrls(mergedSeo) as typeof site.seo;
    }

    if (dto.subdomain !== undefined)    site.subdomain    = dto.subdomain;
    if (dto.customDomain !== undefined) site.customDomain = dto.customDomain;
    if (dto.isPublished !== undefined)  site.isPublished  = dto.isPublished;

    return this.repo.save(site);
  }

  // ── addPage ───────────────────────────────────────────────────────────────────

  async addPage(clinicId: string, pageConfig: Omit<PageConfig, 'id'>): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const newPage: PageConfig = { ...pageConfig, id: uuidv4(), sections: pageConfig.sections || [] };

    // Only one home page
    if (newPage.isHome) {
      site.pages = site.pages.map(p => ({ ...p, isHome: false }));
    }

    site.pages = [...site.pages, newPage];
    return this.repo.save(site);
  }

  // ── deletePage ────────────────────────────────────────────────────────────────

  async deletePage(clinicId: string, pageId: string): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const page = site.pages.find(p => p.id === pageId);
    if (!page) throw new NotFoundException('Page not found');
    if (page.isHome) throw new BadRequestException('Cannot delete the home page');

    site.pages = site.pages.filter(p => p.id !== pageId);
    return this.repo.save(site);
  }

  // ── reorderPages ──────────────────────────────────────────────────────────────

  async reorderPages(clinicId: string, pageIds: string[]): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const map = new Map(site.pages.map(p => [p.id, p]));
    const reordered = pageIds.map(id => {
      const p = map.get(id);
      if (!p) throw new NotFoundException(`Page ${id} not found`);
      return p;
    });
    site.pages = reordered;
    return this.repo.save(site);
  }

  // ── addSection ────────────────────────────────────────────────────────────────

  async addSection(
    clinicId: string,
    pageId: string,
    sectionConfig: Omit<SectionConfig, 'id'>,
    position?: number,
  ): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const page = site.pages.find(p => p.id === pageId);
    if (!page) throw new NotFoundException('Page not found');

    const newSection: SectionConfig = { ...sectionConfig, id: uuidv4() };

    if (position !== undefined && position >= 0 && position <= page.sections.length) {
      page.sections.splice(position, 0, newSection);
    } else {
      page.sections.push(newSection);
    }

    site.pages = site.pages.map(p => p.id === pageId ? page : p);
    return this.repo.save(site);
  }

  // ── updateSection ─────────────────────────────────────────────────────────────

  async updateSection(
    clinicId: string,
    pageId: string,
    sectionId: string,
    updates: Partial<SectionConfig>,
  ): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const page = site.pages.find(p => p.id === pageId);
    if (!page) throw new NotFoundException('Page not found');

    const sIdx = page.sections.findIndex(s => s.id === sectionId);
    if (sIdx === -1) throw new NotFoundException('Section not found');

    const mergedSettings = updates.settings
      ? { ...page.sections[sIdx].settings, ...updates.settings }
      : page.sections[sIdx].settings;

    page.sections[sIdx] = {
      ...page.sections[sIdx],
      ...updates,
      id: sectionId, // never overwrite id
      settings: sanitizeSettingsUrls(mergedSettings),
    };

    site.pages = site.pages.map(p => p.id === pageId ? page : p);
    return this.repo.save(site);
  }

  // ── deleteSection ─────────────────────────────────────────────────────────────

  async deleteSection(clinicId: string, pageId: string, sectionId: string): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const page = site.pages.find(p => p.id === pageId);
    if (!page) throw new NotFoundException('Page not found');

    page.sections = page.sections.filter(s => s.id !== sectionId);
    site.pages = site.pages.map(p => p.id === pageId ? page : p);
    return this.repo.save(site);
  }

  // ── reorderSections ───────────────────────────────────────────────────────────

  async reorderSections(clinicId: string, pageId: string, sectionIds: string[]): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const page = site.pages.find(p => p.id === pageId);
    if (!page) throw new NotFoundException('Page not found');

    const map = new Map(page.sections.map(s => [s.id, s]));
    page.sections = sectionIds.map(id => {
      const s = map.get(id);
      if (!s) throw new NotFoundException(`Section ${id} not found`);
      return s;
    });

    site.pages = site.pages.map(p => p.id === pageId ? page : p);
    return this.repo.save(site);
  }

  // ── duplicateSection ──────────────────────────────────────────────────────────

  async duplicateSection(clinicId: string, pageId: string, sectionId: string): Promise<ClinicWebsite> {
    const site = await this.findOrCreate(clinicId);
    const page = site.pages.find(p => p.id === pageId);
    if (!page) throw new NotFoundException('Page not found');

    const original = page.sections.find(s => s.id === sectionId);
    if (!original) throw new NotFoundException('Section not found');

    const clone: SectionConfig = { ...JSON.parse(JSON.stringify(original)), id: uuidv4() };
    const idx = page.sections.findIndex(s => s.id === sectionId);
    page.sections.splice(idx + 1, 0, clone);

    site.pages = site.pages.map(p => p.id === pageId ? page : p);
    return this.repo.save(site);
  }

  // ── publish / unpublish ───────────────────────────────────────────────────────

  async publish(clinicId: string): Promise<ClinicWebsite> {
    return this.update(clinicId, { isPublished: true });
  }

  async unpublish(clinicId: string): Promise<ClinicWebsite> {
    return this.update(clinicId, { isPublished: false });
  }

  // ── verifyDomain ──────────────────────────────────────────────────────────────

  async verifyDomain(clinicId: string): Promise<{ verified: boolean; message: string }> {
    const site = await this.findOrCreate(clinicId);
    if (!site.customDomain) {
      return { verified: false, message: 'No custom domain configured. Save a custom domain first.' };
    }

    // Strip leading www. — TXT records are usually on the root (@)
    const domain = site.customDomain.replace(/^www\./, '');
    const expected = `clinic-karobar-verify=${site.clinicId}`;

    try {
      const dns = await import('dns').then(m => m.promises);

      let verified = false;
      let records: string[][] = [];

      try {
        records = await dns.resolveTxt(domain);
        const flat = records.flat().join(' ');
        verified = flat.includes(expected);
      } catch (dnsErr: any) {
        // ENODATA / ENOTFOUND — record missing or domain not set up
        this.logger.warn(`TXT lookup failed for ${domain}: ${dnsErr.code || dnsErr.message}`);
      }

      if (verified) {
        await this.repo.update({ clinicId }, { domainVerified: true });

        // Auto-provision nginx block + SSL cert so the domain goes live immediately
        const provision = await this.nginxProvisioning.provisionDomain(domain);
        if (!provision.ok) {
          this.logger.warn(`Domain verified but nginx provisioning failed: ${provision.message}`);
        }

        return { verified: true, message: 'Domain verified successfully! Your site is now live on your custom domain.' };
      }

      return {
        verified: false,
        message: `TXT record not found on ${domain}. Add a TXT record with value: ${expected}`,
      };
    } catch (err: any) {
      this.logger.error('verifyDomain error', err?.message || err);
      return { verified: false, message: 'DNS lookup failed. Please try again in a few minutes.' };
    }
  }

  // ── AI provider helpers ────────────────────────────────────────────────────────

  /**
   * Picks the first available AI provider (Groq → Cerebras → Gemini) and
   * calls it with the supplied prompt, returning cleaned JSON text.
   */
  private async callAI(systemPrompt: string, userPrompt: string, large = false): Promise<string> {
    const groqKey      = this.config.get<string>('GROQ_API_KEY');
    const cerebrasKey  = this.config.get<string>('CEREBRAS_API_KEY');
    const geminiKey    = this.config.get<string>('GEMINI_API_KEY');

    if (!groqKey && !cerebrasKey && !geminiKey) {
      throw new BadRequestException(
        'AI generation requires at least one of GROQ_API_KEY, CEREBRAS_API_KEY, or GEMINI_API_KEY to be configured.'
      );
    }

    // ── Groq (primary) ─────────────────────────────────────────────────────────
    if (groqKey) {
      const model = large ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error ${res.status}: ${err}`);
      }
      const data: any = await res.json();
      return data.choices[0].message.content;
    }

    // ── Cerebras (secondary) ───────────────────────────────────────────────────
    if (cerebrasKey) {
      const model = large ? 'llama-3.3-70b' : 'llama3.1-8b';
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cerebrasKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cerebras API error ${res.status}: ${err}`);
      }
      const data: any = await res.json();
      return data.choices[0].message.content;
    }

    // ── Gemini (fallback) ──────────────────────────────────────────────────────
    const model = large ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }
    const data: any = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }

  // ── generateWithAI ─────────────────────────────────────────────────────────────
  // Uses Groq (primary) → Cerebras (secondary) → Gemini (fallback)

  async generateWithAI(clinicId: string, dto: {
    template?: string;
    tone?: string;
    specialty?: string;
    clinicInfo?: string;
  }): Promise<ClinicWebsite> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const prompt = this.buildAIPrompt(clinic, dto);

    try {
      const raw    = await this.callAI(
        'You are a professional website copywriter for medical clinics. Return ONLY valid JSON with no markdown, no code fences, no explanations.',
        prompt,
        true, // use the larger model for full-site generation
      );
      const clean  = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(clean);

      const site = await this.findOrCreate(clinicId);
      if (parsed.pages)          site.pages          = parsed.pages;
      if (parsed.theme)          site.theme          = { ...site.theme,          ...parsed.theme };
      if (parsed.globalSettings) site.globalSettings = { ...site.globalSettings, ...parsed.globalSettings };

      return this.repo.save(site);
    } catch (e: any) {
      this.logger.error('AI generation failed', e?.message || e);
      throw new BadRequestException('AI generation failed: ' + (e?.message || 'Unknown error'));
    }
  }

  // ── generateSectionWithAI ─────────────────────────────────────────────────────

  async generateSectionWithAI(
    clinicId: string,
    pageId: string,
    sectionId: string,
    sectionType: SectionType,
    userHint?: string,
  ): Promise<ClinicWebsite> {
    const clinic  = await this.clinicRepo.findOne({ where: { id: clinicId } });
    const site    = await this.findOrCreate(clinicId);
    const page    = site.pages.find(p => p.id === pageId);
    const section = page?.sections.find(s => s.id === sectionId);

    if (!page || !section) throw new NotFoundException('Page or section not found');

    const prompt = `
You are a website copy expert for medical clinics.
Clinic: ${clinic?.name || 'The Clinic'}, Specialty: ${sectionType}
Section type: ${sectionType}
Current content: ${JSON.stringify(section.settings)}
User hint: ${userHint || 'Make it professional and engaging.'}

Return ONLY a JSON object with a single key "settings" containing improved text content.
Keep the EXACT same JSON shape and all non-text fields. Only improve text values.
`;

    try {
      let parsed: any;

      const raw   = await this.callAI('Return ONLY valid JSON with no markdown, no code fences, no explanations.', prompt);
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(clean);

      if (parsed.settings) {
        section.settings = { ...section.settings, ...parsed.settings };
        page.sections = page.sections.map(s => s.id === sectionId ? section : s);
        site.pages    = site.pages.map(p => p.id === pageId ? page : p);
        return this.repo.save(site);
      }
    } catch (e: any) {
      this.logger.error('Section AI generation failed', e?.message || e);
      throw new BadRequestException('Section regeneration failed: ' + (e?.message || 'Unknown error'));
    }

    return site;
  }

  // ── Public site helpers ───────────────────────────────────────────────────────

  async getBySubdomain(subdomain: string): Promise<ClinicWebsite> {
    const site = await this.repo.findOne({
      where: [{ subdomain }, { customDomain: subdomain }],
      relations: ['clinic'],
    });
    if (!site || !site.isPublished) throw new NotFoundException('Website not found or not published');
    return site;
  }

  // ── getForPreview — authenticated preview (no isPublished check) ──────────────

  async getForPreview(clinicId: string): Promise<ClinicWebsite> {
    const site = await this.repo.findOne({
      where: { clinicId },
      relations: ['clinic'],
    });
    if (!site) throw new NotFoundException('Website not found');
    return site;
  }

  async getAvailableSlots(subdomain: string, branchId?: string, doctorId?: string): Promise<Record<string, string[]>> {
    const site = await this.repo.findOne({
      where: [{ subdomain }, { customDomain: subdomain }],
      relations: ['clinic'],
    });
    if (!site) throw new NotFoundException('Website not found');

    const result: Record<string, string[]> = {};
    const today = new Date();

    // Fetch all scheduled appointments for the next 14 days to exclude booked slots
    const rangeStart = new Date(today);
    const rangeEnd   = new Date(today);
    rangeEnd.setDate(today.getDate() + 14);

    const bookedWhere: any = {
      clinicId: site.clinicId,
      status:   AppointmentStatus.SCHEDULED,
    };
    if (branchId) bookedWhere.branchId = branchId;
    if (doctorId) bookedWhere.dentistId = doctorId;

    const bookedApts = await this.aptRepo.find({
      where: bookedWhere,
      select: ['scheduledAt'],
    });

    // Build a Set of booked "YYYY-MM-DD|HH:MM" for fast lookup
    const bookedSet = new Set<string>();
    for (const apt of bookedApts) {
      const at  = new Date(apt.scheduledAt);
      const key = at.toISOString().split('T')[0];
      const hh  = String(at.getHours()).padStart(2, '0');
      const mm  = String(at.getMinutes()).padStart(2, '0');
      // Round down to the nearest 30-min slot
      const roundedMm = at.getMinutes() < 30 ? '00' : '30';
      bookedSet.add(`${key}|${hh}:${roundedMm}`);
    }

    // If a specific doctor was requested and this clinic actually uses the
    // Shift module, prefer that doctor's real per-day shift hours over the
    // clinic-wide working hours — otherwise the site would offer slots the
    // doctor isn't even scheduled to be in for.
    const usesShiftModule = doctorId
      ? await this.shiftResolver.hasAnyShiftConfig(site.clinicId)
      : false;

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = d.toISOString().split('T')[0];

      let startStr: string | undefined;
      let endStr:   string | undefined;

      if (usesShiftModule && doctorId) {
        const resolved = await this.shiftResolver.resolveUserShift(doctorId, site.clinicId, key);
        if (resolved.type !== 'working' || !resolved.shift) {
          result[key] = []; // doctor is off / on leave that day
          continue;
        }
        startStr = resolved.shift.startTime;
        endStr   = resolved.shift.endTime;
      } else {
        const clinic     = site.clinic;
        const dayName    = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const workingDay = clinic?.workingHours?.[dayName] as any;
        if (!workingDay || (!workingDay.start && !workingDay.open)) {
          result[key] = [];
          continue;
        }
        startStr = workingDay.start || workingDay.open  || '09:00';
        endStr   = workingDay.end   || workingDay.close || '17:00';
      }

      const slots: string[] = [];
      const start = this.parseTime(startStr || '09:00');
      const end   = this.parseTime(endStr   || '17:00');
      let cur = start;
      while (cur + 30 <= end) {
        const hh   = String(Math.floor(cur / 60)).padStart(2, '0');
        const mm   = String(cur % 60).padStart(2, '0');
        const slot = `${hh}:${mm}`;
        if (!bookedSet.has(`${key}|${slot}`)) {
          slots.push(slot);
        }
        cur += 30;
      }
      result[key] = slots;
    }

    // Remove dates with no available slots
    for (const key of Object.keys(result)) {
      if (result[key].length === 0) {
        delete result[key];
      }
    }

    return result;
  }

  private parseTime(t: string): number {
    const [h, m] = (t || '09:00').split(':').map(Number);
    return (h || 9) * 60 + (m || 0);
  }

  // ── AI prompt builder ─────────────────────────────────────────────────────────

  private buildAIPrompt(clinic: Clinic, dto: any): string {
    const specialty = dto.specialty || 'general';
    const tone      = dto.tone      || 'professional';
    const template  = dto.template  || 'modern';
    const extra     = dto.clinicInfo || '';

    const toneGuide: Record<string, string> = {
      professional: 'formal, authoritative, reassuring, medical-grade language',
      friendly:     'warm, approachable, conversational, community-focused',
      modern:       'crisp, innovation-forward, tech-savvy, minimal jargon',
      traditional:  'established, trusted, heritage-focused, classic',
    };

    type Testimonial = {
      name: string;
      role: string;
      text: string;
    };

    type SpecialtyContent = {
      services: string[];
      stats: string[];
      testimonials: Testimonial[];
    };

    const specialtyMap: Record<string, SpecialtyContent> = {
      general: {
        services: ['General Consultation', 'Preventive Care', 'Chronic Disease Management', 'Vaccinations & Immunizations', 'Lab Tests & Diagnostics', 'Health Checkups'],
        stats: ['10,000+ Patients Served', '15+ Years Experience', '98% Satisfaction Rate', '24/7 Emergency Care'],
        testimonials: [
          { name: 'Sarah Johnson', role: 'Regular Patient', text: 'The doctors here genuinely care about your health. Excellent service every visit!' },
          { name: 'Michael Chen',  role: 'Patient since 2019', text: 'Quick appointments, thorough examinations, and friendly staff. Highly recommend.' },
          { name: 'Priya Sharma',  role: 'Family Patient', text: 'We bring our whole family here. The pediatric care is outstanding.' },
        ],
      },
      dentistry: {
        services: ['Teeth Cleaning & Polishing', 'Teeth Whitening', 'Dental Implants', 'Root Canal Treatment', 'Braces & Orthodontics', 'Emergency Dental Care'],
        stats: ['5,000+ Smiles Restored', '12+ Years of Excellence', '99% Pain-Free Procedures', '4.9★ Patient Rating'],
        testimonials: [
          { name: 'Emma Williams', role: 'Dental Patient', text: 'My teeth whitening results exceeded my expectations. Truly professional team!' },
          { name: 'David Park',    role: 'Implant Patient', text: 'The dental implant procedure was painless. My smile has never looked better.' },
          { name: 'Lisa Tamang',   role: 'Braces Patient', text: 'The orthodontic team was patient and thorough. My alignment is perfect now.' },
        ],
      },
      dermatology: {
        services: ['Acne Treatment', 'Anti-Aging & Botox', 'Laser Hair Removal', 'Skin Cancer Screening', 'Chemical Peels', 'Eczema & Psoriasis Care'],
        stats: ['8,000+ Skin Transformations', '20+ Dermatologists', '50+ Advanced Treatments', '4.8★ Average Rating'],
        testimonials: [
          { name: 'Aisha Patel',   role: 'Acne Treatment', text: 'My skin has never been clearer. The acne treatment plan actually worked!' },
          { name: 'James Brooks',  role: 'Laser Treatment', text: 'Professional laser hair removal with zero side effects. Excellent results.' },
          { name: 'Mei Lin',       role: 'Anti-Aging Patient', text: 'Subtle, natural-looking results. The team really knows what they\'re doing.' },
        ],
      },
    };

    const sp = specialtyMap[specialty] || specialtyMap['general'];
    const clinicName = clinic.name || 'Our Clinic';
    const city       = clinic.city || '';
    const address    = clinic.address || '';

    return `
You are an expert healthcare website copywriter and JSON architect. Generate a COMPLETE, PRODUCTION-READY clinic website.

Clinic: "${clinicName}"
Location: ${address} ${city}
Specialty: ${specialty}
Tone: ${tone} (${toneGuide[tone] || 'professional'})
Style: ${template}
Extra context: ${extra}

OUTPUT: Return ONLY a valid JSON object (no markdown, no code fences, no comments).

Generate this exact structure:
{
  "pages": [
    {
      "id": "home-page-001",
      "slug": "home",
      "title": "Home",
      "enabled": true,
      "isHome": true,
      "sections": [
        // hero, about, services, stats, team (2-3 doctors), testimonials, appointment-booking, contact
      ]
    },
    {
      "id": "services-page-001",
      "slug": "services",
      "title": "Services",
      "enabled": true,
      "isHome": false,
      "sections": [
        // hero (small), services (detailed), faq, cta-banner
      ]
    },
    {
      "id": "contact-page-001",
      "slug": "contact",
      "title": "Contact",
      "enabled": true,
      "isHome": false,
      "sections": [
        // hero (small), contact, working-hours, map
      ]
    }
  ],
  "theme": {
    "primaryColor": "#0ea5e9",
    "secondaryColor": "#6366f1",
    "accentColor": "#f59e0b",
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "fontHeading": "Poppins",
    "fontBody": "Inter",
    "borderRadius": "lg",
    "buttonStyle": "filled",
    "spacing": "normal"
  },
  "globalSettings": {
    "nav": {
      "logoText": "${clinicName}",
      "sticky": true,
      "transparent": false,
      "links": [
        { "label": "Home", "pageId": "home-page-001" },
        { "label": "Services", "pageId": "services-page-001" },
        { "label": "Contact", "pageId": "contact-page-001" }
      ],
      "ctaButton": { "text": "Book Appointment", "action": "book" }
    },
    "footer": {
      "tagline": "Quality healthcare you can trust.",
      "showSocials": true,
      "columns": [
        {
          "heading": "Quick Links",
          "links": [
            { "label": "Home", "href": "/" },
            { "label": "Services", "href": "/services" },
            { "label": "Contact", "href": "/contact" }
          ]
        }
      ],
      "copyrightText": "© ${new Date().getFullYear()} ${clinicName}. All rights reserved."
    }
  },
  "seo": {
    "title": "${clinicName} — ${specialty} Clinic${city ? ' in ' + city : ''}",
    "description": "Visit ${clinicName} for professional ${specialty} healthcare services. ${city ? 'Located in ' + city + '. ' : ''}Book your appointment today."
  }
}

SECTION REQUIREMENTS:

Hero section must have:
- headline: Compelling 6-10 word headline for "${clinicName}"
- subheadline: 15-25 word supportive description
- ctaText: "Book Appointment"
- ctaAction: "scroll-to-booking"
- secondaryCtaText: "Our Services"
- secondaryCtaAction: "link"
- backgroundType: "gradient"
- backgroundValue: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"
- layout: "center"
- minHeight: "large"

Services section must have 6 real services for "${specialty}":
Use these: ${JSON.stringify(sp.services)}
Each service: { id, title, icon (emoji), description (20-30 words), price (optional) }

Stats section must have 4 compelling stats:
Use: ${JSON.stringify(sp.stats)}
Each: { value, label }

Testimonials: 3 realistic reviews:
${JSON.stringify(sp.testimonials)}
Each: { id, name, role, rating: 5, text }

Team section: 2-3 doctors with names, specializations, bios.

Contact section: Include address "${address}", realistic working hours.

FAQ section on services page: 5 relevant questions for "${specialty}".

Make ALL copy compelling, realistic, and specific to "${clinicName}" and "${specialty}". 
Generate realistic doctor names appropriate for Nepal/Asia context if no specific names provided.
Every text field must have real, meaningful content — no placeholder text like "Lorem ipsum".
`;
  }

  // ── Utility ───────────────────────────────────────────────────────────────────

  private deepMerge(target: any, source: any): any {
    if (!source) return target;
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }
}