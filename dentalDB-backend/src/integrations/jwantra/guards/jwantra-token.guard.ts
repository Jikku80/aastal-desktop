import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwantraIntegrationService } from '../jwantra-integration.service';

/**
 * Guards the read endpoints Jwantra polls (patients/services/invoices).
 * Expects `Authorization: Bearer <token>` — this is the token issued by
 * POST /integrations/jwantra/connect, which is what Jwantra's connector
 * stores as `external_account_id`'s paired access token (see
 * app/connectors/clinickarobar.py on the Jwantra side: `_client()` sends
 * exactly this header shape).
 */
@Injectable()
export class JwantraTokenGuard implements CanActivate {
  constructor(private readonly integrations: JwantraIntegrationService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: Request & { jwantraClinicId?: string } = ctx.switchToHttp().getRequest();

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }
    const rawToken = auth.slice(7).trim();
    if (!rawToken) {
      throw new UnauthorizedException('Bearer token required');
    }

    const result = await this.integrations.validate(rawToken);
    if (!result) {
      throw new UnauthorizedException('Invalid or revoked integration token');
    }

    req.jwantraClinicId = result.clinicId;
    return true;
  }
}
