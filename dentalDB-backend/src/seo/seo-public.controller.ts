import {
  Controller, Get, Param, Query, Res, NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { SeoService } from './seo.service';
import { BlogService } from './blog.service';
import { ClinicWebsite } from '../website-builder/entities/clinic-website.entity';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

@ApiTags('SEO (Public)')
@Controller()
export class SeoPublicController {
  constructor(
    private readonly seoService:  SeoService,
    private readonly blogService: BlogService,
    @InjectRepository(ClinicWebsite) private websiteRepo: Repository<ClinicWebsite>,
    @InjectRepository(BlogPost)      private blogRepo:    Repository<BlogPost>,
    @InjectRepository(User)          private userRepo:    Repository<User>,
    @InjectRepository(Clinic)        private clinicRepo:  Repository<Clinic>,
  ) {}

  // ── /sitemap.xml via Host header (custom-domain & subdomain sites) ─────────

  @Get('sitemap.xml')
  async sitemapFromHost(@Res() res: Response): Promise<void> {
    const host = this.hostFromReq(res);
    await this.serveSitemap(host, res);
  }

  @Get('seo/:identifier/sitemap.xml')
  async sitemapByIdentifier(
    @Param('identifier') identifier: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.serveSitemap(identifier, res);
  }

  // ── /robots.txt ────────────────────────────────────────────────────────────

  @Get('robots.txt')
  async robotsFromHost(@Res() res: Response): Promise<void> {
    const host = this.hostFromReq(res);
    await this.serveRobots(host, res);
  }

  @Get('seo/:identifier/robots.txt')
  async robotsByIdentifier(
    @Param('identifier') identifier: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.serveRobots(identifier, res);
  }

  // ── Schema.org JSON-LD ─────────────────────────────────────────────────────

  @Get('seo/:identifier/schema.json')
  async getClinicSchema(@Param('identifier') identifier: string) {
    const site   = await this.seoService.resolveSite(identifier);
    const clinic = site.clinic as Clinic;
    const main   = this.seoService.generateClinicSchema(site, clinic);

    // Also include doctor schemas
    const doctors = await this.userRepo.find({
      where:  { clinicId: site.clinicId, isActive: true },
      select: ['id', 'firstName', 'lastName', 'role', 'avatar', 'updatedAt'],
    });
    const doctorRoles = [UserRole.DENTIST, UserRole.OWNER];
    const domain = this.seoService.getCanonicalDomain(site);

    const doctorSchemas = doctors
      .filter(d => doctorRoles.includes(d.role))
      .map(d => this.seoService.generateDoctorSchema(
        d as any,
        main,
        domain,
      ));

    return { clinic: main, doctors: doctorSchemas };
  }

  // ── Per-page SEO meta (used by SSR pages to build <head>) ─────────────────

  @Get('seo/:identifier/meta')
  async getPageMeta(
    @Param('identifier') identifier: string,
    @Query('page') pageSlug?: string,
  ) {
    const site   = await this.seoService.resolveSite(identifier);
    const clinic = site.clinic as Clinic;
    const domain = this.seoService.getCanonicalDomain(site);
    const seo    = (site.seo as any) ?? {};

    const page = (site.pages ?? []).find(p =>
      pageSlug
        ? (pageSlug === 'home' ? p.isHome : p.slug === pageSlug)
        : p.isHome,
    );

    const auto = this.seoService.autoGenerateSeoMeta(
      { name: clinic.name, city: clinic.city ?? '' },
      page ? { title: page.title, slug: page.slug, isHome: page.isHome } : undefined,
    );

    const pageSeo: Record<string, string> = (page?.seo as any) ?? {};

    return {
      title:       pageSeo['title']       || seo.title       || auto.title,
      description: pageSeo['description'] || seo.description || auto.description,
      keywords:    seo.keywords?.length   ? seo.keywords     : auto.keywords,
      ogImage:     seo.ogImage            || '',
      canonical:   page
        ? `${domain}${page.isHome ? '/' : `/?page=${page.slug}`}`
        : `${domain}/`,
      noindex:     seo.noindex            || !site.isPublished,
      // Analytics IDs for client injection
      googleAnalyticsId:      seo.googleAnalyticsId      ?? null,
      googleTagManagerId:     seo.googleTagManagerId     ?? null,
      googleSiteVerification: seo.googleSiteVerification ?? null,
      bingSiteVerification:   seo.bingSiteVerification   ?? null,
      facebookPixelId:        seo.facebookPixelId        ?? null,
    };
  }

  // ── Blog — public listing ──────────────────────────────────────────────────

  @Get('seo/:identifier/blog')
  async listBlog(
    @Param('identifier') identifier: string,
    @Query('category') category?: string,
    @Query('tag')      tag?:      string,
    @Query('author')   author?:   string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    const site = await this.seoService.resolveSite(identifier);
    return this.blogService.listPublished(site.clinicId, {
      category,
      tag,
      author,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('seo/:identifier/blog/categories')
  async getBlogCategories(@Param('identifier') identifier: string) {
    const site = await this.seoService.resolveSite(identifier);
    return this.blogService.getCategories(site.clinicId);
  }

  @Get('seo/:identifier/blog/tags')
  async getBlogTags(@Param('identifier') identifier: string) {
    const site = await this.seoService.resolveSite(identifier);
    return this.blogService.getTags(site.clinicId);
  }

  /** Author pages — /blog/author/:name */
  @Get('seo/:identifier/blog/author/:name')
  async getBlogByAuthor(
    @Param('identifier') identifier: string,
    @Param('name')       authorName: string,
    @Query('page')       page?:      string,
    @Query('limit')      limit?:     string,
  ) {
    const site = await this.seoService.resolveSite(identifier);
    return this.blogService.listByAuthor(site.clinicId, decodeURIComponent(authorName), {
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  /** Single post with full schema + related posts */
  @Get('seo/:identifier/blog/:slug')
  async getBlogPost(
    @Param('identifier') identifier: string,
    @Param('slug')       slug:       string,
  ) {
    const site   = await this.seoService.resolveSite(identifier);
    const domain = this.seoService.getCanonicalDomain(site);
    const post   = await this.blogService.findBySlug(site.clinicId, slug);

    const schema        = this.seoService.generateBlogPostSchema(post, domain);
    const articleSchema = this.seoService.generateArticleSchema(post, domain);

    const breadcrumb = this.seoService.generateBreadcrumbSchema([
      { name: (site.clinic as Clinic).name, url: `${domain}/` },
      { name: 'Blog', url: `${domain}/blog` },
      { name: post.title, url: `${domain}/blog/${slug}` },
    ]);

    return { post, schema, articleSchema, breadcrumb };
  }

  @Get('seo/:identifier/blog/:slug/related')
  async getRelated(
    @Param('identifier') identifier: string,
    @Param('slug')       slug:       string,
    @Query('limit')      limit?:     string,
  ) {
    const site  = await this.seoService.resolveSite(identifier);
    const post  = await this.blogService.findBySlug(site.clinicId, slug);
    return this.blogService.getRelated(site.clinicId, post.id, limit ? parseInt(limit, 10) : 3);
  }

  @Get('seo/:identifier/blog/:slug/link-suggestions')
  async getInternalLinkSuggestions(
    @Param('identifier') identifier: string,
    @Param('slug')       slug:       string,
  ) {
    const site = await this.seoService.resolveSite(identifier);
    const post = await this.blogService.findBySlug(site.clinicId, slug);
    return this.blogService.getInternalLinkSuggestions(site.clinicId, {
      id:      post.id,
      content: post.content ?? '',
      tags:    post.tags,
    });
  }

  // ── Doctors (for schema + public pages) ───────────────────────────────────

  @Get('seo/:identifier/doctors')
  async getDoctors(@Param('identifier') identifier: string) {
    const site   = await this.seoService.resolveSite(identifier);
    const domain = this.seoService.getCanonicalDomain(site);
    const siteSchema = this.seoService.generateClinicSchema(site, site.clinic as Clinic);

    const doctors = await this.userRepo.find({
      where:  { clinicId: site.clinicId, isActive: true },
    });

    const doctorRoles = [UserRole.DENTIST, UserRole.OWNER];
    return doctors
      .filter(d => doctorRoles.includes(d.role))
      .map(d => ({
        id:             d.id,
        name:           `${d.firstName} ${d.lastName}`.trim(),
        role:           d.role,
        avatar:         (d as any).avatar ?? null,
        bio:            (d as any).bio ?? null,
        specialization: (d as any).specialization ?? null,
        schema:         this.seoService.generateDoctorSchema(d as any, siteSchema, domain),
      }));
  }

  // ── SEO health check (also used by admin dashboard) ───────────────────────

  @Get('seo/:identifier/health')
  async getSeoHealth(@Param('identifier') identifier: string) {
    const site = await this.seoService.resolveSite(identifier);
    return this.seoService.auditSeoHealth(site.clinicId);
  }

  // ── AI SEO suggestions (architecture hook) ─────────────────────────────────

  @Get('seo/:identifier/ai-suggestions')
  async getAiSuggestions(@Param('identifier') identifier: string) {
    const site   = await this.seoService.resolveSite(identifier);
    const clinic = site.clinic as Clinic;
    return this.seoService.generateAiSeoSuggestions(
      { name: clinic.name, city: clinic.city ?? '' },
      (site.seo as any) ?? {},
    );
  }

  // ── Domain lifecycle ───────────────────────────────────────────────────────
  // Called automatically by the website builder when a custom domain is saved

  @Get('seo/:identifier/domain-readiness')
  async getDomainReadiness(@Param('identifier') identifier: string) {
    const site = await this.seoService.resolveSite(identifier);
    return this.seoService.onDomainConnected(site.clinicId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private hostFromReq(res: Response): string {
    const req = (res as any).req;
    const host = (req.headers['x-clinic-host'] as string) ||
                 (req.headers['host'] as string) || '';
    return host.replace(/:\d+$/, '').replace(/^www\./, '');
  }

  private async serveSitemap(identifier: string, res: Response): Promise<void> {
    try {
      const xml = await this.seoService.generateSitemap(identifier);
      res.setHeader('Content-Type',  'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
      res.send(xml);
    } catch {
      res.status(404).send('<?xml version="1.0"?><error>Not found</error>');
    }
  }

  private async serveRobots(identifier: string, res: Response): Promise<void> {
    try {
      const txt = await this.seoService.generateRobotsTxt(identifier);
      res.setHeader('Content-Type',  'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.send(txt);
    } catch {
      res.status(404).send('User-agent: *\nDisallow: /\n');
    }
  }
}
