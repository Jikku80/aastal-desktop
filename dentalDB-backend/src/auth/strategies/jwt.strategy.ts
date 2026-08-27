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
import { resolveOnlineLicense } from '../../subscriptions/online-license.util';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

// Routes that must keep working even while the license is locked —
// otherwise the frontend could never fetch the lock status to show the
// SubscriptionGate screen (chicken-and-egg), a user could never log out,
// and — critically — an owner could never actually submit payment/renewal
// to get themselves unlocked again. Matched against req.path with the
// global 'api/v1' prefix already stripped by the time Nest routes it, so
// these are relative to that.
const LICENSE_CHECK_EXEMPT_PATHS = [
  '/subscriptions',               // status + upgrade/renew/cancel
  '/auth/logout',
  '/auth/me',
  '/admin/subscription-request',  // manual activation/renewal request (create + list "my")
  '/files/payment-proof',         // screenshot upload for the manual-payment flow above
];

// Payment-gateway routes are shared between subscription renewal and
// ordinary patient/invoice payments (see payments.service.ts's `purpose`
// field). Only the subscription-purpose calls may bypass the lock —
// everything else (e.g. paying a patient invoice) must stay blocked like
// the rest of the app while a clinic is locked out.
function isSubscriptionPaymentRoute(path: string, body: any): boolean {
  if (!path.includes('/payments/')) return false;
  const isInit = /\/(esewa|khalti)\/init$/.test(path) || path.endsWith('/paypal/create-order');
  if (isInit) return body?.purpose === 'subscription';
  // Verify/capture only finalize a transaction that could only have been
  // initiated above, so it's safe to always let these through.
  return /\/(esewa|khalti)\/verify$/.test(path) || path.includes('/paypal/capture/');
}

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
    @InjectRepository(Clinic)       private clinicRepo:   Repository<Clinic>,
    @InjectRepository(SyncMeta)     private syncMetaRepo: Repository<SyncMeta>,
    @InjectRepository(Subscription) private subRepo:      Repository<Subscription>,
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
   * Trial/subscription hard lock: runs on every JWT-authenticated request,
   * for BOTH deployment shapes, so a clinic whose 30-day trial or paid
   * subscription has ended actually gets shut out of the API — not just
   * shown a dismissable banner in the UI:
   *
   *  - DB_DRIVER=sqlite (Electron desktop build): delegates to
   *    resolveOfflineLicense (offline-license.util.ts), which also guards
   *    against a locally-wound-back system clock.
   *  - DB_DRIVER=postgres (hosted/web build): delegates to
   *    resolveOnlineLicense (online-license.util.ts), reading the
   *    Clinic + Subscription rows directly. This used to be handled by a
   *    separate SubscriptionGuard that was never actually registered
   *    anywhere (dead code — see git history), so paid/trial enforcement
   *    silently did not happen at all for the hosted deployment. Centralizing
   *    both here, at the one place already proven to run for every
   *    JWT-authenticated controller, avoids that class of bug recurring.
   *
   * No-ops for requests with no clinicId (super_admin, pre-clinic auth
   * flows) and for the exempt paths above (status/renewal/payment routes
   * that must keep working precisely because the clinic is locked).
   */
  private async enforceLicense(req: Request | undefined, clinicId: string | null | undefined, role: string) {
    if (!clinicId || role === 'super_admin') return;

    const path = ((req as any)?.route?.path ?? req?.path ?? req?.url ?? '') as string;
    // req.path/url includes the global 'api/v1' prefix (see main.ts's
    // setGlobalPrefix) — match on the path segment after it rather than
    // assuming an exact prefix, so this keeps working if that changes.
    const isExempt =
      LICENSE_CHECK_EXEMPT_PATHS.some((p) => path === p || path.endsWith(p) || path.includes(`${p}?`) || path.includes(`${p}/`)) ||
      isSubscriptionPaymentRoute(path, (req as any)?.body);
    if (isExempt) return;

    const driver = this.config.get<string>('DB_DRIVER', 'postgres');
    const result = driver === 'sqlite'
      ? await resolveOfflineLicense(clinicId, this.clinicRepo, this.syncMetaRepo)
      : await resolveOnlineLicense(clinicId, this.clinicRepo, this.subRepo);
    if (!result.isLocked) return;

    const messages: Record<string, string> = {
      trial_expired: 'Your 30-day free trial has expired. Please upgrade to continue using this app.',
      subscription_expired: 'Your subscription period has ended. Please renew to continue.',
      cancelled: 'Your subscription has been cancelled. Please renew to continue.',
      no_sub: 'No active subscription found. Please choose a plan to continue.',
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
      await this.enforceLicense(req, cached.clinicId, cached.role);
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
        await this.enforceLicense(req, user.clinicId, user.role);
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
      await this.enforceLicense(req, user.clinicId, user.role);
      (user as any)._permissions = keys;
      await this.authCache.store(user.id, user.role, user.clinicId ?? null, [...keys]);
      await this.cacheLiveUser(user, [...keys]);
      return user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      if (err instanceof ForbiddenException) throw err; // license lock (trial/subscription) — must not fall through to the cache fallback below

      // Live lookup failed (row not yet synced locally, or a transient DB
      // error) — try the bounded offline cache before giving up entirely.
      // This is what makes "session checks work without contacting [a]
      // server" actually mean something here: it's not that there's a
      // separate server being skipped (there never was one — see Phase 3
      // notes), it's that a local DB miss doesn't have to be a hard logout.
      this.logger.warn(`Live JWT validation failed for user ${payload.sub}, trying offline cache fallback: ${err?.message}`);
      const cachedFallback = await this.authCache.getIfFresh(payload.sub);
      if (!cachedFallback) throw new UnauthorizedException();

      await this.enforceLicense(req, cachedFallback.clinicId as any, cachedFallback.role);

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