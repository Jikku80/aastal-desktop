import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SyncDevice, SyncDeviceStatus } from './entities/sync-device.entity';

@Injectable()
export class SyncDevicesService {
  constructor(
    @InjectRepository(SyncDevice) private readonly deviceRepo: Repository<SyncDevice>,
  ) {}

  /**
   * POST /sync/register-device — called once per desktop install, right
   * after a normal JWT-authenticated login. Mints a random per-clinic
   * token, stores its hash, and returns the raw token ONCE — same
   * one-time-reveal pattern as ApiKeysService.create.
   */
  async registerDevice(clinicId: string, userId: string, deviceName?: string): Promise<{ device: SyncDevice; rawToken: string }> {
    const rawToken = `sync_dev_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix = rawToken.slice(0, 8);

    const device = this.deviceRepo.create({
      clinicId,
      registeredByUserId: userId,
      deviceName: deviceName?.trim() || 'Unnamed device',
      tokenHash,
      tokenPrefix,
      status: SyncDeviceStatus.ACTIVE,
    });
    await this.deviceRepo.save(device);
    return { device, rawToken };
  }

  /** Used by SyncDeviceGuard on every /sync/changes and /sync/push call. */
  async validateToken(rawToken: string): Promise<{ clinicId: string; deviceId: string } | null> {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const device = await this.deviceRepo.findOne({ where: { tokenHash: hash } });
    if (!device || device.status !== SyncDeviceStatus.ACTIVE) return null;

    // Fire-and-forget usage bump — mirrors ApiKeysService.validate. Not
    // awaited so a slow write never adds latency to the guarded request.
    this.deviceRepo.update(device.id, { lastUsedAt: new Date() }).catch(() => {});

    return { clinicId: device.clinicId, deviceId: device.id };
  }

  /** GET /sync/devices — admin screen, clinic-scoped, never returns tokenHash. */
  async listForClinic(clinicId: string) {
    const devices = await this.deviceRepo.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
    });
    return devices.map((d) => this.sanitize(d));
  }

  /** POST /sync/devices/:id/revoke — the "lost/stolen laptop" button. */
  async revoke(clinicId: string, id: string) {
    const device = await this.deviceRepo.findOne({ where: { id, clinicId } });
    if (!device) throw new NotFoundException('Sync device not found');
    device.status = SyncDeviceStatus.REVOKED;
    device.revokedAt = new Date();
    await this.deviceRepo.save(device);
    return this.sanitize(device);
  }

  private sanitize(device: SyncDevice) {
    const { tokenHash, ...safe } = device as any;
    return safe;
  }
}