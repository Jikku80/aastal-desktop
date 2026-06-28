import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthCache } from './entities/auth-cache.entity';

const DEFAULT_GRACE_DAYS = 30;

@Injectable()
export class AuthCacheService {
  constructor(
    @InjectRepository(AuthCache) private readonly repo: Repository<AuthCache>,
    private readonly config: ConfigService,
  ) {}

  private graceMs(): number {
    const days = Number(this.config.get('OFFLINE_SESSION_GRACE_DAYS', DEFAULT_GRACE_DAYS));
    return days * 24 * 60 * 60 * 1000;
  }

  /** Call this on every successful live validation — keeps the fallback fresh. */
  async store(userId: string, role: string, clinicId: string | null, permissions: string[]): Promise<void> {
    await this.repo.save({ userId, role, clinicId, permissions, isActive: true });
  }

  /** Mark cached entry inactive immediately on deactivation/logout-everywhere, so a stale cache can't outlive an explicit revoke. */
  async invalidate(userId: string): Promise<void> {
    await this.repo.update({ userId }, { isActive: false });
  }

  /**
   * Returns a usable cached snapshot only if present, marked active, and
   * within the grace window — otherwise null, meaning "no fallback
   * available, the caller should still reject the request."
   */
  async getIfFresh(userId: string): Promise<AuthCache | null> {
    const entry = await this.repo.findOne({ where: { userId } });
    if (!entry || !entry.isActive) return null;
    const age = Date.now() - new Date(entry.lastValidatedAt).getTime();
    if (age > this.graceMs()) return null;
    return entry;
  }
}
