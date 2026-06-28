import {
  Injectable, NotFoundException, ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)  private keyRepo:    Repository<ApiKey>,
    @InjectRepository(Clinic)  private clinicRepo: Repository<Clinic>,
  ) {}

  // ── Guard: enterprise only ─────────────────────────────────────────────────
  private async assertEnterprise(clinicId: string) {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    if (clinic.plan !== SubscriptionPlan.ENTERPRISE) {
      throw new ForbiddenException(
        'API access is an Enterprise-only feature. Upgrade your plan to use API keys.',
      );
    }
    return clinic;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(clinicId: string, dto: CreateApiKeyDto): Promise<{ apiKey: ApiKey; rawKey: string }> {
    await this.assertEnterprise(clinicId);

    // Generate a secure random key: dos_live_<32 hex bytes>
    const rawKey   = `dos_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash  = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    const apiKey = this.keyRepo.create({
      clinicId,
      name:       dto.name,
      keyHash,
      keyPrefix,
      allowedIps: dto.allowedIps || null,
      expiresAt:  dto.expiresAt ? new Date(dto.expiresAt) : null,
      status:     ApiKeyStatus.ACTIVE,
    });

    await this.keyRepo.save(apiKey);

    // Return the raw key ONCE — it is not stored in plaintext
    return { apiKey, rawKey };
  }

  // ── List (safe — never returns keyHash) ───────────────────────────────────
  async findAll(clinicId: string) {
    await this.assertEnterprise(clinicId);
    const keys = await this.keyRepo.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
    });
    return keys.map(k => this.sanitize(k));
  }

  // ── Update name / allowedIps / expiresAt ──────────────────────────────────
  async update(clinicId: string, id: string, dto: UpdateApiKeyDto) {
    await this.assertEnterprise(clinicId);
    const key = await this.keyRepo.findOne({ where: { id, clinicId } });
    if (!key) throw new NotFoundException('API key not found');

    if (dto.name       !== undefined) key.name       = dto.name;
    if (dto.allowedIps !== undefined) key.allowedIps = dto.allowedIps;
    if (dto.expiresAt  !== undefined) key.expiresAt  = dto.expiresAt ? new Date(dto.expiresAt) : null;

    await this.keyRepo.save(key);
    return this.sanitize(key);
  }

  // ── Revoke ─────────────────────────────────────────────────────────────────
  async revoke(clinicId: string, id: string) {
    await this.assertEnterprise(clinicId);
    const key = await this.keyRepo.findOne({ where: { id, clinicId } });
    if (!key) throw new NotFoundException('API key not found');

    key.status = ApiKeyStatus.REVOKED;
    await this.keyRepo.save(key);
    return this.sanitize(key);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(clinicId: string, id: string) {
    await this.assertEnterprise(clinicId);
    const key = await this.keyRepo.findOne({ where: { id, clinicId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.keyRepo.delete({ id, clinicId });
  }

  // ── Validate (used by ApiKeyGuard for inbound API requests) ───────────────
  async validate(rawKey: string): Promise<{ clinicId: string } | null> {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key  = await this.keyRepo.findOne({ where: { keyHash: hash } });

    if (!key || key.status !== ApiKeyStatus.ACTIVE) return null;
    if (key.expiresAt && new Date() > new Date(key.expiresAt)) return null;

    // Bump usage stats (fire-and-forget)
    this.keyRepo.update(key.id, {
      lastUsedAt:   new Date(),
      requestCount: key.requestCount + 1,
    }).catch(() => {});

    return { clinicId: key.clinicId };
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  async getStats(clinicId: string) {
    await this.assertEnterprise(clinicId);
    const all     = await this.keyRepo.find({ where: { clinicId } });
    const active  = all.filter(k => k.status === ApiKeyStatus.ACTIVE).length;
    const revoked = all.filter(k => k.status === ApiKeyStatus.REVOKED).length;
    const totalRequests = all.reduce((s, k) => s + (k.requestCount || 0), 0);
    return { total: all.length, active, revoked, totalRequests };
  }

  // ── Strip keyHash before sending to client ────────────────────────────────
  private sanitize(key: ApiKey) {
    const { keyHash, ...safe } = key as any;
    return safe;
  }
}
