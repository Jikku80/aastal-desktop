import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PurchaseOrder, PurchaseOrderStatus, POItem } from './entities/purchase-order.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import { Expense, ExpenseCategory, ApprovalStatus } from '../expenses/entities/expense.entity';
import { Vendor, VendorType } from '../expenses/entities/vendor.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
  ) {}

  // ── Products ────────────────────────────────────────────────────────────────

  async create(clinicId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.repo.create({ ...dto, clinicId });
    return this.repo.save(product);
  }

  async findAll(clinicId: string, query?: any) {
    const { page = 1, limit = 50, search, activeOnly, branchId } = query || {};
    let qb = this.repo.createQueryBuilder('p').where('p.clinicId = :clinicId', { clinicId });
    if (branchId) qb = qb.andWhere('(p.branchId = :branchId OR p.branchId IS NULL)', { branchId });
    if (search) qb = qb.andWhere(`p.name ${ilike()} :s`, { s: `%${search}%` });
    if (activeOnly === 'true') qb = qb.andWhere('p.isActive = true');
    qb = qb.orderBy('p.name', 'ASC');
    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(clinicId: string, id: string): Promise<Product> {
    const p = await this.repo.findOne({ where: { id, clinicId } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async update(clinicId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(clinicId, id);
    await this.repo.update({ id, clinicId }, dto as any);
    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }

  async adjustStock(clinicId: string, id: string, delta: number): Promise<void> {
    const p = await this.findOne(clinicId, id);
    const newQty = Math.max(0, (p.stockQuantity || 0) + delta);
    await this.repo.update({ id, clinicId }, { stockQuantity: newQty });
  }

  async findLowStock(clinicId: string): Promise<Product[]> {
    return this.repo
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.isActive = true')
      .andWhere('p.stockQuantity <= p.reorderPoint')
      .orderBy('p.stockQuantity', 'ASC')
      .getMany();
  }

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  async createPO(clinicId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const items = await this.snapshotPurchaseUnits(clinicId, dto.items);
    const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const po = this.poRepo.create({ ...dto, items, clinicId, totalCost });
    if ((dto as any).status === PurchaseOrderStatus.RECEIVED) {
      po.receivedAt = new Date();
    }
    const saved = await this.poRepo.save(po);

    // If created directly as received, update stock immediately
    if (saved.status === PurchaseOrderStatus.RECEIVED) {
      for (const item of saved.items) {
        try {
          const stockDelta = item.quantity * (item.unitsPerPurchase || 1);
          await this.adjustStock(clinicId, item.productId, stockDelta);
          this.logger.log(`[PO-create ${saved.id}] Stocked +${stockDelta} (${item.quantity} x ${item.purchaseUnit || 'unit'}) for product ${item.productId}`);
        } catch (e) {
          this.logger.error(`[PO-create ${saved.id}] Stock update failed for ${item.productId}`);
        }
      }
    }
    return saved;
  }

  /** Fill in each PO line item's purchaseUnit/unitsPerPurchase from the product's current configuration, unless already explicitly provided on the line. */
  private async snapshotPurchaseUnits(clinicId: string, items: any[]): Promise<POItem[]> {
    const productIds = [...new Set(items.map(i => i.productId))];
    const products = await this.repo.find({ where: productIds.map(id => ({ id, clinicId })) });
    const byId = new Map(products.map(p => [p.id, p]));
    return items.map(i => {
      const product = byId.get(i.productId);
      return {
        ...i,
        purchaseUnit:     i.purchaseUnit     ?? product?.purchaseUnit ?? product?.unit ?? undefined,
        unitsPerPurchase: i.unitsPerPurchase ?? product?.unitsPerPurchase ?? 1,
      };
    });
  }

  async findAllPOs(clinicId: string): Promise<PurchaseOrder[]> {
    return this.poRepo.find({ where: { clinicId }, order: { createdAt: 'DESC' } });
  }

  async findOnePO(clinicId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({ where: { id, clinicId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async updatePOStatus(clinicId: string, id: string, dto: UpdatePurchaseOrderDto, userId?: string): Promise<PurchaseOrder> {
    const po = await this.findOnePO(clinicId, id);
    if (dto.status === PurchaseOrderStatus.ORDERED && po.status === PurchaseOrderStatus.DRAFT) {
      po.orderedAt = new Date();
    }
    if (dto.status === PurchaseOrderStatus.RECEIVED && po.status !== PurchaseOrderStatus.RECEIVED) {
      po.receivedAt = new Date();

      // ── Stock adjustment ──────────────────────────────────────────────────
      for (const item of po.items) {
        try {
          const stockDelta = item.quantity * (item.unitsPerPurchase || 1);
          await this.adjustStock(clinicId, item.productId, stockDelta);
          this.logger.log(`[PO ${id}] Stocked +${stockDelta} (${item.quantity} x ${item.purchaseUnit || 'unit'}) for product ${item.productId}`);
        } catch (e) {
          this.logger.error(`[PO ${id}] Stock update failed for ${item.productId}`);
        }
      }

      // ── Auto-create expense for the purchase cost ─────────────────────────
      try {
        // Upsert vendor from PO supplier info
        let vendor: Vendor | null = null;
        if (po.supplierName) {
          vendor = await this.vendorRepo.findOne({ where: { clinicId, name: po.supplierName } }) ?? null;
          if (!vendor) {
            vendor = await this.vendorRepo.save(
              this.vendorRepo.create({
                clinicId,
                name: po.supplierName,
                phone: po.supplierPhone ?? undefined,
                vendorType: VendorType.SUPPLIER,
              }),
            );
          }
        }

        const itemList = po.items.map(i => `${i.productName} x${i.quantity}`).join(', ');
        const expense = this.expenseRepo.create({
          clinicId,
          branchId: po.branchId,
          category: ExpenseCategory.INVENTORY,
          amount: Number(po.totalCost),
          description: `Purchase Order received — ${itemList}`,
          expenseDate: new Date().toISOString().split('T')[0],
          purchaseOrderId: po.id,
          vendorId: vendor?.id,
          createdBy: userId ?? 'system',
          approvalStatus: ApprovalStatus.APPROVED,
          referenceNumber: po.id.slice(0, 8).toUpperCase(),
        });
        await this.expenseRepo.save(expense);
        this.logger.log(`[PO ${id}] Expense created for NPR ${po.totalCost}`);
      } catch (e) {
        this.logger.error(`[PO ${id}] Expense creation failed`);
      }
    }
    Object.assign(po, dto);
    return this.poRepo.save(po);
  }

  async deletePO(clinicId: string, id: string): Promise<void> {
    const po = await this.findOnePO(clinicId, id);
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot delete a received purchase order');
    }
    await this.poRepo.remove(po);
  }

  async findAllLowStockGroupedByClinic(): Promise<{ clinicId: string; products: Product[] }[]> {
    const products = await this.repo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stockQuantity <= p.reorderPoint')
      .getMany();
    const byClinic = new Map<string, Product[]>();
    for (const p of products) {
      if (!byClinic.has(p.clinicId)) byClinic.set(p.clinicId, []);
      byClinic.get(p.clinicId)!.push(p);
    }
    return Array.from(byClinic.entries()).map(([clinicId, prods]) => ({ clinicId, products: prods }));
  }
}