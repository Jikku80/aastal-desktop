import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LabWork, LabWorkStatus, LabWorkPriority } from './entities/lab-work.entity';
import { CreateLabWorkDto, UpdateLabWorkDto } from './dto/lab-work.dto';
import { Expense, ExpenseCategory, ApprovalStatus } from '../expenses/entities/expense.entity';

@Injectable()
export class LabWorkService {
  private readonly logger = new Logger(LabWorkService.name);

  constructor(
    @InjectRepository(LabWork) private repo: Repository<LabWork>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
  ) {}

  async create(clinicId: string, dto: CreateLabWorkDto, userId?: string): Promise<LabWork> {
    const lab = this.repo.create({ clinicId, ...dto });
    const saved = await this.repo.save(lab);

    // If cost provided at creation, log expense immediately
    if (saved.cost && Number(saved.cost) > 0) {
      await this._upsertLabExpense(clinicId, saved, userId ?? 'system');
    }

    return saved;
  }

  async findAll(clinicId: string, query?: any) {
    const {
      page = 1, limit = 20, patientId, status, priority,
      startDate, endDate, search,
    } = query || {};

    let qb = this.repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.patient', 'patient')
      .leftJoinAndSelect('l.orderedBy', 'orderedBy')
      .where('l.clinicId = :clinicId', { clinicId });

    if (patientId)  qb = qb.andWhere('l.patientId = :patientId',   { patientId });
    if (status)     qb = qb.andWhere('l.status = :status',         { status });
    if (priority)   qb = qb.andWhere('l.priority = :priority',     { priority });
    if (startDate)  qb = qb.andWhere('l.createdAt >= :startDate',  { startDate });
    if (endDate)    qb = qb.andWhere('l.createdAt <= :endDate',    { endDate: endDate + 'T23:59:59Z' });
    if (search) {
      qb = qb.andWhere(
        `(l.testName ${ilike()} :q OR l.labName ${ilike()} :q OR patient.firstName ${ilike()} :q OR patient.lastName ${ilike()} :q)`,
        { q: `%${search}%` },
      );
    }

    qb = qb.orderBy('l.createdAt', 'DESC');
    const total = await qb.getCount();
    const data  = await qb.skip((+page - 1) * +limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(clinicId: string, id: string): Promise<LabWork> {
    const lab = await this.repo.findOne({
      where: { id, clinicId },
      relations: ['patient', 'orderedBy'],
    });
    if (!lab) throw new NotFoundException('Lab work order not found');
    return lab;
  }

  async findByPatient(clinicId: string, patientId: string): Promise<LabWork[]> {
    return this.repo.find({
      where: { clinicId, patientId },
      relations: ['orderedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPatientIds(patientIds: string[]): Promise<LabWork[]> {
    if (patientIds.length === 0) return [];
    return this.repo.find({
      where: { patientId: In(patientIds) },
      relations: ['orderedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Tests for this patient that have a cost but haven't been added to any invoice yet — used by the billing screen. */
  async findUnbilledByPatient(clinicId: string, patientId: string): Promise<LabWork[]> {
    return this.repo
      .createQueryBuilder('l')
      .where('l.clinicId = :clinicId', { clinicId })
      .andWhere('l.patientId = :patientId', { patientId })
      .andWhere('l.invoiceId IS NULL')
      .andWhere('l.cost IS NOT NULL AND l.cost > 0')
      .orderBy('l.createdAt', 'DESC')
      .getMany();
  }

  /** Called by the billing module once these tests are added to an invoice, so they can't be billed twice. */
  async markBilled(clinicId: string, ids: string[], invoiceId: string): Promise<void> {
    if (!ids.length) return;
    await this.repo
      .createQueryBuilder()
      .update(LabWork)
      .set({ invoiceId, billedAt: new Date() })
      .where('id IN (:...ids) AND clinicId = :clinicId', { ids, clinicId })
      .execute();
  }

  async update(clinicId: string, id: string, dto: UpdateLabWorkDto, userId?: string): Promise<LabWork> {
    const lab = await this.findOne(clinicId, id);
    const prevCost = Number(lab.cost ?? 0);

    // Auto-set patientNotifiedAt when status moves to completed
    if (dto.status === LabWorkStatus.COMPLETED && !lab.patientNotifiedAt) {
      lab.patientNotifiedAt = new Date();
    }

    Object.assign(lab, dto);
    const saved = await this.repo.save(lab);

    // If cost changed and is now set, upsert the expense record
    const newCost = Number(saved.cost ?? 0);
    if (newCost > 0 && newCost !== prevCost) {
      await this._upsertLabExpense(clinicId, saved, userId ?? 'system');
    }

    return saved;
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const lab = await this.findOne(clinicId, id);
    await this.repo.remove(lab);
  }

  async getStats(clinicId: string) {
    const [total, pending, inProgress, completed, urgent] = await Promise.all([
      this.repo.count({ where: { clinicId } }),
      this.repo.count({ where: { clinicId, status: LabWorkStatus.PENDING } }),
      this.repo.count({ where: { clinicId, status: LabWorkStatus.IN_PROGRESS } }),
      this.repo.count({ where: { clinicId, status: LabWorkStatus.COMPLETED } }),
      this.repo.count({ where: { clinicId, priority: LabWorkPriority.URGENT } }),
    ]);
    return { total, pending, inProgress, completed, urgent };
  }

  /** Create or update the linked expense for a lab work order */
  private async _upsertLabExpense(clinicId: string, lab: LabWork, userId: string): Promise<void> {
    try {
      const existing = await this.expenseRepo.findOne({ where: { labWorkId: lab.id, clinicId } });
      const patientName = lab.patient
        ? `${lab.patient.firstName} ${lab.patient.lastName}`
        : 'Patient';

      if (existing) {
        existing.amount = Number(lab.cost);
        existing.description = `Lab Work — ${lab.testName} (${lab.labName ?? 'External Lab'}) for ${patientName}`;
        await this.expenseRepo.save(existing);
      } else {
        const expense = this.expenseRepo.create({
          clinicId,
          category: ExpenseCategory.LAB_SUPPLIES,
          amount: Number(lab.cost),
          description: `Lab Work — ${lab.testName} (${lab.labName ?? 'External Lab'}) for ${patientName}`,
          expenseDate: (lab.sampleCollectedAt ?? new Date().toISOString().split('T')[0]),
          labWorkId: lab.id,
          createdBy: userId,
          approvalStatus: ApprovalStatus.PENDING,
        });
        await this.expenseRepo.save(expense);
      }
    } catch (e) {
      this.logger.error(`Lab expense upsert failed for lab ${lab.id}`);
    }
  }
}