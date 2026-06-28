import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecallsService } from './recalls.service';
import { Recall } from './entities/recall.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';

@Injectable()
export class RecallsScheduler {
  private readonly logger = new Logger(RecallsScheduler.name);

  constructor(
    private recallsService: RecallsService,
    @InjectRepository(Recall)  private recallRepo:  Repository<Recall>,
    @InjectRepository(Clinic)  private clinicRepo:  Repository<Clinic>,
    @InjectRepository(Branch)  private branchRepo:  Repository<Branch>,
  ) {}

  /** Runs every day at 9:00 AM — sends reminders for recalls due in next 3 days */
  @Cron('0 9 * * *')
  async sendRecallReminders() {
    this.logger.log('[RecallScheduler] Running daily recall reminder job');

    // Gather the distinct clinics that have pending recalls so we can pass
    // their contact details into the patient-facing messages.
    const clinics = await this.clinicRepo.find();

    for (const clinic of clinics) {
      // Resolve contact details: clinic-level only (recalls are not branch-specific).
      // If your recalls are scoped to a branch in future, resolve the branch here instead.
      const contactInfo = {
        clinicName: clinic.name,
        address:    clinic.address  || undefined,
        phone:      clinic.phone    || undefined,
        email:      clinic.email    || undefined,
      };

      await this.recallsService.sendUpcomingReminders(contactInfo);
    }
  }
}