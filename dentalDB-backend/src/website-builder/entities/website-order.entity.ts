import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Product } from '../../inventory/entities/product.entity';

export type WebsiteOrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export interface WebsiteOrderItem {
  productId:   string;
  productName: string;
  price:       number;
  quantity:    number;
  subtotal:    number;
}

@Entity('website_orders')
@Index(['clinicId'])
@Index(['status'])
export class WebsiteOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  // Customer details
  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column()
  customerAddress: string;

  @Column({ nullable: true })
  orderNotes: string;

  // Items as JSON
  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb' })
  items: WebsiteOrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: 'cod' })
  paymentMethod: string; // 'cod' = cash on delivery

  @Column({ default: 'pending' })
  status: WebsiteOrderStatus;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
