import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Product } from '../../inventory/entities/product.entity';
import { Branch } from '../../branch/entities/branch.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

/**
 * Batch lifecycle. Computed by BatchStatusCalculator (pharmacy.service.ts)
 * from startDate/expiryDate/quantityAvailable — never set by hand except
 * DEPLETED (auto, when quantityAvailable hits 0) and EXPIRED (auto, once
 * past expiryDate). Persisted (rather than purely derived) so it can be
 * indexed and filtered on directly, same convention as PurchaseOrderStatus.
 */
export enum BatchStatus {
  NOT_AVAILABLE = 'not_available', // before startDate
  ACTIVE        = 'active',
  EXPIRING_SOON = 'expiring_soon', // within the nearest configured threshold, still usable
  EXPIRED       = 'expired',
  DEPLETED      = 'depleted',      // quantityAvailable = 0, regardless of expiry
}

/**
 * A single received lot of a pharmaceutical Product. A product may have
 * many batches; batch-level fields (expiry, start date, quantity) live
 * here instead of on Product so FEFO allocation and expiry tracking work
 * per-lot (see section 5/8 of the pharma spec). Extends the existing
 * inventory + stock-movement system — Product.stockQuantity remains the
 * source of truth for total physical stock; the sum of this table's
 * quantityAvailable per product should always reconcile with it.
 */
@Entity('medicine_batches')
@Index(['clinicId', 'productId'])
@Index(['branchId'])
@Index(['clinicId', 'status'])
@Index(['clinicId', 'expiryDate'])
@Index(['clinicId', 'productId', 'batchNumber'], { unique: true })
export class MedicineBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** Branch this batch physically sits at. Required for branch-scoped visibility (section 12). */
  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  batchNumber: string;

  @Column({ type: isSQLite ? 'date' : 'date', nullable: true })
  manufacturingDate: string | null;

  /** "Start Date" / "Available From Date" — section 4. Batch is NOT_AVAILABLE before this date. */
  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  expiryDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantityReceived: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantityAvailable: number;

  /** The existing PurchaseOrder that stocked this batch in, if any. */
  @Column({ nullable: true })
  purchaseOrderId: string;

  @Column({ nullable: true })
  supplierName: string;

  /** Optional link to the existing Vendor record (expenses/entities/vendor.entity.ts), same upsert-by-name convention InventoryService already uses for POs. */
  @Column({ nullable: true })
  vendorId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  purchaseCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  sellingPrice: number;

  @Column({
    type: isSQLite ? 'varchar' : 'enum',
    enum: BatchStatus,
    default: BatchStatus.NOT_AVAILABLE,
  })
  status: BatchStatus;

  @Column({ nullable: true })
  createdByUserId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
