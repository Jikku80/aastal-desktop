import { Injectable, UnauthorizedException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../rbac/entities/user-role.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { SyncMeta } from '../../sync/entities/sync-meta.entity';
import { AuthCacheService } from '../auth-cache.service';
import { liveAuthCacheKey } from '../live-auth-cache.util';
import { resolveOfflineLicense } from '../../subscriptions/offline-license.util';

// Routes that must keep working even while the offline license is locked —
// otherwise the frontend could never fetch the lock status to show the
// SubscriptionGate screen (chicken-and-egg), and a user could never log
// out. Matched against req.path with the global 'api/v1' prefix already
// stripped by the time Nest routes it, so these are relative to that.
const LICENSE_CHECK_EXEMPT_PATHS = ['/subscriptions', '/auth/logout', '/auth/me'];

interface CachedAuthUser {
  id: string; email: string; firstName: string; lastName: string;
  role: string; clinicId: string | null; isActive: boolean; avatar?: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)     private userRepo:     Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Clinic)   private clinicRepo:   Repository<Clinic>,
    @InjectRepository(SyncMeta) private syncMetaRepo: Repository<SyncMeta>,
    private readonly authCache: AuthCacheService,
    @Inject(CACHE_MANAGER) private readonly liveCache: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Offline (SQLite/desktop) hard lock: runs on every JWT-authenticated
   * request, independent of network state, so a clinic whose 14-day trial
   * or paid subscription has ended actually gets shut out of the API even
   * with no internet connection at all — not just shown a dismissable
   * banner in the UI. See offline-license.util.ts for the clock-rollback
   * protection and where trialEndsAt/subscriptionEndsAt come from.
   *
   * No-ops entirely for the online/Postgres deployment (that path already
   * has its own Subscription-based check) and for requests with no
   * clinicId (super_admin, pre-clinic auth flows).
   */
  private async enforceOfflineLicense(req: Request | undefined, clinicId: string | null | undefined, role: string) {
    if ((this.config.get<string>('DB_DRIVER', 'postgres')) !== 'sqlite') return;
    if (!clinicId || role === 'super_admin') return;

    const path = ((req as any)?.route?.path ?? req?.path ?? req?.url ?? '') as string;
    // req.path/url includes the global 'api/v1' prefix (see main.ts's
    // setGlobalPrefix) — match on the path segment after it rather than
    // assuming an exact prefix, so this keeps working if that changes.
    const isExempt = LICENSE_CHECK_EXEMPT_PATHS.some((p) => path === p || path.endsWith(p) || path.includes(`${p}?`) || path.includes(`${p}/`));
    if (isExempt) return;

    const result = await resolveOfflineLicense(clinicId, this.clinicRepo, this.syncMetaRepo);
    if (!result.isLocked) return;

    const messages: Record<string, string> = {
      trial_expired: 'Your 14-day free trial has expired. Please upgrade to continue using this app.',
      subscription_expired: 'Your subscription period has ended. Please renew to continue.',
      deactivated: 'This clinic account has been deactivated.',
    };
    throw new ForbiddenException({
      code: result.lockReason.toUpperCase(),
      message: messages[result.lockReason] ?? 'Access is currently locked.',
      lockType: result.lockReason,
      trialEndsAt: result.trialEndsAt,
      currentPeriodEnd: result.currentPeriodEnd,
    });
  }

  async validate(req: Request, payload: any) {
    // Fast path: skip both DB queries entirely on a cache hit. See
    // live-auth-cache.util.ts for what busts this and how stale it can get.
    // The license check still runs on a cache hit — it's a cheap local
    // lookup and skipping it would let a locked clinic keep working for
    // the remainder of the live-cache TTL.
    const cached = await this.liveCache.get<CachedAuthUser>(liveAuthCacheKey(payload.sub)).catch(() => undefined);
    if (cached) {
      await this.enforceOfflineLicense(req, cached.clinicId, cached.role);
      return { ...cached, _permissions: new Set(cached.permissions) };
    }

    try {
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        // A genuinely-found-but-inactive user is an explicit reject, not a
        // fallback case — only a missing/unreachable row falls through below.
        if (user && !user.isActive) {
          await this.authCache.invalidate(payload.sub);
          throw new UnauthorizedException();
        }
        throw new Error('USER_ROW_NOT_FOUND');
      }

      // Super-admin and owner get wildcard set — PermissionsGuard checks for '*'
      if (user.role === 'super_admin' || user.role === 'owner') {
        await this.enforceOfflineLicense(req, user.clinicId, user.role);
        (user as any)._permissions = new Set(['*']);
        await this.authCache.store(user.id, user.role, user.clinicId ?? null, ['*']);
        await this.cacheLiveUser(user, ['*']);
        return user;
      }

      // Resolve all permission keys from assigned roles
      const userRoles = await this.userRoleRepo.find({
        where: { userId: user.id },
        relations: ['role', 'role.permissions'],
      });

      const keys = new Set<string>();
      for (const ur of userRoles) {
        for (const perm of ur.role?.permissions ?? []) {
          keys.add(perm.key);
        }
      }
      await this.enforceOfflineLicense(req, user.clinicId, user.role);
      (user as any)._permissions = keys;
      await this.authCache.store(user.id, user.role, user.clinicId ?? null, [...keys]);
      await this.cacheLiveUser(user, [...keys]);
      return user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      if (err instanceof ForbiddenException) throw err; // offline license lock — must not fall through to the cache fallback below

      // Live lookup failed (row not yet synced locally, or a transient DB
      // error) — try the bounded offline cache before giving up entirely.
      // This is what makes "session checks work without contacting [a]
      // server" actually mean something here: it's not that there's a
      // separate server being skipped (there never was one — see Phase 3
      // notes), it's that a local DB miss doesn't have to be a hard logout.
      this.logger.warn(`Live JWT validation failed for user ${payload.sub}, trying offline cache fallback: ${err?.message}`);
      const cachedFallback = await this.authCache.getIfFresh(payload.sub);
      if (!cachedFallback) throw new UnauthorizedException();

      await this.enforceOfflineLicense(req, cachedFallback.clinicId as any, cachedFallback.role);

      const fallbackUser: Partial<User> & { _permissions: Set<string> } = {
        id: payload.sub,
        email: payload.email,
        role: cachedFallback.role as any,
        clinicId: cachedFallback.clinicId as any,
        isActive: true,
        _permissions: new Set(cachedFallback.permissions),
      };
      return fallbackUser as any;
    }
  }

  /** Short-TTL fast-path cache — see live-auth-cache.util.ts. Best-effort: never blocks a request over a cache write failure. */
  private async cacheLiveUser(user: User, permissions: string[]): Promise<void> {
    const entry: CachedAuthUser = {
      id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      role: user.role as any, clinicId: user.clinicId ?? null, isActive: user.isActive,
      avatar: (user as any).avatar, permissions,
    };
    await this.liveCache.set(liveAuthCacheKey(user.id), entry).catch((err: any) => {
      this.logger.warn(`Failed to populate live auth cache for user ${user.id}: ${err?.message ?? err}`);
    });
  }
}