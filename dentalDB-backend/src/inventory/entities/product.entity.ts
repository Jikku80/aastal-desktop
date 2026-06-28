import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Branch } from '../../branch/entities/branch.entity';

@Entity('products')
@Index(['clinicId'])
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

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}