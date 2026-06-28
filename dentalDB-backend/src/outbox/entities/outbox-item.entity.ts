import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * QUEUE-WHEN-OFFLINE actions: notifications, recalls, reviews, payments.
 * These can be created/edited locally with no network, but the actual
 * dispatch (SMS/email send, payment gateway call) only happens once
 * connectivity returns. This table is the durable queue for that dispatch —
 * separate from `syncStatus` on business entities, which is about syncing
 * *data* between local/remote DBs, not about *dispatching side effects*.
 *
 * NOTE: this entity is local-only by design — it is NOT pushed to the
 * remote DB by the sync engine (see sync.service.ts SYNC_REGISTRY, which
 * deliberately excludes it). Only its *effects* (the SMS sent, the payment
 * captured) need to exist remotely, achieved by calling the same service
 * methods the online instance would have called directly.
 */
export enum OutboxActionType {
  NOTIFICATION_EMAIL = 'notification.email',
  NOTIFICATION_SMS = 'notification.sms',
  RECALL_SEND = 'recall.send',
  REVIEW_REQUEST = 'review.request',
  PAYMENT_VERIFY_ESEWA = 'payment.verify_esewa',
  PAYMENT_VERIFY_KHALTI = 'payment.verify_khalti',
  PAYMENT_CAPTURE_PAYPAL = 'payment.capture_paypal',
}

export enum OutboxStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('outbox')
@Index(['status'])
export class OutboxItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  actionType: OutboxActionType;

  /** Arbitrary JSON payload — shape depends on actionType, validated at dispatch time. */
  @Column({ type: 'simple-json' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: OutboxStatus.PENDING })
  status: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'varchar', nullable: true })
  clinicId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
