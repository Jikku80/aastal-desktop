import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeoRedirect } from './entities/seo-redirect.entity';

@Injectable()
export class RedirectService {
  /** Per-clinicId in-memory cache to avoid repeated DB hits on every page load */
  private readonly cache = new Map<string, SeoRedirect[]>();

  constructor(
    @InjectRepository(SeoRedirect) private redirectRepo: Repository<SeoRedirect>,
  ) {}

  async findRedirect(clinicId: string, fromPath: string): Promise<SeoRedirect | null> {
    // Normalise: strip trailing slash (keep bare "/")
    const normalized = fromPath.replace(/\/$/, '') || '/';

    if (!this.cache.has(clinicId)) {
      const all = await this.redirectRepo.find({
        where: { clinicId, isActive: true },
      });
      this.cache.set(clinicId, all);
    }

    const redirects = this.cache.get(clinicId) ?? [];
    return redirects.find(r => r.fromPath === normalized) ?? null;
  }

  async list(clinicId: string): Promise<SeoRedirect[]> {
    return this.redirectRepo.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
    });
  }

  async upsert(
    clinicId:   string,
    fromPath:   string,
    toPath:     string,
    statusCode: 301 | 302 = 301,
  ): Promise<SeoRedirect> {
    this.cache.delete(clinicId);

    const normalizedFrom = fromPath.replace(/\/$/, '') || '/';
    const existing = await this.redirectRepo.findOne({
      where: { clinicId, fromPath: normalizedFrom },
    });

    if (existing) {
      existing.toPath     = toPath;
      existing.statusCode = statusCode;
      existing.isActive   = true;
      return this.redirectRepo.save(existing);
    }

    return this.redirectRepo.save(
      this.redirectRepo.create({
        clinicId,
        fromPath:   normalizedFrom,
        toPath,
        statusCode,
        isActive:   true,
      }),
    );
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const redir = await this.redirectRepo.findOne({ where: { id, clinicId } });
    if (!redir) throw new NotFoundException('Redirect not found');
    this.cache.delete(clinicId);
    await this.redirectRepo.remove(redir);
  }
}
