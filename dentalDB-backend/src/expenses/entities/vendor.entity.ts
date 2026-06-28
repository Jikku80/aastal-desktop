import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum VendorType {
  SUPPLIER         = 'supplier',
  SERVICE_PROVIDER = 'service_provider',
  UTILITY          = 'utility',
  OTHER            = 'other',
}

@Entity('vendors')
@Index(['clinicId', 'vendorType'])
export class Vendor {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() clinicId: string;
  @Column() name: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) address: string;
  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: VendorType, default: VendorType.OTHER }) vendorType: VendorType;
  @Column({ nullable: true }) taxNumber: string;
  @Column({ nullable: true }) bankAccount: string;
  @Column({ nullable: true }) notes: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
