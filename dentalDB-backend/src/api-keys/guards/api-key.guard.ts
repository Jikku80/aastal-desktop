import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from '../api-keys.service';

/**
 * Guards routes that external integrations can call with
 *   Authorization: Bearer dos_live_<key>
 * or
 *   X-API-Key: dos_live_<key>
 *
 * On success, attaches req.apiClinicId so downstream handlers know
 * which clinic the key belongs to.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: Request & { apiClinicId?: string } = ctx.switchToHttp().getRequest();

    // Accept key from header or query param
    let raw: string | undefined =
      (req.headers['x-api-key'] as string) ||
      (req.query['api_key'] as string);

    if (!raw) {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer dos_live_')) raw = auth.slice(7);
    }

    if (!raw) throw new UnauthorizedException('API key required');

    const result = await this.apiKeysService.validate(raw);
    if (!result) throw new UnauthorizedException('Invalid or revoked API key');

    req.apiClinicId = result.clinicId;
    return true;
  }
}
