import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LabWork, LabWorkStatus, LabWorkPriority } from './entities/lab-work.entity';
import { CreateLabWorkDto, UpdateLabWorkDto } from './dto/lab-work.dto';
import { Expense, ExpenseCategory, ApprovalStatus } from '../expenses/entities/expense.entity';
import { pendingSyncFields } from '../sync/pending-sync.util';
import { LabServiceCatalogService } from './lab-service.service';
import { Patient, Gender } from '../patients/entities/patient.entity';

@Injectable()
export class LabWorkService {
  private readonly logger = new Logger(LabWorkService.name);

  constructor(
    @InjectRepository(LabWork) private repo: Repository<LabWork>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    private catalogService: LabServiceCatalogService,
  ) {}

  async create(clinicId: string, dto: CreateLabWorkDto, userId?: string): Promise<LabWork> {
    const lab = this.repo.create({ clinicId, ...this._sanitizeDates(dto) });

    // Pre-populate result rows from the selected catalog service(s) so the
    // tech only has to type the observed value — mirrors how the sample
    // multi-panel report groups tests under section headers. Only applies
    // when the caller didn't already supply results explicitly (e.g. a
    // quick free-text order with no catalog service attached).
    if (!lab.results?.length && dto.serviceIds?.length) {
      lab.results = await this._buildResultsFromServices(clinicId, dto.serviceIds, dto.patientId);
      if (!lab.cost) {
        const services = await this.catalogService.findByIds(clinicId, dto.serviceIds);
        const total = services.reduce((sum, s) => sum + Number(s.defaultPrice || 0), 0);
        if (total > 0) lab.cost = total;
      }
    }

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
      startDate, endDate, search, branchId, branchIds,
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
    if (branchId) {
      qb = qb.andWhere('l.branchId = :branchId', { branchId });
    } else if (branchIds) {
      const ids = String(branchIds).split(',').map((s: string) => s.trim()).filter(Boolean);
      if (ids.length > 0) qb = qb.andWhere('l.branchId IN (:...ids)', { ids });
    }
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
      .set({ invoiceId, billedAt: new Date(), ...pendingSyncFields('LabWork') })
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

    Object.assign(lab, this._sanitizeDates(dto));
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

  /**
   * Groups a lab order's flat `results` rows into panels for display/print —
   * rows with the same `panelName` render together as one section, matching
   * how the sample multi-panel lab report is laid out. Rows without a
   * panelName fall into a single "General" section.
   */
  groupResultsByPanel(lab: Pick<LabWork, 'results'>): { panelName: string; rows: LabWork['results'] }[] {
    const rows = lab.results || [];
    const order: string[] = [];
    const byPanel = new Map<string, LabWork['results']>();
    for (const row of rows) {
      const key = row.panelName || 'General';
      if (!byPanel.has(key)) {
        byPanel.set(key, []);
        order.push(key);
      }
      byPanel.get(key)!.push(row);
    }
    return order.map(panelName => ({ panelName, rows: byPanel.get(panelName)! }));
  }

  async getStats(clinicId: string, opts: { branchId?: string; branchIds?: string[] } = {}) {
    // Stats used to always be clinic-wide, so the counters on this page kept
    // showing every branch's numbers even while the list below was already
    // correctly scoped to the active branch. Apply the same branchId/branchIds
    // precedence used by findAll() so the two stay in sync.
    const baseWhere: any = { clinicId };
    if (opts.branchId) baseWhere.branchId = opts.branchId;
    else if (opts.branchIds && opts.branchIds.length > 0) baseWhere.branchId = In(opts.branchIds);

    const [total, pending, inProgress, completed, urgent] = await Promise.all([
      this.repo.count({ where: { ...baseWhere } }),
      this.repo.count({ where: { ...baseWhere, status: LabWorkStatus.PENDING } }),
      this.repo.count({ where: { ...baseWhere, status: LabWorkStatus.IN_PROGRESS } }),
      this.repo.count({ where: { ...baseWhere, status: LabWorkStatus.COMPLETED } }),
      this.repo.count({ where: { ...baseWhere, priority: LabWorkPriority.URGENT } }),
    ]);
    return { total, pending, inProgress, completed, urgent };
  }

  /**
   * Builds pre-populated result rows for the given catalog service ids —
   * one row per `defaultParameters` entry, grouped for printing via
   * `panelName` (falls back to the service's own name when it has none).
   * Resolves the patient's sex to pick `referenceRangeMale`/`referenceRangeFemale`
   * over the generic `referenceRange` when both are set on a parameter
   * (e.g. Uric Acid, Creatinine differ by sex in the sample report).
   */
  private async _buildResultsFromServices(
    clinicId: string,
    serviceIds: string[],
    patientId?: string,
  ): Promise<LabWork['results']> {
    const [services, patient] = await Promise.all([
      this.catalogService.findByIds(clinicId, serviceIds),
      patientId ? this.patientRepo.findOne({ where: { id: patientId } }) : Promise.resolve(null),
    ]);

    // Preserve the order the caller selected services in, not whatever
    // findByIds happened to return them in.
    const byId = new Map(services.map(s => [s.id, s]));
    const rows: LabWork['results'] = [];

    for (const id of serviceIds) {
      const svc = byId.get(id);
      if (!svc) continue;
      const panelName = svc.panelName || svc.name;
      for (const param of svc.defaultParameters || []) {
        const sexRange =
          patient?.gender === Gender.MALE ? param.referenceRangeMale :
          patient?.gender === Gender.FEMALE ? param.referenceRangeFemale :
          undefined;
        rows.push({
          panelName,
          parameter: param.parameter,
          value: '',
          unit: param.unit,
          referenceRange: sexRange || param.referenceRange,
          method: param.method,
        });
      }
    }
    return rows;
  }

  /**
   * Guards the `date`-typed columns against empty-string values. Postgres
   * (unlike SQLite) throws "invalid input syntax for type date" if `''` is
   * inserted into a `date` column, which is what a blank date picker on the
   * client submits as. Coerce blank strings to `null` here so create/update
   * stay resilient no matter what a given client sends.
   */
  private _sanitizeDates<T extends Partial<Pick<LabWork, 'sampleCollectedAt' | 'resultsReceivedAt'>>>(dto: T): T {
    const clean = { ...dto };
    if ('sampleCollectedAt' in clean && !clean.sampleCollectedAt) clean.sampleCollectedAt = null as any;
    if ('resultsReceivedAt' in clean && !clean.resultsReceivedAt) clean.resultsReceivedAt = null as any;
    return clean;
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