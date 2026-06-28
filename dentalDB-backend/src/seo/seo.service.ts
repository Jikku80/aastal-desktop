import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicWebsite } from '../website-builder/entities/clinic-website.entity';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';
import { SeoRedirect } from './entities/seo-redirect.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

// ── Public types ──────────────────────────────────────────────────────────────

export interface SeoHealthReport {
  score:    number;
  issues:   string[];
  warnings: string[];
  passed:   string[];
}

export interface AiSeoSuggestions {
  suggestedTitle:        string;
  suggestedDescription:  string;
  suggestedKeywords:     string[];
  suggestedBlogTopics:   string[];
  suggestedFaqs:         Array<{ question: string; answer: string }>;
  seoScore:              number;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface SitemapImage {
  loc:      string;
  title?:   string;
  caption?: string;
}

interface SitemapUrl {
  loc:         string;
  lastmod?:    string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?:   string;
  images?:     SitemapImage[];
  /** xhtml:link entries for hreflang (future multi-language) */
  alternates?: Array<{ hreflang: string; href: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    @InjectRepository(ClinicWebsite) private websiteRepo: Repository<ClinicWebsite>,
    @InjectRepository(BlogPost)      private blogRepo:    Repository<BlogPost>,
    @InjectRepository(User)          private userRepo:    Repository<User>,
    @InjectRepository(Clinic)        private clinicRepo:  Repository<Clinic>,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Domain resolution
  // ──────────────────────────────────────────────────────────────────────────

  getCanonicalDomain(site: ClinicWebsite): string {
    const override = (site.seo as any)?.canonicalDomain;
    if (override) {
      const cleaned = String(override).replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `https://${cleaned}`;
    }
    const custom = site.customDomain;
    if (custom) {
      const cleaned = custom.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `https://${cleaned}`;
    }
    const base = process.env.SITE_DOMAIN || 'clinickarobar.com';
    return `https://${site.subdomain}.${base}`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sitemap generation
  // Requirements: homepage, services, doctors, blogs, contact/about,
  //   dynamic pages, lastmod, image sitemap, hreflang stubs for future i18n
  // ──────────────────────────────────────────────────────────────────────────

  async generateSitemap(identifier: string): Promise<string> {
    const site   = await this.resolveSite(identifier);
    const domain = this.getCanonicalDomain(site);
    const urls: SitemapUrl[] = [];

    // ── 1. Website-builder pages (homepage, services, contact, about, etc.) ──
    const enabledPages = (site.pages || []).filter(p => p.enabled);

    for (const page of enabledPages) {
      const loc = page.isHome
        ? `${domain}/`
        : `${domain}/?page=${page.slug}`;

      const images: SitemapImage[] = this.extractImagesFromSections(page.sections || []);

      urls.push({
        loc,
        lastmod:    site.updatedAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
        changefreq: page.isHome ? 'weekly' : 'monthly',
        priority:   page.isHome ? '1.0' : '0.8',
        images:     images.length ? images : undefined,
      });
    }

    // ── 2. Doctor profile pages (if site exposes doctor pages) ───────────────
    const doctors = await this.userRepo.find({
      where: { clinicId: site.clinicId, isActive: true },
      select: ['id', 'firstName', 'lastName', 'updatedAt', 'role', 'avatar'],
    });
    const doctorRoles: string[] = [UserRole.DENTIST, UserRole.OWNER];
    const publicDoctors = doctors.filter(d => doctorRoles.includes(d.role));

    for (const doc of publicDoctors) {
      const images: SitemapImage[] = [];
      if ((doc as any).avatar) {
        images.push({ loc: (doc as any).avatar, title: `Dr. ${doc.firstName} ${doc.lastName}` });
      }
      urls.push({
        loc:        `${domain}/?page=doctors#doctor-${doc.id}`,
        lastmod:    doc.updatedAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority:   '0.6',
        images:     images.length ? images : undefined,
      });
    }

    // ── 3. Blog posts ─────────────────────────────────────────────────────────
    const blogs = await this.blogRepo.find({
      where:  { clinicId: site.clinicId, status: BlogStatus.PUBLISHED, indexable: true },
      order:  { publishedAt: 'DESC' },
      select: ['id', 'slug', 'title', 'updatedAt', 'featuredImage', 'categories'],
    });

    for (const blog of blogs) {
      const images: SitemapImage[] = [];
      if (blog.featuredImage) images.push({ loc: blog.featuredImage, title: blog.title });

      urls.push({
        loc:        `${domain}/blog/${blog.slug}`,
        lastmod:    blog.updatedAt.toISOString().split('T')[0],
        changefreq: 'monthly',
        priority:   '0.7',
        images:     images.length ? images : undefined,
      });
    }

    // ── 4. Blog index + category pages ───────────────────────────────────────
    if (blogs.length > 0) {
      urls.push({
        loc:        `${domain}/blog`,
        lastmod:    new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority:   '0.6',
      });

      const categories = [
        ...new Set(blogs.flatMap(b => b.categories ?? [])),
      ];
      for (const cat of categories) {
        urls.push({
          loc:        `${domain}/blog/category/${encodeURIComponent(cat)}`,
          lastmod:    new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority:   '0.5',
        });
      }
    }

    return this.buildSitemapXml(urls);
  }

  private extractImagesFromSections(sections: any[]): SitemapImage[] {
    const images: SitemapImage[] = [];
    for (const section of sections) {
      const s = section?.settings ?? {};
      const candidates: string[] = [
        s.image, s.coverImage, s.backgroundValue, s.ogImage,
        ...(Array.isArray(s.items) ? s.items.flatMap((i: any) => [i.image, i.url, i.avatar]) : []),
        ...(Array.isArray(s.team)  ? s.team.flatMap((t: any)  => [t.image, t.avatar]) : []),
      ].filter((v): v is string => typeof v === 'string' && v.startsWith('http'));

      for (const imgUrl of candidates) {
        images.push({ loc: imgUrl });
      }
    }
    return images;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // robots.txt generation
  // Requirements: environment-aware, block admin/api/preview, sitemap URL
  // ──────────────────────────────────────────────────────────────────────────

  async generateRobotsTxt(identifier: string): Promise<string> {
    const site      = await this.resolveSite(identifier);
    const domain    = this.getCanonicalDomain(site);
    const isStaging = process.env.NODE_ENV !== 'production';
    const noindex   = (site.seo as any)?.noindex === true;

    // Staging / unpublished / noindex → disallow all
    if (isStaging || !site.isPublished || noindex) {
      return [
        'User-agent: *',
        'Disallow: /',
        '',
        `# Sitemap: ${domain}/sitemap.xml`,
      ].join('\n');
    }

    return [
      'User-agent: *',
      'Allow: /',
      '',
      '# Admin & private routes',
      'Disallow: /admin',
      'Disallow: /dashboard',
      'Disallow: /api/',
      'Disallow: /api/private',
      'Disallow: /_next/',
      'Disallow: /preview',
      'Disallow: /internal/',
      '',
      '# Well-behaved crawl delay',
      'Crawl-delay: 1',
      '',
      `Sitemap: ${domain}/sitemap.xml`,
    ].join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Schema.org generators
  // Requirements: MedicalClinic, Dentist, Doctor, LocalBusiness, FAQPage,
  //   BlogPosting, Article, BreadcrumbList — all with proper fields
  // ──────────────────────────────────────────────────────────────────────────

  generateClinicSchema(site: ClinicWebsite, clinic: Clinic): Record<string, any> {
    const domain  = this.getCanonicalDomain(site);
    const seo     = (site.seo as any) ?? {};
    const type    = seo.clinicType ?? 'MedicalClinic';

    const schema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type':    type,
      '@id':      `${domain}/#clinic`,
      name:       clinic.name,
      url:        domain,
    };

    if (clinic.phone)   schema.telephone = clinic.phone;
    if (clinic.email)   schema.email     = clinic.email;
    if (clinic.logo)    schema.logo      = { '@type': 'ImageObject', url: clinic.logo };
    if (clinic.website) schema.sameAs    = [clinic.website];

    // NAP — Name Address Phone (crucial for Local SEO)
    const city    = clinic.city    || seo.city    || '';
    const country = seo.country || 'NP';
    if (clinic.address || city) {
      schema.address = {
        '@type':         'PostalAddress',
        streetAddress:   clinic.address ?? '',
        addressLocality: city,
        addressCountry:  country,
      };
    }

    // Geo coordinates
    if (seo.latitude && seo.longitude) {
      schema.geo = {
        '@type':    'GeoCoordinates',
        latitude:   seo.latitude,
        longitude:  seo.longitude,
      };
      // hasMap for Google Maps
      schema.hasMap = `https://www.google.com/maps?q=${seo.latitude},${seo.longitude}`;
    }

    // Aggregate rating / reviews
    if (seo.aggregateRating?.ratingValue && seo.aggregateRating?.reviewCount) {
      schema.aggregateRating = {
        '@type':      'AggregateRating',
        ratingValue:  seo.aggregateRating.ratingValue,
        reviewCount:  seo.aggregateRating.reviewCount,
        bestRating:   5,
        worstRating:  1,
      };
    }

    // Opening hours
    const openingHours = this.buildOpeningHoursSpec(clinic.workingHours);
    if (openingHours.length) {
      schema.openingHoursSpecification = openingHours;
    }

    // Social profiles (SameAs) from footer settings
    const socials = site.globalSettings?.footer?.socials ?? {};
    const socialUrls = Object.values(socials).filter(
      (v): v is string => typeof v === 'string' && v.startsWith('http'),
    );
    if (socialUrls.length) {
      schema.sameAs = [...(schema.sameAs ?? []), ...socialUrls];
    }

    // potentialAction — Book appointment
    schema.potentialAction = {
      '@type':  'ReserveAction',
      target:   `${domain}/?page=appointment`,
      name:     'Book Appointment',
    };

    return schema;
  }

  generateDoctorSchema(
    doctor: Pick<User, 'id' | 'firstName' | 'lastName' | 'role'> & {
      avatar?: string | null;
      bio?: string | null;
      specialization?: string | null;
    },
    clinicSchema: Record<string, any>,
    domain: string,
  ): Record<string, any> {
    const schema: Record<string, any> = {
      '@context':  'https://schema.org',
      '@type':     'Physician',
      '@id':       `${domain}/?page=doctors#doctor-${doctor.id}`,
      name:        `${doctor.firstName} ${doctor.lastName}`.trim(),
      url:         `${domain}/?page=doctors#doctor-${doctor.id}`,
      worksFor:    { '@id': clinicSchema['@id'] },
    };

    if ((doctor as any).avatar)         schema.image           = (doctor as any).avatar;
    if ((doctor as any).bio)            schema.description     = (doctor as any).bio;
    if ((doctor as any).specialization) schema.medicalSpecialty = (doctor as any).specialization;

    return schema;
  }

  generateLocalBusinessSchema(site: ClinicWebsite, clinic: Clinic): Record<string, any> {
    const base = this.generateClinicSchema(site, clinic);
    return {
      ...base,
      '@type': ['LocalBusiness', base['@type']],
      priceRange: '$$',
    };
  }

  generateFaqSchema(faqs: Array<{ question: string; answer: string }>): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type':    'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name:    f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text:    f.answer,
        },
      })),
    };
  }

  generateBlogPostSchema(post: BlogPost, domain: string): Record<string, any> {
    return {
      '@context':    'https://schema.org',
      '@type':       'BlogPosting',
      headline:      post.title,
      description:   post.excerpt ?? post.metaDescription ?? '',
      url:           `${domain}/blog/${post.slug}`,
      datePublished: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
      dateModified:  post.updatedAt.toISOString(),
      author: {
        '@type': 'Person',
        name:    post.authorName ?? 'Clinic Team',
      },
      publisher: {
        '@type': 'Organization',
        name:    'Clinic',  // overridden at call site
        '@id':   domain,
      },
      image:    post.featuredImage ?? undefined,
      keywords: [...(post.metaKeywords ?? []), ...(post.tags ?? [])].join(', ') || undefined,
      inLanguage: 'en',
    };
  }

  generateArticleSchema(post: BlogPost, domain: string): Record<string, any> {
    return {
      ...this.generateBlogPostSchema(post, domain),
      '@type': 'Article',
    };
  }

  generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type':    'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type':  'ListItem',
        position: i + 1,
        name:     item.name,
        item:     item.url,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Auto SEO meta generation from clinic content
  // ──────────────────────────────────────────────────────────────────────────

  autoGenerateSeoMeta(
    clinic: Pick<Clinic, 'name' | 'city'> & { services?: string[]; specialties?: string[] },
    page?: { title: string; slug: string; isHome?: boolean },
  ): { title: string; description: string; keywords: string[] } {
    const name       = clinic.name || 'Clinic';
    const city       = clinic.city || '';
    const services   = clinic.services   ?? [];
    const specialties = clinic.specialties ?? [];

    let title:       string;
    let description: string;

    if (!page || page.isHome) {
      const cityPart = city ? ` in ${city}` : '';
      const svcPart  = services.length ? ` — ${services.slice(0, 2).join(', ')}` : '';
      title          = `${name}${cityPart}${svcPart}`;
      description    = `${name}${cityPart} offers professional healthcare services${services.length ? `: ${services.slice(0, 3).join(', ')}` : ''}. Book your appointment online today.`;
    } else {
      title       = `${page.title} | ${name}${city ? `, ${city}` : ''}`;
      description = `${page.title} at ${name}${city ? ` in ${city}` : ''}. Professional healthcare services. Book an appointment online.`;
    }

    const keywords = Array.from(new Set([
      name,
      ...(city ? [`clinic ${city}`, `doctor ${city}`, `${name} ${city}`] : []),
      ...services.slice(0, 4),
      ...specialties.slice(0, 3),
    ])).filter(Boolean);

    return { title, description, keywords };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI SEO hooks (architecture-ready — swap body for LLM call)
  // ──────────────────────────────────────────────────────────────────────────

  async generateAiSeoSuggestions(
    clinic: Pick<Clinic, 'name' | 'city'>,
    _existingSeo: Record<string, any>,
  ): Promise<AiSeoSuggestions> {
    // ── Architecture hook ──────────────────────────────────────────────────
    // Replace this body with an Anthropic / OpenAI API call.
    // Prompt template:
    //   "You are an SEO expert for medical clinics. Given the clinic info below,
    //    generate: title, meta description, 10 keywords, 5 blog topics, 3 FAQs.
    //    Return JSON only."
    //
    // Example:
    //   const response = await anthropic.messages.create({
    //     model: 'claude-opus-4-5',
    //     messages: [{ role: 'user', content: buildSeoPrompt(clinic, existingSeo) }],
    //     max_tokens: 1024,
    //   });
    // ─────────────────────────────────────────────────────────────────────────

    const auto = this.autoGenerateSeoMeta(clinic);
    const city  = clinic.city ?? '';
    const name  = clinic.name;

    return {
      suggestedTitle:       auto.title,
      suggestedDescription: auto.description,
      suggestedKeywords:    auto.keywords,
      suggestedBlogTopics:  [
        `Top 5 Health Tips from ${name}`,
        `Why Regular Checkups Matter${city ? ` in ${city}` : ''}`,
        `What to Expect on Your First Visit to ${name}`,
        `How to Choose the Right Doctor${city ? ` in ${city}` : ''}`,
        `Understanding Your Health Insurance Options`,
      ],
      suggestedFaqs: [
        { question: `Where is ${name} located?`,     answer: city ? `We are located in ${city}. Contact us for exact directions.` : 'Please contact us for location details.' },
        { question: 'How do I book an appointment?', answer: 'You can book online via our website, call us, or walk in during working hours.' },
        { question: 'What services do you offer?',   answer: `${name} offers a range of healthcare services. Please visit our services page or contact us for details.` },
      ],
      seoScore: 50, // placeholder — real score from auditSeoHealth()
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SEO health audit
  // ──────────────────────────────────────────────────────────────────────────

  async auditSeoHealth(clinicId: string): Promise<SeoHealthReport> {
    const site = await this.websiteRepo.findOne({
      where:     { clinicId },
      relations: ['clinic'],
    });
    if (!site) {
      return { score: 0, issues: ['Website not found'], warnings: [], passed: [] };
    }

    const issues:   string[] = [];
    const warnings: string[] = [];
    const passed:   string[] = [];
    const seo = (site.seo as any) ?? {};

    // ── Critical ──────────────────────────────────────────────────────────
    if (!seo.title)                              issues.push('Missing site-wide SEO title');
    if (!seo.description)                        issues.push('Missing meta description');
    if (!site.isPublished)                       issues.push('Website is not published — not indexable');
    if (!site.subdomain && !site.customDomain)   issues.push('No domain configured');

    // ── Warnings ──────────────────────────────────────────────────────────
    if (!seo.googleAnalyticsId)                  warnings.push('Google Analytics not connected');
    if (!seo.googleTagManagerId)                 warnings.push('Google Tag Manager not connected');
    if (!seo.googleSiteVerification)             warnings.push('Google Search Console not verified');
    if (!seo.ogImage)                            warnings.push('No Open Graph image — affects social sharing');
    if (!seo.city)                               warnings.push('No city set for local SEO');
    if (!seo.latitude || !seo.longitude)         warnings.push('No geo coordinates — affects Google Maps ranking');
    if (!seo.aggregateRating)                    warnings.push('No ratings configured — ratings boost CTR');
    if (!seo.clinicType)                         warnings.push('Clinic schema type not set (defaults to MedicalClinic)');

    // ── Image alt warnings ────────────────────────────────────────────────
    let imagesWithoutAlt = 0;
    for (const page of site.pages ?? []) {
      for (const section of page.sections ?? []) {
        const items = section?.settings?.items ?? [];
        for (const item of items) {
          if (item?.image && !item?.imageAlt && !item?.alt) {
            imagesWithoutAlt++;
          }
        }
      }
    }
    if (imagesWithoutAlt > 0) {
      warnings.push(`${imagesWithoutAlt} image(s) missing alt text — hurts accessibility & SEO`);
    }

    // ── Page-level ────────────────────────────────────────────────────────
    let pagesWithoutTitle = 0;
    for (const page of site.pages ?? []) {
      if (!page.seo?.title) pagesWithoutTitle++;
    }
    if (pagesWithoutTitle > 0) {
      warnings.push(`${pagesWithoutTitle} page(s) missing custom SEO title`);
    }

    // ── Blog ──────────────────────────────────────────────────────────────
    const blogCount = await this.blogRepo.count({
      where: { clinicId, status: BlogStatus.PUBLISHED },
    });
    if (blogCount === 0) {
      warnings.push('No published blog posts — blogging significantly boosts SEO');
    } else {
      passed.push(`${blogCount} published blog post${blogCount > 1 ? 's' : ''}`);
    }

    // ── Domain ────────────────────────────────────────────────────────────
    if (site.customDomain && !site.domainVerified) {
      warnings.push('Custom domain not yet verified');
    }

    // ── Passed ────────────────────────────────────────────────────────────
    if (seo.title)                                    passed.push('SEO title configured');
    if (seo.description)                              passed.push('Meta description configured');
    if (seo.keywords?.length)                         passed.push(`${seo.keywords.length} keyword(s) configured`);
    if (seo.googleAnalyticsId)                        passed.push('Google Analytics connected');
    if (seo.googleTagManagerId)                       passed.push('Google Tag Manager connected');
    if (seo.googleSiteVerification)                   passed.push('Google Search Console verified');
    if (seo.ogImage)                                  passed.push('Open Graph image set');
    if (seo.latitude && seo.longitude)                passed.push('Geo coordinates configured');
    if (site.customDomain && site.domainVerified)     passed.push('Custom domain verified');
    if (site.pages?.length)                           passed.push(`${site.pages.length} page(s) configured`);
    if (seo.aggregateRating)                          passed.push('Aggregate rating configured');

    // ── Score ─────────────────────────────────────────────────────────────
    const issueScore   = issues.length   * 3;
    const warningScore = warnings.length * 1;
    const passedScore  = passed.length   * 2;
    const total        = issueScore + warningScore + passedScore;
    const score        = total > 0
      ? Math.max(0, Math.min(100, Math.round((passedScore / total) * 100)))
      : 0;

    return { score, issues, warnings, passed };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Search engine ping
  // ──────────────────────────────────────────────────────────────────────────

  async pingSitemapToSearchEngines(sitemapUrl: string): Promise<void> {
    const endpoints = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ];
    for (const url of endpoints) {
      fetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => {
        // Non-critical — fire-and-forget
      });
    }
    this.logger.log(`Pinged search engines: ${sitemapUrl}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Redirect management
  // ──────────────────────────────────────────────────────────────────────────

  async findRedirect(
    clinicId: string,
    fromPath: string,
    redirectRepo: Repository<SeoRedirect>,
  ): Promise<SeoRedirect | null> {
    const normalized = fromPath.replace(/\/$/, '') || '/';
    return redirectRepo.findOne({
      where: { clinicId, fromPath: normalized, isActive: true },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Domain lifecycle — called when custom domain is connected / verified
  // ──────────────────────────────────────────────────────────────────────────

  async onDomainConnected(clinicId: string): Promise<{
    sitemapUrl:            string;
    robotsTxtUrl:          string;
    canonicalUpdated:      boolean;
    searchConsoleguide:    string[];
    sslNote:               string;
  }> {
    const site = await this.websiteRepo.findOne({
      where:     { clinicId },
      relations: ['clinic'],
    });
    if (!site) throw new NotFoundException('Website not found');

    const domain = this.getCanonicalDomain(site);

    // Fire sitemap ping asynchronously
    if (site.isPublished) {
      this.pingSitemapToSearchEngines(`${domain}/sitemap.xml`).catch(() => {});
    }

    return {
      sitemapUrl:         `${domain}/sitemap.xml`,
      robotsTxtUrl:       `${domain}/robots.txt`,
      canonicalUpdated:   true,
      searchConsoleguide: [
        `1. Go to https://search.google.com/search-console`,
        `2. Add property: ${domain}`,
        `3. Choose "URL prefix" method`,
        `4. Select "HTML tag" verification`,
        `5. Copy the content= value from the meta tag`,
        `6. Paste it into your clinic's SEO settings → Analytics tab → "Google Search Console Verification"`,
        `7. Save, then click Verify in Search Console`,
        `8. Submit your sitemap: ${domain}/sitemap.xml`,
      ],
      sslNote: 'SSL is provisioned automatically via Let\'s Encrypt when the DNS A/CNAME record is configured correctly.',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Site resolver (shared)
  // ──────────────────────────────────────────────────────────────────────────

  async resolveSite(identifier: string): Promise<ClinicWebsite> {
    const normalized = identifier.replace(/^www\./, '');
    const site = await this.websiteRepo.findOne({
      where: [
        { subdomain:    normalized },
        { customDomain: normalized },
        { customDomain: `www.${normalized}` },
      ],
      relations: ['clinic'],
    });
    if (!site) throw new NotFoundException(`Website not found: ${identifier}`);
    return site;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private buildOpeningHoursSpec(
    workingHours: Record<string, { start: string; end: string } | null> | null | undefined,
  ): Record<string, any>[] {
    if (!workingHours) return [];
    const dayMap: Record<string, string> = {
      monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
      thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
    };
    return Object.entries(workingHours)
      .filter(([day, slot]) => slot !== null && dayMap[day])
      .map(([day, slot]) => ({
        '@type':    'OpeningHoursSpecification',
        dayOfWeek:  `https://schema.org/${dayMap[day]}`,
        opens:      slot!.start,
        closes:     slot!.end,
      }));
  }

  private buildSitemapXml(urls: SitemapUrl[]): string {
    const urlset = urls.map(u => {
      let entry = `  <url>\n    <loc>${escXml(u.loc)}</loc>\n`;
      if (u.lastmod)    entry += `    <lastmod>${u.lastmod}</lastmod>\n`;
      if (u.changefreq) entry += `    <changefreq>${u.changefreq}</changefreq>\n`;
      if (u.priority)   entry += `    <priority>${u.priority}</priority>\n`;

      for (const img of u.images ?? []) {
        entry += `    <image:image>\n`;
        entry += `      <image:loc>${escXml(img.loc)}</image:loc>\n`;
        if (img.title)   entry += `      <image:title>${escXml(img.title)}</image:title>\n`;
        if (img.caption) entry += `      <image:caption>${escXml(img.caption)}</image:caption>\n`;
        entry += `    </image:image>\n`;
      }

      // xhtml:link alternates (multi-language — future i18n)
      for (const alt of u.alternates ?? []) {
        entry += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escXml(alt.href)}"/>\n`;
      }

      entry += `  </url>`;
      return entry;
    }).join('\n');

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset`,
      `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
      `  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`,
      `  xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
      urlset,
      `</urlset>`,
    ].join('\n');
  }
}

// ── XML escape helper ─────────────────────────────────────────────────────────

function escXml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}
