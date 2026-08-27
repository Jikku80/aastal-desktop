import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MedicineBatch, BatchStatus } from './entities/medicine-batch.entity';
import { BatchNotificationLog } from './entities/batch-notification-log.entity';
import { computeBatchStatus, toDateOnly, EXPIRY_THRESHOLDS_DAYS } from './pharmacy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';

/**
 * Section 16 background processing — extends the existing
 * @nestjs/schedule / Cron infrastructure already used by LowStockScheduler,
 * BillingScheduler, etc. Runs at 7:00 AM daily, ahead of the 9:30 AM
 * low-stock job so status changes (e.g. a batch flipping to EXPIRED) are
 * reflected in that same morning's usable-stock calculation.
 *
 * Two responsibilities, run in order:
 *   1. Recompute batch status from startDate/expiryDate/quantityAvailable
 *      (the same pure calculator create/update use) and fire one-shot
 *      lifecycle events on transition (start-date-reached, expired).
 *   2. Walk the configured expiry thresholds and fire (deduped) expiry
 *      warnings for batches that have crossed one.
 *
 * All "have we already sent this?" checks go through BatchNotificationLog
 * via an atomic INSERT — a unique-constraint failure means another run (or
 * this one, if re-triggered) already sent it, so it's silently skipped.
 * This is deliberately not reused from Notification itself, since those
 * rows can be marked read / deleted by users.
 */
@Injectable()
export class PharmacyScheduler {
  private readonly logger = new Logger(PharmacyScheduler.name);

  constructor(
    @InjectRepository(MedicineBatch) private batchRepo: Repository<MedicineBatch>,
    @InjectRepository(BatchNotificationLog) private logRepo: Repository<BatchNotificationLog>,
    private notifications: NotificationsService,
    private gateway: NotificationsGateway,
  ) {}

  @Cron('0 7 * * *')
  async runDailyBatchProcessing() {
    this.logger.log('[Pharmacy] Running daily batch status + expiry job');
    await this.recomputeStatuses();
    await this.sendExpiryThresholdWarnings();
  }

  // ── Status recompute + one-shot lifecycle events (sections 4/5/6) ───────

  private async recomputeStatuses() {
    // DEPLETED never un-deplete on its own (only a new receipt changes
    // that, handled in createBatch), so it's excluded from the daily scan.
    const batches = await this.batchRepo.find({
      where: { status: In([BatchStatus.NOT_AVAILABLE, BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON]) },
      relations: ['product'],
    });

    let changed = 0;
    for (const batch of batches) {
      const prevStatus = batch.status;
      const nextStatus = computeBatchStatus(batch);
      if (nextStatus === prevStatus) continue;

      batch.status = nextStatus;
      await this.batchRepo.save(batch);
      changed++;

      const medicineName = batch.product?.name ?? 'Medicine';

      if (prevStatus === BatchStatus.NOT_AVAILABLE && nextStatus !== BatchStatus.NOT_AVAILABLE) {
        await this.notifyOnce(
          batch, NotificationType.MEDICINE_BATCH_START_DATE_REACHED, 0,
          `${medicineName} batch ${batch.batchNumber} is now available`,
          `Start date reached — ${batch.quantityAvailable} unit(s) now eligible for dispensing.`,
        );
        await this.notifyOnce(
          batch, NotificationType.MEDICINE_BATCH_AVAILABLE, 0,
          `${medicineName} batch ${batch.batchNumber} available for dispensing`,
          `Batch ${batch.batchNumber} — ${batch.quantityAvailable} unit(s) — is now eligible for allocation.`,
        );
      }

      if (nextStatus === BatchStatus.EXPIRED) {
        await this.notifyOnce(
          batch, NotificationType.MEDICINE_BATCH_EXPIRED, 0,
          `${medicineName} batch ${batch.batchNumber} has expired`,
          `Batch ${batch.batchNumber} expired on ${batch.expiryDate} with ${batch.quantityAvailable} unit(s) remaining — excluded from usable stock and dispensing.`,
        );
      }
    }
    this.logger.log(`[Pharmacy] Status recompute: ${changed} batch(es) transitioned`);
  }

  // ── Threshold-based expiry warnings (sections 6/7) ───────────────────────

  private async sendExpiryThresholdWarnings() {
    const today = toDateOnly(new Date());
    const furthestThreshold = Math.max(...EXPIRY_THRESHOLDS_DAYS);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + furthestThreshold);

    const eligible = await this.batchRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.product', 'product')
      .where('b.status IN (:...statuses)', { statuses: [BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON] })
      .andWhere('b.expiryDate <= :cutoff', { cutoff: cutoff.toISOString().split('T')[0] })
      .getMany();

    let sent = 0;
    for (const batch of eligible) {
      const daysToExpiry = Math.ceil((toDateOnly(batch.expiryDate).getTime() - today.getTime()) / 86400000);
      if (daysToExpiry < 0) continue;

      // A batch may have crossed several thresholds since the last run
      // (e.g. the job didn't run for a few days) — notifyOnce's INSERT
      // dedup means only the ones not already logged actually create a
      // Notification, so it's safe to attempt every threshold it now
      // qualifies for.
      for (const threshold of EXPIRY_THRESHOLDS_DAYS) {
        if (daysToExpiry > threshold) continue;
        const medicineName = batch.product?.name ?? 'Medicine';
        const ok = await this.notifyOnce(
          batch, NotificationType.MEDICINE_BATCH_EXPIRING, threshold,
          `${medicineName} expiring in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`,
          `Batch ${batch.batchNumber} — ${batch.quantityAvailable} unit(s) — expires ${batch.expiryDate}.`,
        );
        if (ok) sent++;
      }
    }
    this.logger.log(`[Pharmacy] Expiry threshold warnings sent: ${sent}`);
  }

  // ── Shared dedup + notify helper ─────────────────────────────────────────

  /**
   * thresholdDays uses 0 (not null) for one-shot events. NULL is excluded
   * from uniqueness checks by both Postgres and SQLite's unique indexes,
   * which would silently defeat de-duplication for exactly the "avoid
   * duplicate notifications" requirement this table exists for.
   */
  private async notifyOnce(
    batch: MedicineBatch,
    eventType: NotificationType,
    thresholdDays: number,
    title: string,
    body: string,
  ): Promise<boolean> {
    try {
      await this.logRepo.insert({ clinicId: batch.clinicId, batchId: batch.id, eventType, thresholdDays });
    } catch {
      return false; // unique constraint hit — already sent
    }

    try {
      const notif = await this.notifications.create({
        clinicId: batch.clinicId,
        branchId: batch.branchId ?? undefined,
        type: eventType,
        title,
        body,
        link: '/dashboard/pharmacy',
        entityId: batch.id,
      });
      if (batch.branchId) this.gateway.emitToBranch(batch.branchId, 'notification', notif);
      else this.gateway.emitToClinic(batch.clinicId, 'notification', notif);
    } catch (e) {
      this.logger.error(`[Pharmacy] Failed to send notification for batch ${batch.id}: ${(e as any)?.message}`);
    }
    return true;
  }
}
