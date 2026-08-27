import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { TreatmentPlanItem, TreatmentPlanStatus } from './entities/treatment-plan-item.entity';
import { ClinicService } from '../services/entities/service.entity';
import { CreateTreatmentPlanDto, UpdateTreatmentPlanStatusDto } from './dto/treatment-plan.dto';

@Injectable()
export class TreatmentPlansService {
  constructor(
    @InjectRepository(TreatmentPlanItem) private repo: Repository<TreatmentPlanItem>,
    @InjectRepository(ClinicService) private serviceRepo: Repository<ClinicService>,
  ) {}

  async create(clinicId: string, userId: string, dto: CreateTreatmentPlanDto): Promise<TreatmentPlanItem> {
    let serviceName = dto.serviceName;
    if (dto.serviceId) {
      const service = await this.serviceRepo.findOne({ where: { id: dto.serviceId, clinicId } });
      // Snapshot the service's current name if the caller didn't supply
      // one explicitly — keeps the proposal readable even if the service
      // is later renamed or deactivated.
      if (service && !serviceName) serviceName = service.name;
    }

    const plan = this.repo.create({
      clinicId,
      branchId: dto.branchId,
      patientId: dto.patientId,
      serviceId: dto.serviceId,
      serviceName: serviceName || 'Untitled treatment',
      doctorId: dto.doctorId,
      appointmentId: dto.appointmentId,
      proposedAt: dto.proposedAt ? new Date(dto.proposedAt) : new Date(),
      priceQuoted: dto.priceQuoted,
      note: dto.note,
      status: TreatmentPlanStatus.PROPOSED,
      createdByUserId: userId,
    });
    return this.repo.save(plan);
  }

  async findAll(clinicId: string, query?: any): Promise<{ data: TreatmentPlanItem[]; total: number }> {
    const { page = 1, limit = 50, patientId, branchId, status } = query || {};
    let qb = this.repo.createQueryBuilder('tp').where('tp.clinicId = :clinicId', { clinicId });
    if (patientId) qb = qb.andWhere('tp.patientId = :patientId', { patientId });
    if (branchId) qb = qb.andWhere('(tp.branchId = :branchId OR tp.branchId IS NULL)', { branchId });
    if (status) qb = qb.andWhere('tp.status = :status', { status });
    qb = qb.orderBy('tp.proposedAt', 'DESC');
    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total };
  }

  async findOne(clinicId: string, id: string): Promise<TreatmentPlanItem> {
    const plan = await this.repo.findOne({ where: { id, clinicId } });
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  async updateStatus(clinicId: string, id: string, dto: UpdateTreatmentPlanStatusDto): Promise<TreatmentPlanItem> {
    const plan = await this.findOne(clinicId, id);
    plan.status = dto.status;
    plan.decidedAt = dto.status === TreatmentPlanStatus.PROPOSED ? null : new Date();
    if (dto.note !== undefined) plan.note = dto.note;
    return this.repo.save(plan);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }

  // ── Read endpoint for the jwantra integration (paginated, offset-based
  // to match integrations/jwantra/jwantra-integration.service.ts's other
  // list* methods) ──────────────────────────────────────────────────────
  async listForJwantra(
    clinicId: string, opts: { limit: number; offset: number; updatedAfter?: Date },
  ): Promise<{ data: TreatmentPlanItem[]; hasMore: boolean }> {
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);
    const rows = await this.repo.find({
      where, order: { updatedAt: 'ASC', id: 'ASC' }, take: opts.limit, skip: opts.offset,
    });
    return { data: rows, hasMore: rows.length === opts.limit };
  }
}
