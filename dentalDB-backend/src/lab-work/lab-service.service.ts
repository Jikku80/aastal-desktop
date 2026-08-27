import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ilike } from '../database/sql-helpers';
import { LabService } from './entities/lab-service.entity';
import { CreateLabServiceDto, UpdateLabServiceDto } from './dto/lab-service.dto';

@Injectable()
export class LabServiceCatalogService {
  constructor(
    @InjectRepository(LabService) private repo: Repository<LabService>,
  ) {}

  async create(clinicId: string, dto: CreateLabServiceDto): Promise<LabService> {
    const svc = this.repo.create({ clinicId, ...dto });
    return this.repo.save(svc);
  }

  /** Active-only by default (used by order-entry pickers); pass includeInactive for catalog management. */
  async findAll(clinicId: string, opts: { includeInactive?: boolean; category?: string; search?: string } = {}) {
    let qb = this.repo.createQueryBuilder('s').where('s.clinicId = :clinicId', { clinicId });
    if (!opts.includeInactive) qb = qb.andWhere('s.isActive = :active', { active: true });
    if (opts.category) qb = qb.andWhere('s.category = :category', { category: opts.category });
    if (opts.search) {
      qb = qb.andWhere(`(s.name ${ilike()} :q OR s.panelName ${ilike()} :q)`, { q: `%${opts.search}%` });
    }
    return qb.orderBy('s.category', 'ASC').addOrderBy('s.name', 'ASC').getMany();
  }

  async findOne(clinicId: string, id: string): Promise<LabService> {
    const svc = await this.repo.findOne({ where: { id, clinicId } });
    if (!svc) throw new NotFoundException('Lab service not found');
    return svc;
  }

  /** Bulk lookup used when an order references several services at once. */
  async findByIds(clinicId: string, ids: string[]): Promise<LabService[]> {
    if (!ids?.length) return [];
    return this.repo
      .createQueryBuilder('s')
      .where('s.clinicId = :clinicId', { clinicId })
      .andWhere('s.id IN (:...ids)', { ids })
      .getMany();
  }

  async update(clinicId: string, id: string, dto: UpdateLabServiceDto): Promise<LabService> {
    const svc = await this.findOne(clinicId, id);
    Object.assign(svc, dto);
    return this.repo.save(svc);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    // Soft-delete by default: deactivate instead of hard-deleting, so
    // historical lab orders that reference this service by id keep
    // resolving its name/panel correctly on old reports.
    const svc = await this.findOne(clinicId, id);
    svc.isActive = false;
    await this.repo.save(svc);
  }

  async hardRemove(clinicId: string, id: string): Promise<void> {
    const svc = await this.findOne(clinicId, id);
    await this.repo.remove(svc);
  }
}