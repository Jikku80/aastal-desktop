import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Branch } from '../../branch/entities/branch.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

/**
 * Classification of an inventory item. Every existing product defaults to
 * GENERAL so nothing already in the system changes behavior. Only items
 * classified PHARMACEUTICAL pick up batch/expiry/FEFO handling from the
 * `pharmacy` module (see pharmacy/entities/medicine-batch.entity.ts) — the
 * pharma-specific columns below stay null/unused for every other item type.
 */
export enum InventoryItemType {
  GENERAL        = 'general',
  PHARMACEUTICAL = 'pharmaceutical',
  MEDICAL_SUPPLY = 'medical_supply',
  CONSUMABLE     = 'consumable',
}

export enum DosageForm {
  TABLET   = 'tablet',
  CAPSULE  = 'capsule',
  SYRUP    = 'syrup',
  INJECTION = 'injection',
  CREAM    = 'cream',
  OINTMENT = 'ointment',
  DROPS    = 'drops',
  OTHER    = 'other',
}

@Entity('products')
@Index(['clinicId'])
@Index(['clinicId', 'itemType'])
export class Product {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { eager: false, nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ nullable: true })
  unit: string; // base/consumption unit, e.g. 'tablet', 'ml', 'piece' — this is what stockQuantity is counted in

  /** The unit this product is typically purchased in, e.g. 'box', 'bottle', 'carton'. Defaults to `unit` (1:1) when not set — i.e. purchased and tracked in the same unit. */
  @Column({ nullable: true })
  purchaseUnit: string;

  /** How many base `unit`s are in one `purchaseUnit` (e.g. 1 box = 100 tablets → 100). Defaults to 1 (no conversion). */
  @Column({ type: 'int', default: 1 })
  unitsPerPurchase: number;

  @Column({ nullable: true })
  sku: string;

  @Column({ default: true })
  isActive: boolean;

  /** Stock level at which a low-stock alert fires */
  @Column({ type: 'int', default: 10 })
  reorderPoint: number;

  @Column({ nullable: true })
  supplierName: string;

  @Column({ nullable: true })
  supplierPhone: string;

  @Column({ nullable: true })
  imageUrl: string;

  // ── Pharmaceutical classification & attributes ──────────────────────────
  // Extends the existing product model in place instead of a parallel
  // "medicine" table — see pharmacy/entities/medicine-batch.entity.ts for
  // batch-level (expiry/lot) data, which references this row by productId.

  @Column({
    type: isSQLite ? 'varchar' : 'enum',
    enum: InventoryItemType,
    default: InventoryItemType.GENERAL,
  })
  itemType: InventoryItemType;

  /** Only meaningful when itemType = PHARMACEUTICAL. */
  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  brandName: string;

  @Column({ nullable: true })
  medicineCategory: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: DosageForm, nullable: true })
  dosageForm: DosageForm;

  @Column({ nullable: true })
  strength: string;

  @Column({ nullable: true })
  dosageUnit: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true, type: 'text' })
  storageInstructions: string;

  @Column({ default: false })
  prescriptionRequired: boolean;

  /** Controlled / restricted substance — gates pharmacy.override_batch_restrictions elsewhere. */
  @Column({ default: false })
  isControlled: boolean;

  @Column({ nullable: true })
  barcode: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}