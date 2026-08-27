import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThan } from 'typeorm';
import { MedicineBatch, BatchStatus } from './entities/medicine-batch.entity';
import { Product, InventoryItemType } from '../inventory/entities/product.entity';
import { InventoryService, StockAdjustmentContext } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { CreateMedicineBatchDto, UpdateMedicineBatchDto, DispenseBatchDto, DisposeBatchDto } from './dto/medicine-batch.dto';

/** Default expiry-warning thresholds (days), used both by the dashboard filters and the (phase 2) scheduler — section 6/11/14. */
export const EXPIRY_THRESHOLDS_DAYS = [180, 90, 60, 30, 14, 7, 1];

/** How many days out "expiring soon" starts, for status computation — the nearest configured threshold that still lets ACTIVE batches be distinguished from truly imminent ones. Kept separate from the notification thresholds so this stays a display concern. */
const EXPIRING_SOON_WINDOW_DAYS = 30;

export function toDateOnly(d: string | Date): Date {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Pure status calculator — section 5. Shared by create/update here and by
 * the (phase 2) daily expiry scheduler so a batch's status is always
 * derived the same way regardless of what triggered the recompute.
 */
export function computeBatchStatus(batch: { startDate: string; expiryDate: string; quantityAvailable: number }, now: Date = new Date()): BatchStatus {
  if (Number(batch.quantityAvailable) <= 0) return BatchStatus.DEPLETED;

  const today = toDateOnly(now);
  const start = toDateOnly(batch.startDate);
  const expiry = toDateOnly(batch.expiryDate);

  if (today < start) return BatchStatus.NOT_AVAILABLE;
  if (today > expiry) return BatchStatus.EXPIRED;

  const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToExpiry <= EXPIRING_SOON_WINDOW_DAYS) return BatchStatus.EXPIRING_SOON;

  return BatchStatus.ACTIVE;
}

/** Batch statuses eligible for dispensing/selling/allocation — section 8 step 2. */
const ELIGIBLE_STATUSES = [BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON];

export interface FefoAllocationLine {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  constructor(
    @InjectRepository(MedicineBatch) private batchRepo: Repository<MedicineBatch>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @Inject(forwardRef(() => InventoryService)) private inventoryService: InventoryService,
    private auditService: AuditService,
  ) {}

  // ── Batch CRUD ────────────────────────────────────────────────────────────

  async createBatch(clinicId: string, dto: CreateMedicineBatchDto, userId?: string): Promise<MedicineBatch> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId, clinicId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.itemType !== InventoryItemType.PHARMACEUTICAL) {
      throw new BadRequestException('Batches can only be added to products classified as Pharmaceutical / Medicine');
    }

    const existing = await this.batchRepo.findOne({
      where: { clinicId, productId: dto.productId, batchNumber: dto.batchNumber },
    });
    if (existing) throw new BadRequestException(`Batch number "${dto.batchNumber}" already exists for this product`);

    const batch = this.batchRepo.create({
      clinicId,
      branchId: dto.branchId ?? product.branchId ?? undefined,
      productId: dto.productId,
      batchNumber: dto.batchNumber,
      manufacturingDate: dto.manufacturingDate ?? null,
      startDate: dto.startDate,
      expiryDate: dto.expiryDate,
      quantityReceived: dto.quantityReceived,
      quantityAvailable: dto.quantityReceived,
      purchaseOrderId: dto.purchaseOrderId,
      supplierName: dto.supplierName ?? product.supplierName,
      vendorId: dto.vendorId,
      purchaseCost: dto.purchaseCost,
      sellingPrice: dto.sellingPrice,
      createdByUserId: userId,
    });
    batch.status = computeBatchStatus(batch);

    const saved = await this.batchRepo.save(batch);

    // Reuse the existing stock movement mechanism — this batch's received
    // quantity becomes part of Product.stockQuantity, same as a PO receipt.
    // Not routed through InventoryService's PO-received path to avoid
    // double counting; purchaseOrderId here is informational only.
    await this.inventoryService.adjustStock(clinicId, dto.productId, dto.quantityReceived, {
      branchId: batch.branchId,
      reason: 'pharmacy_batch_received',
    });

    await this.auditService.log({
      clinicId, userId,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.MEDICINE_BATCH,
      entityId: saved.id,
      changes: { after: { batchNumber: saved.batchNumber, productId: saved.productId, quantityReceived: saved.quantityReceived, expiryDate: saved.expiryDate, startDate: saved.startDate } },
    });

    return saved;
  }

  async findAll(clinicId: string, query: {
    productId?: string;
    branchId?: string;
    branchIds?: string[];
    status?: BatchStatus;
    expiringWithinDays?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: MedicineBatch[]; total: number; page: number; limit: number }> {
    const { productId, branchId, branchIds, status, expiringWithinDays, page = 1, limit = 50 } = query;

    let qb = this.batchRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.product', 'product')
      .where('b.clinicId = :clinicId', { clinicId });

    if (productId) qb = qb.andWhere('b.productId = :productId', { productId });
    if (branchId) qb = qb.andWhere('b.branchId = :branchId', { branchId });
    else if (branchIds && branchIds.length) qb = qb.andWhere('b.branchId IN (:...branchIds)', { branchIds });
    if (status) qb = qb.andWhere('b.status = :status', { status });
    if (expiringWithinDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Number(expiringWithinDays));
      qb = qb.andWhere('b.expiryDate <= :cutoff', { cutoff: cutoff.toISOString().split('T')[0] })
             .andWhere('b.status != :expired', { expired: BatchStatus.EXPIRED });
    }

    qb = qb.orderBy('b.expiryDate', 'ASC');
    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(clinicId: string, id: string): Promise<MedicineBatch> {
    const batch = await this.batchRepo.findOne({ where: { id, clinicId }, relations: ['product'] });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async update(clinicId: string, id: string, dto: UpdateMedicineBatchDto, userId?: string): Promise<MedicineBatch> {
    const batch = await this.findOne(clinicId, id);
    const before = { startDate: batch.startDate, expiryDate: batch.expiryDate, quantityAvailable: batch.quantityAvailable, branchId: batch.branchId };

    Object.assign(batch, dto);
    batch.status = computeBatchStatus(batch);
    const saved = await this.batchRepo.save(batch);

    await this.auditService.log({
      clinicId, userId,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.MEDICINE_BATCH,
      entityId: saved.id,
      changes: { before, after: { startDate: saved.startDate, expiryDate: saved.expiryDate, quantityAvailable: saved.quantityAvailable, branchId: saved.branchId } },
    });

    return saved;
  }

  async remove(clinicId: string, id: string, userId?: string): Promise<void> {
    const batch = await this.findOne(clinicId, id);
    if (Number(batch.quantityAvailable) !== Number(batch.quantityReceived)) {
      throw new BadRequestException('Cannot delete a batch that has already been dispensed from or adjusted — use stock disposal instead');
    }
    // Undo the stock-in this batch contributed.
    await this.inventoryService.adjustStock(clinicId, batch.productId, -Number(batch.quantityReceived), {
      branchId: batch.branchId, reason: 'pharmacy_batch_deleted',
    });
    await this.batchRepo.remove(batch);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.DELETED, entityType: AuditEntityType.MEDICINE_BATCH, entityId: id,
    });
  }

  // ── Usable stock (section 10) ────────────────────────────────────────────

  /** Usable stock = quantity in ACTIVE/EXPIRING_SOON batches only. Excludes expired, not-yet-available, and depleted batches. */
  async getUsableStock(clinicId: string, productId: string, branchId?: string): Promise<number> {
    const qb = this.batchRepo.createQueryBuilder('b')
      .select('COALESCE(SUM(b.quantityAvailable), 0)', 'total')
      .where('b.clinicId = :clinicId AND b.productId = :productId', { clinicId, productId })
      .andWhere('b.status IN (:...statuses)', { statuses: ELIGIBLE_STATUSES });
    if (branchId) qb.andWhere('b.branchId = :branchId', { branchId });
    const row = await qb.getRawOne();
    return Number(row?.total ?? 0);
  }

  /** Usable stock for every pharmaceutical product in a clinic, keyed by productId — used by the low-stock integration (phase 2) and the dashboard. */
  async getUsableStockByProduct(clinicId: string, branchId?: string): Promise<Map<string, number>> {
    const qb = this.batchRepo.createQueryBuilder('b')
      .select('b.productId', 'productId')
      .addSelect('COALESCE(SUM(b.quantityAvailable), 0)', 'total')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.status IN (:...statuses)', { statuses: ELIGIBLE_STATUSES })
      .groupBy('b.productId');
    if (branchId) qb.andWhere('b.branchId = :branchId', { branchId });
    const rows = await qb.getRawMany();
    return new Map(rows.map(r => [r.productId, Number(r.total)]));
  }

  // ── FEFO allocation (section 8) ──────────────────────────────────────────

  async getEligibleBatches(clinicId: string, productId: string, branchId?: string): Promise<MedicineBatch[]> {
    const where: any = { clinicId, productId, status: In(ELIGIBLE_STATUSES) };
    if (branchId) where.branchId = branchId;
    return this.batchRepo.find({ where, order: { expiryDate: 'ASC' } });
  }

  /**
   * Allocate `quantity` units of a product using First-Expired-First-Out.
   * Excludes expired/depleted/not-yet-available batches, sorts by nearest
   * expiry, and consumes from each in order until satisfied. Does not
   * mutate anything — callers use this to preview an allocation, then
   * call dispense() (or their own transactional equivalent) to commit it.
   */
  async planFefoAllocation(clinicId: string, productId: string, quantity: number, branchId?: string): Promise<FefoAllocationLine[]> {
    const batches = await this.getEligibleBatches(clinicId, productId, branchId);
    const plan: FefoAllocationLine[] = [];
    let remaining = quantity;

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(batch.quantityAvailable));
      if (take <= 0) continue;
      plan.push({ batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, quantity: take });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Insufficient usable stock: requested ${quantity}, only ${quantity - remaining} available across eligible (non-expired, available) batches`,
      );
    }
    return plan;
  }

  /**
   * Commit a dispense: allocates via FEFO (or a single manual batch if
   * dto.batchId is set), decrements each batch's quantityAvailable, and
   * routes the total through the existing InventoryService.adjustStock so
   * Product.stockQuantity and the consumption-event log stay authoritative
   * — this table only tracks the lot-level breakdown (section 9).
   */
  async dispense(clinicId: string, dto: DispenseBatchDto, userId?: string): Promise<{ allocations: FefoAllocationLine[] }> {
    let allocations: FefoAllocationLine[];

    if (dto.batchId) {
      // Manual batch override — gated at the controller level behind
      // pharmacy.manual_batch_selection (section 8: "Manual batch selection
      // should be possible only for authorized users").
      const batch = await this.findOne(clinicId, dto.batchId);
      if (batch.productId !== dto.productId) throw new BadRequestException('Batch does not belong to the specified product');
      if (!ELIGIBLE_STATUSES.includes(batch.status)) {
        throw new BadRequestException(`Batch ${batch.batchNumber} is ${batch.status} and cannot be dispensed from`);
      }
      if (Number(batch.quantityAvailable) < dto.quantity) {
        throw new BadRequestException(`Batch ${batch.batchNumber} only has ${batch.quantityAvailable} available`);
      }
      allocations = [{ batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, quantity: dto.quantity }];
    } else {
      allocations = await this.planFefoAllocation(clinicId, dto.productId, dto.quantity, dto.branchId);
    }

    for (const line of allocations) {
      const batch = await this.findOne(clinicId, line.batchId);
      batch.quantityAvailable = Number(batch.quantityAvailable) - line.quantity;
      batch.status = computeBatchStatus(batch);
      await this.batchRepo.save(batch);
    }

    const context: StockAdjustmentContext = {
      branchId: dto.branchId,
      reason: dto.reason ?? 'pharmacy_dispense',
      appointmentId: dto.appointmentId,
      invoiceId: dto.invoiceId,
      patientId: dto.patientId,
    };
    await this.inventoryService.adjustStock(clinicId, dto.productId, -dto.quantity, context);

    await this.auditService.log({
      clinicId, userId,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.MEDICINE_BATCH,
      entityId: dto.productId,
      changes: { after: { dispensed: dto.quantity, allocations, manualOverride: !!dto.batchId } },
    });

    return { allocations };
  }

  // ── Expired stock disposal (section 9) ──────────────────────────────────
  // Reuses the existing stock-movement mechanism (adjustStock) and the
  // existing Expense module for the write-off value — no parallel
  // disposal/wastage system. Gated at the controller behind
  // pharmacy.manage_expired_stock.

  async disposeBatch(clinicId: string, batchId: string, dto: DisposeBatchDto, userId?: string): Promise<MedicineBatch> {
    const batch = await this.findOne(clinicId, batchId);
    if (batch.status !== BatchStatus.EXPIRED) {
      throw new BadRequestException('Only batches with EXPIRED status can be disposed through this workflow');
    }
    const quantity = dto.quantity ?? Number(batch.quantityAvailable);
    if (quantity <= 0 || quantity > Number(batch.quantityAvailable)) {
      throw new BadRequestException(`Invalid disposal quantity — batch has ${batch.quantityAvailable} units available`);
    }

    batch.quantityAvailable = Number(batch.quantityAvailable) - quantity;
    batch.status = computeBatchStatus(batch); // drops to DEPLETED once it hits 0, otherwise stays EXPIRED
    const saved = await this.batchRepo.save(batch);

    // Same stock-out mechanism as dispense() — keeps Product.stockQuantity
    // and the consumption log authoritative for the physical write-off.
    await this.inventoryService.adjustStock(clinicId, batch.productId, -quantity, {
      branchId: batch.branchId,
      reason: 'expired_disposal',
    });

    // Best-effort loss record via the existing Expense workflow, mirroring
    // how InventoryService already logs an Expense for PO receipts. Failure
    // here must never block the disposal itself.
    if (batch.purchaseCost) {
      try {
        await this.inventoryService.recordExpiredDisposalExpense(clinicId, {
          branchId: batch.branchId,
          amount: Number(batch.purchaseCost) * quantity,
          description: `Expired stock write-off — batch ${batch.batchNumber} (${quantity} units)`,
          createdBy: userId ?? 'system',
        });
      } catch (e) {
        this.logger.warn(`Failed to record disposal expense for batch ${batchId}: ${(e as any)?.message}`);
      }
    }

    await this.auditService.log({
      clinicId, userId,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.MEDICINE_BATCH,
      entityId: saved.id,
      changes: { after: { disposed: quantity, reason: dto.reason ?? 'expired_disposal', remaining: saved.quantityAvailable } },
    });

    return saved;
  }

  // ── Reporting (section 14) ───────────────────────────────────────────────
  // Extends the existing reporting pattern (branch-scoped query-builder
  // reads off the same tables) rather than a separate reporting subsystem.

  async getExpiryReport(clinicId: string, branchIds?: string[]): Promise<MedicineBatch[]> {
    const qb = this.batchRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.product', 'product')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.status IN (:...statuses)', { statuses: [BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON] });
    if (branchIds?.length) qb.andWhere('b.branchId IN (:...branchIds)', { branchIds });
    return qb.orderBy('b.expiryDate', 'ASC').getMany();
  }

  async getExpiredStockReport(clinicId: string, branchIds?: string[]): Promise<MedicineBatch[]> {
    const qb = this.batchRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.product', 'product')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.status = :status', { status: BatchStatus.EXPIRED })
      .andWhere('b.quantityAvailable > 0');
    if (branchIds?.length) qb.andWhere('b.branchId IN (:...branchIds)', { branchIds });
    return qb.orderBy('b.expiryDate', 'ASC').getMany();
  }

  async getNearExpiryReport(clinicId: string, days: number, branchIds?: string[]): Promise<MedicineBatch[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + Number(days));
    const qb = this.batchRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.product', 'product')
      .where('b.clinicId = :clinicId', { clinicId })
      .andWhere('b.status IN (:...statuses)', { statuses: [BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON] })
      .andWhere('b.expiryDate <= :cutoff', { cutoff: cutoff.toISOString().split('T')[0] });
    if (branchIds?.length) qb.andWhere('b.branchId IN (:...branchIds)', { branchIds });
    return qb.orderBy('b.expiryDate', 'ASC').getMany();
  }

  /** Per-branch rollup for multi-branch admins (section 14 "Branch Comparison"). */
  async getBranchComparison(clinicId: string, branchIds?: string[]): Promise<Array<{
    branchId: string | null; expiringCount: number; expiringQuantity: number;
    expiredCount: number; expiredQuantity: number; inventoryValue: number;
  }>> {
    const qb = this.batchRepo.createQueryBuilder('b')
      .select('b.branchId', 'branchId')
      .addSelect(`SUM(CASE WHEN b.status IN ('${BatchStatus.ACTIVE}', '${BatchStatus.EXPIRING_SOON}') THEN 1 ELSE 0 END)`, 'expiringCount')
      .addSelect(`SUM(CASE WHEN b.status IN ('${BatchStatus.ACTIVE}', '${BatchStatus.EXPIRING_SOON}') THEN b.quantityAvailable ELSE 0 END)`, 'expiringQuantity')
      .addSelect(`SUM(CASE WHEN b.status = '${BatchStatus.EXPIRED}' THEN 1 ELSE 0 END)`, 'expiredCount')
      .addSelect(`SUM(CASE WHEN b.status = '${BatchStatus.EXPIRED}' THEN b.quantityAvailable ELSE 0 END)`, 'expiredQuantity')
      .addSelect('COALESCE(SUM(b.quantityAvailable * b.purchaseCost), 0)', 'inventoryValue')
      .where('b.clinicId = :clinicId', { clinicId })
      .groupBy('b.branchId');
    if (branchIds?.length) qb.andWhere('b.branchId IN (:...branchIds)', { branchIds });
    const rows = await qb.getRawMany();
    return rows.map(r => ({
      branchId: r.branchId,
      expiringCount: Number(r.expiringCount) || 0,
      expiringQuantity: Number(r.expiringQuantity) || 0,
      expiredCount: Number(r.expiredCount) || 0,
      expiredQuantity: Number(r.expiredQuantity) || 0,
      inventoryValue: Number(r.inventoryValue) || 0,
    }));
  }
}
