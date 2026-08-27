import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from '../clinics/entities/clinic.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';

/**
 * Phase 9 §7 — nightly reconciliation check. An unbalanced journal entry
 * should be structurally impossible (JournalService.post() rejects
 * mismatched debit/credit totals before it ever reaches the database), but
 * this runs on the same existing scheduler infrastructure used for
 * low-stock/expiry/payroll checks as a guard against anything that slipped
 * in some other way (a hand-run SQL fix, a future bug, a bad migration).
 */
@Injectable()
export class FinanceScheduler {
  private readonly logger = new Logger(FinanceScheduler.name);

  constructor(
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectRepository(JournalEntry) private entryRepo: Repository<JournalEntry>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  @Cron('0 3 * * *')
  async reconcileJournal() {
    this.logger.log('Running nightly journal-entry balance reconciliation…');
    const clinics = await this.clinicRepo.find();

    for (const clinic of clinics) {
      try {
        const entries = await this.entryRepo.find({ where: { clinicId: clinic.id } });
        const unbalanced = entries.filter((e) => {
          const debit  = (e.lines || []).reduce((s, l) => s + Number(l.debit), 0);
          const credit = (e.lines || []).reduce((s, l) => s + Number(l.credit), 0);
          return Math.round(debit * 100) !== Math.round(credit * 100);
        });
        if (unbalanced.length > 0) {
          this.logger.error(`Clinic ${clinic.id}: found ${unbalanced.length} unbalanced journal entr(ies) — IDs: ${unbalanced.map(e => e.id).join(', ')}`);
          this.notificationsGateway.server?.to(clinic.id).emit('finance:unbalanced-entries', {
            clinicId: clinic.id,
            count: unbalanced.length,
            entryIds: unbalanced.map(e => e.id),
            message: `${unbalanced.length} unbalanced journal entr(ies) detected — this should never happen and needs investigation.`,
          });
        }
      } catch (err) {
        this.logger.error(`Failed to reconcile journal for clinic ${clinic.id}:`, err as any);
      }
    }
  }
}