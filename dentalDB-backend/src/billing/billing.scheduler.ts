import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from '../clinics/entities/clinic.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    private analyticsService: AnalyticsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  @Cron('0 6 * * *')
  async markOverdueInvoices() {
    this.logger.log('Running daily overdue invoice check…');
    const clinics = await this.clinicRepo.find();

    for (const clinic of clinics) {
      try {
        const count = await this.analyticsService.markOverdue(clinic.id);
        if (count > 0) {
          this.notificationsGateway.server?.to(clinic.id).emit('invoices:overdue', {
            clinicId: clinic.id, count,
            message: `${count} invoice(s) marked overdue`,
          });
          this.logger.log(`Clinic ${clinic.id}: marked ${count} invoices overdue`);
        }
      } catch (err) {
        this.logger.error(`Failed to mark overdue for clinic ${clinic.id}:`, err);
      }
    }
  }
}
