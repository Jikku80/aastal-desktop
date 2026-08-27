import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Branch } from '../../branch/entities/branch.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

/**
 * One row per stock-decrement event — logged by
 * InventoryService.adjustStock() whenever it's called with a negative
 * delta (a positive delta is a restock/PO receipt, not consumption; see
 * that method). Previously ClinicKarobar only tracked current
 * Product.stockQuantity in place with no per-event log, which is why
 * jwantra's inventory_consumption_prediction pipeline had nothing to
 * sync (see integrations/jwantra/mappers/jwantra.mappers.ts::
 * mapInventoryItemToJwantra's docstring) — this table is what closes
 * that gap. Exposed to jwantra via
 * integrations/jwantra/jwantra-data.controller.ts::GET /inventory-consumption.
 */
@Entity('inventory_consumption_events')
@Index(['clinicId', 'productId'])
@Index(['branchId'])
export class InventoryConsumptionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

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

  // Positive quantity consumed (the absolute value of the negative
  // adjustStock delta that produced this row).
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz' })
  occurredAt: Date;

  // What caused the deduction — 'billing' for the two normal invoice
  // flows (create-paid, markPaid), 'manual_adjustment' for anything else
  // (e.g. a future stock-correction UI). Informational only.
  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  appointmentId: string;

  @Column({ nullable: true })
  invoiceId: string;

  @Column({ nullable: true })
  patientId: string;

  @CreateDateColumn() createdAt: Date;
}
