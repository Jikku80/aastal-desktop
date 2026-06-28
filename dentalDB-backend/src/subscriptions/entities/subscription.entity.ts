import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SubscriptionStatus {
  TRIAL     = 'trial',
  ACTIVE    = 'active',
  PAST_DUE  = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED   = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY  = 'yearly',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clinicId: string;

  @Column({ default: 'free' })
  plan: string;

  @Column({ type: 'varchar', default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  /** monthly | yearly */
  @Column({ nullable: true })
  billingCycle: string;

  @Column({ nullable: true })
  currentPeriodStart: Date;

  @Column({ nullable: true })
  currentPeriodEnd: Date;

  @Column({ nullable: true })
  cancelAt: Date;

  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', nullable: true })
  features: string[];

  @Column({ nullable: true })
  externalSubscriptionId: string;

  /** Tracks when the 2-day expiry warning email/notification was last sent (prevents duplicates) */
  @Column({ nullable: true })
  expiryWarningSentAt: Date;

  /** Tracks when the expiry-day email/notification was last sent (prevents duplicates) */
  @Column({ nullable: true })
  expiredNotifSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}