import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Invoice } from '../../billing/entities/invoice.entity';
import { ClinicService } from '../../services/entities/service.entity';

@Entity('doctor_commissions')
@Index(['clinicId', 'doctorId'])
@Index(['clinicId', 'invoiceId'])
export class DoctorCommission {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  doctorId: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice, { eager: false, nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ nullable: true })
  serviceId: string;

  @ManyToOne(() => ClinicService, { eager: true, nullable: true })
  @JoinColumn({ name: 'serviceId' })
  service: ClinicService;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  serviceRevenue: number; // line item total that generated this commission

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionPercentage: number;

  @CreateDateColumn() createdAt: Date;
}
