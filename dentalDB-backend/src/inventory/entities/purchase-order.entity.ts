import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum PurchaseOrderStatus {
  DRAFT     = 'draft',
  ORDERED   = 'ordered',
  RECEIVED  = 'received',
  CANCELLED = 'cancelled',
}

export interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  /** Unit this line was ordered in, e.g. 'box'. Informational/display only. */
  purchaseUnit?: string;
  /** How many base stock units one purchased unit converts to (e.g. 1 box = 100 tablets). Defaults to 1 if absent (legacy rows / 1:1 products). */
  unitsPerPurchase?: number;
}

@Entity('purchase_orders')
@Index(['clinicId', 'status'])
export class PurchaseOrder {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column({ nullable: true })
  supplierName: string;

  @Column({ nullable: true })
  supplierPhone: string;

  @Column({ type: 'simple-json' })
  items: POItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  orderedAt: Date;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  receivedAt: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
