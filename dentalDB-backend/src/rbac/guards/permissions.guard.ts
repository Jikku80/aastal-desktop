import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * PermissionsGuard — reads the flat Set<string> of permission keys that
 * JwtStrategy pre-loaded onto req.user._permissions, then checks them
 * against the @RequirePermissions() decorator on the handler.
 *
 * No extra DB query per request — all data was loaded once in JwtStrategy.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req  = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    // Super-admin wildcard bypass
    const perms: Set<string> = user._permissions ?? new Set();
    if (perms.has('*')) return true;

    const allowed = required.some((k) => perms.has(k));
    if (!allowed) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }
    return true;
  }
}
