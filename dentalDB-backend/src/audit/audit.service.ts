import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './entities/audit-log.entity';

export interface LogParams {
  clinicId: string;
  userId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  changes?: { before?: Record<string, any>; after?: Record<string, any> };
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(
    @InjectRepository(AuditLog) private repo: Repository<AuditLog>,
  ) {}

  async log(params: LogParams): Promise<void> {
    try {
      await this.repo.save(this.repo.create(params));
    } catch (e) {
      // Never let audit failures break the main flow
      this.logger.error('Failed to write audit log: ' + e?.message);
    }
  }

  async findAll(clinicId: string, query: {
    userId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entityType, startDate, endDate, page = 1, limit = 50 } = query;

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .where('a.clinicId = :clinicId', { clinicId })
      .orderBy('a.createdAt', 'DESC');

    if (userId)     qb.andWhere('a.userId = :userId', { userId });
    if (entityType) qb.andWhere('a.entityType = :entityType', { entityType });
    if (startDate && endDate) {
      qb.andWhere('a.createdAt BETWEEN :start AND :end', {
        start: new Date(startDate),
        end:   new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      });
    } else if (startDate) {
      qb.andWhere('a.createdAt >= :start', { start: new Date(startDate) });
    } else if (endDate) {
      qb.andWhere('a.createdAt <= :end', { end: new Date(new Date(endDate).setHours(23, 59, 59, 999)) });
    }

    const total = await qb.getCount();
    const data  = await qb.skip((+page - 1) * +limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  /** Strip sensitive fields before logging */
  sanitize(obj: Record<string, any>): Record<string, any> {
    if (!obj) return obj;
    const out = { ...obj };
    for (const key of ['password', 'refreshToken', 'accessToken', 'token']) delete out[key];
    return out;
  }

  diff(before: Record<string, any>, after: Record<string, any>): { before: Record<string, any>; after: Record<string, any> } {
    const changedKeys = Object.keys(after).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    if (!changedKeys.length) return { before: {}, after: {} };
    return {
      before: Object.fromEntries(changedKeys.map(k => [k, before[k]])),
      after:  Object.fromEntries(changedKeys.map(k => [k, after[k]])),
    };
  }
}
