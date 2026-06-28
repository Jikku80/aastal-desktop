import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ilike } from '../database/sql-helpers';
import { Repository, Like } from 'typeorm';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';
import { SeoService } from './seo.service';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateBlogPostDto {
  title:            string;
  slug?:            string;
  excerpt?:         string;
  content?:         string;
  featuredImage?:   string;
  authorName?:      string;
  authorId?:        string;
  categories?:      string[];
  tags?:            string[];
  status?:          BlogStatus;
  metaTitle?:       string;
  metaDescription?: string;
  metaKeywords?:    string[];
  ogImage?:         string;
  indexable?:       boolean;
}

export type UpdateBlogPostDto = Partial<CreateBlogPostDto>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function computeReadingTime(html: string): number {
  const text      = html.replace(/<[^>]*>/g, ' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/** Extract all hrefs from HTML content for internal-link analysis */
function extractLinks(html: string): string[] {
  const hrefs: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost) private blogRepo: Repository<BlogPost>,
    private readonly seoService: SeoService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Admin CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(
    clinicId: string,
    opts: {
      status?:   BlogStatus;
      category?: string;
      tag?:      string;
      author?:   string;
      q?:        string;
      page?:     number;
      limit?:    number;
    },
  ) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const skip  = (page - 1) * limit;

    const qb = this.blogRepo.createQueryBuilder('b')
      .where('b.clinicId = :clinicId', { clinicId })
      .orderBy('b.publishedAt', 'DESC')
      .addOrderBy('b.createdAt', 'DESC')
      .take(limit)
      .skip(skip);

    if (opts.status)   qb.andWhere('b.status = :status',             { status: opts.status });
    if (opts.category) qb.andWhere('b.categories LIKE :cat',          { cat: `%${opts.category}%` });
    if (opts.tag)      qb.andWhere('b.tags LIKE :tag',                { tag: `%${opts.tag}%` });
    if (opts.author)   qb.andWhere('b.authorId = :author',            { author: opts.author });
    if (opts.q)        qb.andWhere(`b.title ${ilike()} :q`,                { q: `%${opts.q}%` });

    const [posts, total] = await qb.getManyAndCount();
    return { posts, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(clinicId: string, id: string): Promise<BlogPost> {
    const post = await this.blogRepo.findOne({ where: { id, clinicId } });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async create(clinicId: string, dto: CreateBlogPostDto): Promise<BlogPost> {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');

    const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    const slug     = await this.ensureUniqueSlug(clinicId, baseSlug);

    const readingTimeMinutes = dto.content
      ? computeReadingTime(dto.content)
      : 1;

    const post = this.blogRepo.create({
      ...dto,
      clinicId,
      slug,
      readingTimeMinutes,
      status:      dto.status      ?? BlogStatus.DRAFT,
      indexable:   dto.indexable   !== false,
      publishedAt: dto.status === BlogStatus.PUBLISHED ? new Date() : null,
    });

    return this.blogRepo.save(post);
  }

  async update(clinicId: string, id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.findOne(clinicId, id);

    if (dto.slug && dto.slug !== post.slug) {
      dto.slug = await this.ensureUniqueSlug(clinicId, slugify(dto.slug), id);
    }

    if (dto.content !== undefined) {
      (dto as any).readingTimeMinutes = computeReadingTime(dto.content ?? '');
    }

    // Set publishedAt the first time we publish
    if (dto.status === BlogStatus.PUBLISHED && !post.publishedAt) {
      (dto as any).publishedAt = new Date();
    }

    Object.assign(post, dto);
    const saved = await this.blogRepo.save(post);

    return saved;
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const post = await this.findOne(clinicId, id);
    await this.blogRepo.remove(post);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public read
  // ──────────────────────────────────────────────────────────────────────────

  async findBySlug(clinicId: string, slug: string): Promise<BlogPost> {
    const post = await this.blogRepo.findOne({
      where: { clinicId, slug, status: BlogStatus.PUBLISHED },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async listPublished(
    clinicId: string,
    opts: { category?: string; tag?: string; author?: string; page?: number; limit?: number },
  ) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(50, opts.limit ?? 10);
    const skip  = (page - 1) * limit;

    const qb = this.blogRepo.createQueryBuilder('b')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.status = :status',  { status: BlogStatus.PUBLISHED })
      .andWhere('b.indexable = true')
      .orderBy('b.publishedAt', 'DESC')
      .take(limit)
      .skip(skip);

    if (opts.category) qb.andWhere('b.categories LIKE :cat', { cat: `%${opts.category}%` });
    if (opts.tag)      qb.andWhere('b.tags LIKE :tag',       { tag: `%${opts.tag}%` });
    if (opts.author)   qb.andWhere('b.authorId = :author',   { author: opts.author });

    const [posts, total] = await qb.getManyAndCount();
    return { posts, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getRelated(clinicId: string, postId: string, limit = 3): Promise<BlogPost[]> {
    const post = await this.blogRepo.findOne({ where: { id: postId, clinicId } });
    if (!post) return [];

    const qb = this.blogRepo.createQueryBuilder('b')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.id != :id',          { id: postId })
      .andWhere('b.status = :status',   { status: BlogStatus.PUBLISHED })
      .take(limit);

    // Prefer same category, then same tags
    const firstCat = post.categories?.[0];
    const firstTag = post.tags?.[0];
    if (firstCat) {
      qb.andWhere('b.categories LIKE :cat', { cat: `%${firstCat}%` });
    } else if (firstTag) {
      qb.andWhere('b.tags LIKE :tag', { tag: `%${firstTag}%` });
    }

    const related = await qb.getMany();

    // Fallback to any posts if not enough
    if (related.length < limit) {
      const existing = new Set([postId, ...related.map(r => r.id)]);
      const fallback = await this.blogRepo.find({
        where:  { clinicId, status: BlogStatus.PUBLISHED },
        order:  { publishedAt: 'DESC' },
        take:   limit + 1,
      });
      for (const p of fallback) {
        if (!existing.has(p.id)) {
          related.push(p);
          if (related.length >= limit) break;
        }
      }
    }

    return related;
  }

  async getCategories(clinicId: string): Promise<Array<{ name: string; count: number }>> {
    const posts = await this.blogRepo.find({
      where:  { clinicId, status: BlogStatus.PUBLISHED },
      select: ['categories'],
    });
    const map = new Map<string, number>();
    for (const p of posts) {
      for (const cat of p.categories ?? []) {
        map.set(cat, (map.get(cat) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getTags(clinicId: string): Promise<Array<{ name: string; count: number }>> {
    const posts = await this.blogRepo.find({
      where:  { clinicId, status: BlogStatus.PUBLISHED },
      select: ['tags'],
    });
    const map = new Map<string, number>();
    for (const p of posts) {
      for (const tag of p.tags ?? []) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Author page — list all published posts by a named author */
  async listByAuthor(
    clinicId: string,
    authorName: string,
    opts: { page?: number; limit?: number },
  ) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(50, opts.limit ?? 10);
    const skip  = (page - 1) * limit;

    const [posts, total] = await this.blogRepo.findAndCount({
      where: { clinicId, status: BlogStatus.PUBLISHED, authorName } as any,
      order: { publishedAt: 'DESC' },
      take:  limit,
      skip,
    });
    return { posts, total, page, limit, pages: Math.ceil(total / limit), authorName };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal linking suggestions
  // Returns other published posts whose titles/tags appear in current content
  // ──────────────────────────────────────────────────────────────────────────

  async getInternalLinkSuggestions(
    clinicId:    string,
    currentPost: { id: string; content: string; tags: string[] | null },
    limit = 5,
  ): Promise<Array<{ post: BlogPost; reason: string }>> {
    const allPosts = await this.blogRepo.find({
      where:  { clinicId, status: BlogStatus.PUBLISHED },
      select: ['id', 'title', 'slug', 'tags', 'categories'],
    });

    const existingLinks = new Set(extractLinks(currentPost.content ?? ''));
    const scores: Array<{ post: BlogPost; score: number; reason: string }> = [];

    for (const candidate of allPosts) {
      if (candidate.id === currentPost.id) continue;
      // Skip already linked posts
      if (existingLinks.has(`/blog/${candidate.slug}`)) continue;

      let score  = 0;
      let reason = '';

      // Title keyword match in content
      const titleWords = candidate.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const contentLower = (currentPost.content ?? '').toLowerCase();
      const matchedWords = titleWords.filter(w => contentLower.includes(w));
      if (matchedWords.length >= 2) { score += matchedWords.length; reason = `Title keywords match: "${matchedWords.slice(0, 2).join(', ')}"`; }

      // Shared tags
      const sharedTags = (candidate.tags ?? []).filter(t => (currentPost.tags ?? []).includes(t));
      if (sharedTags.length) { score += sharedTags.length * 2; reason = reason || `Shared tags: ${sharedTags.slice(0, 2).join(', ')}`; }

      if (score > 0) scores.push({ post: candidate as unknown as BlogPost, score, reason });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ post, reason }) => ({ post, reason }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private async ensureUniqueSlug(
    clinicId:  string,
    base:      string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = base;
    let i = 1;
    for (;;) {
      const existing = await this.blogRepo.findOne({
        where: { clinicId, slug: candidate },
      });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${base}-${i++}`;
    }
  }
}
