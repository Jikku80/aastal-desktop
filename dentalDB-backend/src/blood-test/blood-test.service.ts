import { Injectable, NotFoundException } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BloodTest, BloodTestStatus, BloodTestPriority } from './entities/blood-test.entity';
import { CreateBloodTestDto, UpdateBloodTestDto } from './dto/blood-test.dto';
import { pendingSyncFields } from '../sync/pending-sync.util';

@Injectable()
export class BloodTestService {
  constructor(
    @InjectRepository(BloodTest) private repo: Repository<BloodTest>,
  ) {}

  async create(clinicId: string, dto: CreateBloodTestDto): Promise<BloodTest> {
    const test = this.repo.create({ clinicId, branchId: dto.branchId || undefined, ...dto });
    return this.repo.save(test);
  }

  async findAll(clinicId: string, query?: any) {
    const {
      page = 1, limit = 20, patientId, status, priority, testType,
      startDate, endDate, search, branchId, branchIds,
    } = query || {};

    let qb = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.patient', 'patient')
      .leftJoinAndSelect('b.orderedBy', 'orderedBy')
      .where('b.clinicId = :clinicId', { clinicId });

    if (patientId) qb = qb.andWhere('b.patientId = :patientId', { patientId });
    if (status)    qb = qb.andWhere('b.status = :status',       { status });
    if (priority)  qb = qb.andWhere('b.priority = :priority',   { priority });
    if (testType)  qb = qb.andWhere('b.testType = :testType',   { testType });
    if (startDate) qb = qb.andWhere('b.createdAt >= :startDate', { startDate });
    if (endDate)   qb = qb.andWhere('b.createdAt <= :endDate',  { endDate: endDate + 'T23:59:59Z' });
    if (branchId) {
      qb = qb.andWhere('b.branchId = :branchId', { branchId });
    } else if (branchIds) {
      const ids = String(branchIds).split(',').map((s: string) => s.trim()).filter(Boolean);
      if (ids.length > 0) qb = qb.andWhere('b.branchId IN (:...ids)', { ids });
    }
    if (search) {
      qb = qb.andWhere(
        `(b.testName ${ilike()} :q OR b.labName ${ilike()} :q OR patient.firstName ${ilike()} :q OR patient.lastName ${ilike()} :q)`,
        { q: `%${search}%` },
      );
    }

    qb = qb.orderBy('b.createdAt', 'DESC');
    const total = await qb.getCount();
    const data  = await qb.skip((+page - 1) * +limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(clinicId: string, id: string): Promise<BloodTest> {
    const test = await this.repo.findOne({
      where: { id, clinicId },
      relations: ['patient', 'orderedBy'],
    });
    if (!test) throw new NotFoundException('Blood test order not found');
    return test;
  }

  async findByPatient(clinicId: string, patientId: string): Promise<BloodTest[]> {
    return this.repo.find({
      where: { clinicId, patientId },
      relations: ['orderedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Tests for this patient that have a cost but haven't been added to any invoice yet — used by the billing screen. */
  async findUnbilledByPatient(clinicId: string, patientId: string): Promise<BloodTest[]> {
    return this.repo
      .createQueryBuilder('b')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.patientId = :patientId', { patientId })
      .andWhere('b.invoiceId IS NULL')
      .andWhere('b.cost IS NOT NULL AND b.cost > 0')
      .orderBy('b.createdAt', 'DESC')
      .getMany();
  }

  /** Called by the billing module once these tests are added to an invoice, so they can't be billed twice. */
  async markBilled(clinicId: string, ids: string[], invoiceId: string): Promise<void> {
    if (!ids.length) return;
    await this.repo
      .createQueryBuilder()
      .update(BloodTest)
      .set({ invoiceId, billedAt: new Date(), ...pendingSyncFields('BloodTest') })
      .where('id IN (:...ids) AND clinicId = :clinicId', { ids, clinicId })
      .execute();
  }

  /**
   * Cross-clinic lookup for the patient portal — no clinicId filter.
   * Callers MUST pre-scope `patientIds` via PatientAccountLink so a patient
   * can never see another account's lab results.
   */
  async findByPatientIds(patientIds: string[]): Promise<BloodTest[]> {
    if (patientIds.length === 0) return [];
    return this.repo.find({
      where: { patientId: In(patientIds) },
      relations: ['orderedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateBloodTestDto): Promise<BloodTest> {
    const test = await this.findOne(clinicId, id);

    // Auto-set patientNotifiedAt when status moves to completed
    if (dto.status === BloodTestStatus.COMPLETED && !test.patientNotifiedAt) {
      test.patientNotifiedAt = new Date();
    }

    Object.assign(test, dto);
    return this.repo.save(test);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const test = await this.findOne(clinicId, id);
    await this.repo.remove(test);
  }

  async getStats(clinicId: string) {
    const [total, pending, inProgress, completed, urgent] = await Promise.all([
      this.repo.count({ where: { clinicId } }),
      this.repo.count({ where: { clinicId, status: BloodTestStatus.PENDING } }),
      this.repo.count({ where: { clinicId, status: BloodTestStatus.IN_PROGRESS } }),
      this.repo.count({ where: { clinicId, status: BloodTestStatus.COMPLETED } }),
      this.repo.count({ where: { clinicId, priority: BloodTestPriority.URGENT } }),
    ]);
    return { total, pending, inProgress, completed, urgent };
  }
}