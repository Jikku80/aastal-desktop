import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * One row per (batch, event type, threshold) notification already sent —
 * checked by the expiry/start-date background jobs before creating a new
 * Notification, so e.g. a batch's "30-day expiry warning" only fires once
 * (section 6). Deliberately NOT reusing the Notification table itself for
 * this check: Notification rows can be deleted/marked read by users, which
 * would otherwise let a threshold re-fire.
 */
@Entity('pharmacy_batch_notification_log')
@Index(['clinicId', 'batchId', 'eventType', 'thresholdDays'], { unique: true })
export class BatchNotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  batchId: string;

  /** e.g. MEDICINE_BATCH_EXPIRING, MEDICINE_BATCH_START_DATE_REACHED — matches NotificationType. */
  @Column()
  eventType: string;

  /** Which configured threshold (180/90/60/30/14/7/1 days) this row covers. Null for one-shot events (available/start-date-reached). */
  @Column({ type: 'int', nullable: true })
  thresholdDays: number | null;

  @CreateDateColumn()
  sentAt: Date;
}
