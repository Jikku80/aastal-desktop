import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingPeriod, PeriodStatus } from './entities/accounting-period.entity';
import { ClosePeriodDto } from './dto/finance.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@Injectable()
export class PeriodService {
  constructor(
    @InjectRepository(AccountingPeriod) private periodRepo: Repository<AccountingPeriod>,
    private auditService: AuditService,
  ) {}

  async list(clinicId: string): Promise<AccountingPeriod[]> {
    return this.periodRepo.find({ where: { clinicId }, order: { startDate: 'DESC' } });
  }

  /** Locks a date range. Overlap with an already-closed period is rejected outright; overlap with another open period is allowed (periods are just labels — the lock only cares about the closed ones). */
  async closePeriod(clinicId: string, dto: ClosePeriodDto, userId: string): Promise<AccountingPeriod> {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date must be on or after start date');
    }
    const overlapping = await this.periodRepo.createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.status = :status', { status: PeriodStatus.CLOSED })
      .andWhere('p.startDate <= :end AND p.endDate >= :start', { start: dto.startDate, end: dto.endDate })
      .getOne();
    if (overlapping) {
      throw new BadRequestException(`This range overlaps an already-closed period ("${overlapping.label}")`);
    }

    const period = this.periodRepo.create({
      clinicId, label: dto.label, startDate: dto.startDate, endDate: dto.endDate,
      status: PeriodStatus.CLOSED, closedBy: userId, closedAt: new Date(),
    });
    const saved = await this.periodRepo.save(period);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.CREATED,
      entityType: 'accounting_period' as AuditEntityType, entityId: saved.id,
      changes: { after: dto },
    });
    return saved;
  }

  async reopenPeriod(clinicId: string, id: string, userId: string): Promise<void> {
    const period = await this.periodRepo.findOne({ where: { id, clinicId } });
    if (!period) throw new NotFoundException('Accounting period not found');
    await this.periodRepo.remove(period);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.DELETED,
      entityType: 'accounting_period' as AuditEntityType, entityId: id,
      changes: { before: period },
    });
  }
}