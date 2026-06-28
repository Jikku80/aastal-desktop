import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

export enum NotificationType {
  // Appointments
  APPOINTMENT_CREATED   = 'appointment_created',
  APPOINTMENT_UPDATED   = 'appointment_updated',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_REMINDER  = 'appointment_reminder',
  // Billing
  INVOICE_CREATED       = 'invoice_created',
  INVOICE_PAID          = 'invoice_paid',
  // Patients
  PATIENT_ADDED         = 'patient_added',
  // Cross-clinic / referrals
  HISTORY_ACCESS_REQUESTED = 'history_access_requested',
  REFERRAL_RECEIVED        = 'referral_received',
  REFILL_REQUESTED         = 'refill_requested',
  REFILL_APPROVED          = 'refill_approved',
  // Leave
  LEAVE_REQUESTED       = 'leave_requested',
  LEAVE_APPROVED        = 'leave_approved',
  LEAVE_REJECTED        = 'leave_rejected',
  // Shifts / Schedule
  SCHEDULE_UPDATED      = 'schedule_updated',
  SHIFT_ASSIGNED        = 'shift_assigned',
  // Holidays & Notices
  HOLIDAY_CREATED       = 'holiday_created',
  NOTICE_POSTED         = 'notice_posted',
  NOTICE_UPDATED        = 'notice_updated',
  // System
  SYSTEM                = 'system',
}

@Entity('notifications')
@Index(['clinicId', 'userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** null = broadcast to whole clinic */
  @Column({ nullable: true })
  userId: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ nullable: true })
  body: string;

  @Column({ nullable: true })
  link: string;

  @Column({ nullable: true })
  entityId: string;

  /** null = all branches; set = only users in this branch see it */
  @Column({ nullable: true })
  branchId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
