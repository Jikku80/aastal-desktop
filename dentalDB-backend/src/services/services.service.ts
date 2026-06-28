import { Injectable, NotFoundException } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicService } from './entities/service.entity';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ClinicService) private repo: Repository<ClinicService>,
  ) {}

  async create(clinicId: string, dto: CreateServiceDto): Promise<ClinicService> {
    const service = this.repo.create({ ...dto, clinicId });
    return this.repo.save(service);
  }

  async findAll(clinicId: string, query?: any) {
    const { page = 1, limit = 50, search, activeOnly } = query || {};
    let qb = this.repo.createQueryBuilder('s').where('s.clinicId = :clinicId', { clinicId });
    if (search) qb = qb.andWhere(`s.name ${ilike()} :s`, { s: `%${search}%` });
    if (activeOnly === 'true') qb = qb.andWhere('s.isActive = true');
    qb = qb.orderBy('s.name', 'ASC');
    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(clinicId: string, id: string): Promise<ClinicService> {
    const s = await this.repo.findOne({ where: { id, clinicId } });
    if (!s) throw new NotFoundException('Service not found');
    return s;
  }

  async update(clinicId: string, id: string, dto: UpdateServiceDto): Promise<ClinicService> {
    await this.findOne(clinicId, id);
    await this.repo.update({ id, clinicId }, dto as any);
    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }
}
