import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../rbac/entities/user-role.entity';
import { AuthCacheService } from '../auth-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService,
    @InjectRepository(User)     private userRepo:     Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    private readonly authCache: AuthCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
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
        (user as any)._permissions = new Set(['*']);
        await this.authCache.store(user.id, user.role, user.clinicId ?? null, ['*']);
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
      (user as any)._permissions = keys;
      await this.authCache.store(user.id, user.role, user.clinicId ?? null, [...keys]);
      return user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;

      // Live lookup failed (row not yet synced locally, or a transient DB
      // error) — try the bounded offline cache before giving up entirely.
      // This is what makes "session checks work without contacting [a]
      // server" actually mean something here: it's not that there's a
      // separate server being skipped (there never was one — see Phase 3
      // notes), it's that a local DB miss doesn't have to be a hard logout.
      this.logger.warn(`Live JWT validation failed for user ${payload.sub}, trying offline cache fallback: ${err?.message}`);
      const cached = await this.authCache.getIfFresh(payload.sub);
      if (!cached) throw new UnauthorizedException();

      const fallbackUser: Partial<User> & { _permissions: Set<string> } = {
        id: payload.sub,
        email: payload.email,
        role: cached.role as any,
        clinicId: cached.clinicId as any,
        isActive: true,
        _permissions: new Set(cached.permissions),
      };
      return fallbackUser as any;
    }
  }
}
