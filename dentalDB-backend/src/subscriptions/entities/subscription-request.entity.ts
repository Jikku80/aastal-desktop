import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';

export enum SubscriptionRequestType {
  ACTIVATION = 'activation',
  RENEWAL    = 'renewal',
  UPGRADE    = 'upgrade',
}

export enum SubscriptionRequestStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('subscription_requests')
export class SubscriptionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  requestedPlan: string;

  @Column({ nullable: true })
  billingCycle: string;

  @Column({
    type: 'varchar', default: SubscriptionRequestType.ACTIVATION,
  })
  type: SubscriptionRequestType;

  @Column({
    type: 'varchar', default: SubscriptionRequestStatus.PENDING,
  })
  status: SubscriptionRequestStatus;

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  contactNumber: string;

  @Column({ nullable: true })
  paymentProofUrl: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true, type: 'int' })
  numBranches: number;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
