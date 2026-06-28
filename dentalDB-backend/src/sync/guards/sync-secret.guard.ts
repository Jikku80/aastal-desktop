import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guards /sync/* endpoints with a shared secret (X-Sync-Secret header).
 *
 * NOTE on scope: this is deliberately NOT the existing ApiKeyGuard
 * (src/api-keys), because that guard is per-clinic (scopes a key to one
 * clinicId for external integrations) and the sync registry here pulls
 * across all offline-capable entities without clinic filtering. That's
 * fine if one Electron-bundled instance == one clinic's offline data, but
 * if a single desktop install needs to sync MULTIPLE clinics, this guard
 * and the SyncService both need clinic-scoping added — confirm which
 * applies to your deployment before relying on this in production.
 *
 * Set SYNC_SHARED_SECRET identically on both the remote/hosted backend and
 * every Electron-bundled local backend that needs to talk to it.
 */
@Injectable()
export class SyncSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get<string>('SYNC_SHARED_SECRET');
    if (!expected) {
      throw new UnauthorizedException(
        'SYNC_SHARED_SECRET is not configured on this instance — refusing all /sync/* requests rather than running unauthenticated',
      );
    }
    const req: Request = ctx.switchToHttp().getRequest();
    const provided = req.headers['x-sync-secret'];
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid sync secret');
    }
    return true;
  }
}
