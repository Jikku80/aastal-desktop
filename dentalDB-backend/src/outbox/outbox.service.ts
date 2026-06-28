import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxItem, OutboxActionType, OutboxStatus } from './entities/outbox-item.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RecallsService } from '../recalls/recalls.service';
import { PaymentsService } from '../payments/payments.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxItem) private readonly repo: Repository<OutboxItem>,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly recalls?: RecallsService,
    @Optional() private readonly payments?: PaymentsService,
  ) {}

  /** Called by controllers/services instead of dispatching directly when offline-safe queuing is wanted. */
  async enqueue(actionType: OutboxActionType, payload: Record<string, any>, clinicId?: string): Promise<OutboxItem> {
    const item = this.repo.create({ actionType, payload, clinicId: clinicId ?? null });
    return this.repo.save(item);
  }

  async listPending(): Promise<OutboxItem[]> {
    return this.repo.find({ where: { status: OutboxStatus.PENDING }, order: { createdAt: 'ASC' } });
  }

  /**
   * NOTE: does 2 count queries per actionType (14 total) rather than one
   * GROUP BY — simpler and portable across the postgres/sqlite split, and
   * outbox table sizes are small (per-clinic queues, not global), so this
   * is fine at this scale. Revisit with a single grouped query if outbox
   * volume ever grows large enough for this to show up in profiling.
   */
  async countByStatus() {
    const [pending, sent, failed] = await Promise.all([
      this.repo.count({ where: { status: OutboxStatus.PENDING } }),
      this.repo.count({ where: { status: OutboxStatus.SENT } }),
      this.repo.count({ where: { status: OutboxStatus.FAILED } }),
    ]);

    const byActionType: Record<string, { pending: number; failed: number }> = {};
    for (const actionType of Object.values(OutboxActionType)) {
      const [p, f] = await Promise.all([
        this.repo.count({ where: { status: OutboxStatus.PENDING, actionType } }),
        this.repo.count({ where: { status: OutboxStatus.FAILED, actionType } }),
      ]);
      if (p || f) byActionType[actionType] = { pending: p, failed: f };
    }

    return { pending, sent, failed, byActionType };
  }

  /**
   * Drain the queue — call this when connectivity returns (sync.service.ts
   * wires this to the same online/offline transition that triggers a sync
   * push/pull). Each item is dispatched via the *same* service method an
   * online instance would have called directly; on success it's marked
   * 'sent', on failure it's retried up to MAX_ATTEMPTS then marked 'failed'
   * (visible to staff in the UI per Phase 5 — not silently dropped).
   */
  async drain(): Promise<{ sent: number; failed: number; remaining: number }> {
    const pending = await this.listPending();
    let sent = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        await this.dispatch(item);
        item.status = OutboxStatus.SENT;
        item.lastError = null;
        await this.repo.save(item);
        sent++;
      } catch (err: any) {
        item.attempts += 1;
        item.lastError = err?.message ?? String(err);
        if (item.attempts >= MAX_ATTEMPTS) {
          item.status = OutboxStatus.FAILED;
          failed++;
        }
        await this.repo.save(item);
        this.logger.warn(`Outbox dispatch failed (attempt ${item.attempts}/${MAX_ATTEMPTS}) for ${item.actionType}: ${item.lastError}`);
      }
    }

    const remaining = await this.repo.count({ where: { status: OutboxStatus.PENDING } });
    return { sent, failed, remaining };
  }

  private async dispatch(item: OutboxItem): Promise<void> {
    switch (item.actionType) {
      case OutboxActionType.NOTIFICATION_EMAIL:
        if (!this.notifications) throw new Error('NotificationsService not available');
        return this.notifications.sendEmail(item.payload as { to: string; subject: string; html: string });

      case OutboxActionType.NOTIFICATION_SMS:
        if (!this.notifications) throw new Error('NotificationsService not available');
        return this.notifications.sendSms(item.payload.to, item.payload.body);

      case OutboxActionType.RECALL_SEND:
        if (!this.recalls) throw new Error('RecallsService not available');
        await this.recalls.sendNow(item.payload.clinicId, item.payload.recallId);
        return;

      case OutboxActionType.REVIEW_REQUEST:
        // NOTE: review *requests* go out via NotificationsService.sendReviewRequest
        // (the Review entity itself is patient-submitted content, not something
        // queued here). Confirm this mapping matches your intent — the other
        // plausible reading is "queue the review submission itself", but that's
        // a normal syncStatus-pending write, not an outbox dispatch.
        if (!this.notifications) throw new Error('NotificationsService not available');
        return this.notifications.sendReviewRequest(item.payload as any);

      case OutboxActionType.PAYMENT_VERIFY_ESEWA:
        if (!this.payments) throw new Error('PaymentsService not available');
        await this.payments.verifyEsewa(item.payload.clinicId, item.payload as any);
        return;

      case OutboxActionType.PAYMENT_VERIFY_KHALTI:
        if (!this.payments) throw new Error('PaymentsService not available');
        await this.payments.verifyKhalti(item.payload.clinicId, item.payload as any);
        return;

      case OutboxActionType.PAYMENT_CAPTURE_PAYPAL:
        if (!this.payments) throw new Error('PaymentsService not available');
        await this.payments.capturePaypalOrder(item.payload.clinicId, item.payload.orderId, item.payload.invoiceId);
        return;

      default:
        throw new Error(`Unknown outbox actionType: ${item.actionType}`);
    }
  }
}
