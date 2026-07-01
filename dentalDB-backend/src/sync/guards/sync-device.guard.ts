import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SyncDevicesService } from '../sync-devices.service';

/**
 * Guards /sync/changes and /sync/push with a per-device token
 * (X-Sync-Device-Token header) instead of the old shared secret.
 *
 * Replaces SyncSecretGuard. That guard accepted one static secret shared
 * by every clinic's desktop install, so any device with the secret could
 * pull or push ANY clinic's data — the "cross-clinic leak" flagged in its
 * docstring. This guard looks up which clinic the token belongs to (via
 * SyncDevicesService, backed by the SyncDevice table — see its entity for
 * how a token gets minted) and attaches it to the request as
 * req.syncClinicId, which SyncService then uses to scope every query
 * to `WHERE clinicId = :that clinic`.
 *
 * Tokens are minted by POST /sync/register-device (JWT-authenticated, no
 * manual key entry) and can be revoked per-device from the admin
 * "Registered Devices" screen — see SyncDevicesService.revoke.
 */
@Injectable()
export class SyncDeviceGuard implements CanActivate {
  constructor(private readonly devices: SyncDevicesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: Request & { syncClinicId?: string; syncDeviceId?: string } = ctx.switchToHttp().getRequest();
    const token = req.headers['x-sync-device-token'] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Missing X-Sync-Device-Token — this device has not completed sync registration');
    }

    const result = await this.devices.validateToken(token);
    if (!result) {
      throw new UnauthorizedException('Invalid or revoked sync device token');
    }

    req.syncClinicId = result.clinicId;
    req.syncDeviceId = result.deviceId;
    return true;
  }
}