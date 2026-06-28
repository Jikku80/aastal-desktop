import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { addHours, addDays, startOfDay, endOfDay, format } from 'date-fns';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { NotificationsService }  from '../notifications/notifications.service';
import { NotificationsGateway }  from '../notifications/notifications.gateway';
import { NotificationType }      from '../notifications/entities/notification.entity';
import { Clinic }                from '../clinics/entities/clinic.entity';
import { Branch }                from '../branch/entities/branch.entity';
import { User, UserRole }        from '../users/entities/user.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    @InjectRepository(Appointment)   private aptRepo:    Repository<Appointment>,
    @InjectRepository(Clinic)        private clinicRepo: Repository<Clinic>,
    @InjectRepository(Branch)        private branchRepo: Repository<Branch>,
    @InjectRepository(Subscription)  private subRepo:    Repository<Subscription>,
    @InjectRepository(User)          private ownerRepo:  Repository<User>,
    private notifications: NotificationsService,
    private gateway:       NotificationsGateway,
  ) {}

  // ── Patient 24h reminder ────────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async send24hPatientReminders() {
    const windowStart = addHours(new Date(), 23);
    const windowEnd   = addHours(new Date(), 25);

    const appointments = await this.aptRepo.find({
      where: { scheduledAt: Between(windowStart, windowEnd), status: AppointmentStatus.SCHEDULED, reminderSentAt: IsNull() },
      relations: ['patient', 'dentist', 'branch'],
    });

    this.logger.log(`[PatientReminder] ${appointments.length} in 24h window`);

    for (const apt of appointments) {
      try {
        const clinic = await this.clinicRepo.findOne({ where: { id: apt.clinicId } });
        const branch = apt.branch;

        // Prefer branch-level contact details; fall back to clinic-level
        const displayName = branch?.name || clinic?.name || 'Your Clinic';
        const contactPhone   = branch?.phone   || clinic?.phone   || undefined;
        const contactEmail   = branch?.email   || clinic?.email   || undefined;
        const contactAddress = branch?.address || clinic?.address || undefined;

        if (apt.patient?.email || apt.patient?.phone) {
          await this.notifications.sendAppointmentReminder({
            patientName:    `${apt.patient.firstName} ${apt.patient.lastName}`,
            patientEmail:   apt.patient.email || '',
            patientPhone:   apt.patient.phone || '',
            doctorName:     apt.dentist ? `${apt.dentist.firstName} ${apt.dentist.lastName}` : 'Your Doctor',
            clinicName:     displayName,
            clinicPhone:    contactPhone,
            clinicEmail:    contactEmail,
            clinicAddress:  contactAddress,
            scheduledAt:    apt.scheduledAt,
            type:           apt.type,
          });
        }
        await this.aptRepo.update(apt.id, { reminderSentAt: new Date() });
      } catch (e) {
        this.logger.error(`[PatientReminder] apt ${apt.id}`);
      }
    }
  }

  // ── Doctor in-app + email 2h reminder (ALL doctors, not just multi-branch) ──
  @Cron(CronExpression.EVERY_30_MINUTES)
  async send2hDoctorReminders() {
    const windowStart = addHours(new Date(), 1.75);
    const windowEnd   = addHours(new Date(), 2.25);

    const appointments = await this.aptRepo.find({
      where: { scheduledAt: Between(windowStart, windowEnd), status: AppointmentStatus.SCHEDULED, doctorReminderSentAt: IsNull() },
      relations: ['dentist', 'patient', 'branch'],
    });

    this.logger.log(`[DoctorReminder] ${appointments.length} in 2h window`);

    for (const apt of appointments) {
      try {
        const patientName = apt.patient
          ? `${apt.patient.firstName} ${apt.patient.lastName}`
          : 'a patient';
        const timeStr  = format(new Date(apt.scheduledAt), 'h:mm a');
        const aptType  = (apt.type || '').replace('_', ' ');
        const branchInfo = apt.branch ? ` at ${apt.branch.name}` : '';

        // ── In-app notification (always sent) ──
        const n = await this.notifications.create({
          clinicId: apt.clinicId,
          userId:   apt.dentistId,
          type:     NotificationType.APPOINTMENT_REMINDER,
          title:    `Upcoming appointment in ~2 hours`,
          body:     `${aptType} with ${patientName}${branchInfo} at ${timeStr}.`,
          link:     `/dashboard/appointments`,
          entityId: apt.id,
        });
        this.gateway.emitToUser(apt.dentistId, 'notification', n);

        // ── Email/SMS (only if multi-branch doctor) ──
        const isMultiBranch = await this.isDoctorMultiBranch(apt.dentistId);
        if (isMultiBranch && (apt.dentist?.phone || apt.dentist?.email)) {
          const clinic = await this.clinicRepo.findOne({ where: { id: apt.clinicId } });
          const displayName = apt.branch?.name || clinic?.name || 'Your Clinic';
          await this.notifications.sendDoctorAppointmentReminder({
            doctorName:  `${apt.dentist.firstName} ${apt.dentist.lastName}`,
            doctorPhone: apt.dentist.phone || '',
            doctorEmail: apt.dentist.email || '',
            patientName,
            clinicName:  displayName,
            scheduledAt: apt.scheduledAt,
            type:        apt.type,
          });
        }

        await this.aptRepo.update(apt.id, { doctorReminderSentAt: new Date() });
        this.logger.log(`[DoctorReminder] Sent in-app for apt ${apt.id}`);
      } catch (e) {
        this.logger.error(`[DoctorReminder] apt ${apt.id}`);
      }
    }
  }

  // ── Subscription expiry warning — runs daily at 8 AM ───────────────────────
  @Cron('0 8 * * *')
  async sendSubscriptionExpiryWarnings() {
    const now        = new Date();
    const twoDaysOut = addDays(now, 2);

    const subs = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status IN (:...statuses)', { statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] })
      .andWhere('s.currentPeriodEnd BETWEEN :start AND :end', {
        start: startOfDay(twoDaysOut),
        end:   endOfDay(twoDaysOut),
      })
      .andWhere('(s.expiryWarningSentAt IS NULL OR s.expiryWarningSentAt < :cutoff)', {
        cutoff: startOfDay(now),
      })
      .getMany();

    this.logger.log(`[SubExpiryWarning] ${subs.length} subscriptions expiring in ~2 days`);

    for (const sub of subs) {
      try {
        const clinic = await this.clinicRepo.findOne({ where: { id: sub.clinicId } });
        if (!clinic?.email) {
          this.logger.warn(`[SubExpiryWarning] Clinic ${sub.clinicId} has no email — skipping`);
          continue;
        }

        const owner = await this.ownerRepo.findOne({
          where: { clinicId: clinic.id, role: UserRole.OWNER },
        });

        const renewalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?tab=Subscription`;
        const expiresAt   = new Date(sub.currentPeriodEnd);

        await this.notifications.sendSubscriptionExpiryWarning({
          clinicEmail: clinic.email,
          clinicPhone: clinic.phone || undefined,
          clinicName:  clinic.name,
          plan:        sub.plan,
          expiresAt,
          renewalLink,
        });

        const notif = await this.notifications.create({
          clinicId: clinic.id,
          userId:   owner?.id || undefined,
          type:     NotificationType.SYSTEM,
          title:    'Subscription expiring in 2 days',
          body:     `Your ${sub.plan} plan expires on ${expiresAt.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}. Renew now to avoid service interruption.`,
          link:     '/dashboard/settings?tab=Subscription',
        });
        if (owner) this.gateway.emitToUser(owner.id, 'notification', notif);

        await this.subRepo.update(sub.id, { expiryWarningSentAt: now });
        this.logger.log(`[SubExpiryWarning] Sent to clinic ${clinic.id} (${clinic.name})`);
      } catch (e: any) {
        this.logger.error(`[SubExpiryWarning] clinic ${sub.clinicId}: ${e.message}`);
      }
    }
  }

  // ── Subscription expired notification — runs daily at 8 AM ─────────────────
  @Cron('0 8 * * *')
  async sendSubscriptionExpiredNotifications() {
    const now = new Date();

    const subs = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status IN (:...statuses)', {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE, SubscriptionStatus.EXPIRED],
      })
      .andWhere('s.currentPeriodEnd BETWEEN :start AND :end', {
        start: startOfDay(now),
        end:   endOfDay(now),
      })
      .andWhere('(s.expiredNotifSentAt IS NULL OR s.expiredNotifSentAt < :cutoff)', {
        cutoff: startOfDay(now),
      })
      .getMany();

    this.logger.log(`[SubExpired] ${subs.length} subscriptions expired today`);

    for (const sub of subs) {
      try {
        const clinic = await this.clinicRepo.findOne({ where: { id: sub.clinicId } });
        if (!clinic?.email) {
          this.logger.warn(`[SubExpired] Clinic ${sub.clinicId} has no email — skipping`);
          continue;
        }

        const owner = await this.ownerRepo.findOne({
          where: { clinicId: clinic.id, role: UserRole.OWNER },
        });

        const renewalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?tab=Subscription`;
        const expiredAt   = new Date(sub.currentPeriodEnd);

        await this.notifications.sendSubscriptionExpiredNotification({
          clinicEmail: clinic.email,
          clinicPhone: clinic.phone || undefined,
          clinicName:  clinic.name,
          plan:        sub.plan,
          expiredAt,
          renewalLink,
        });

        const notif = await this.notifications.create({
          clinicId: clinic.id,
          userId:   owner?.id || undefined,
          type:     NotificationType.SYSTEM,
          title:    'Subscription expired',
          body:     `Your ${sub.plan} plan expired today. Renew now to restore full access for your team.`,
          link:     '/dashboard/settings?tab=Subscription',
        });
        if (owner) this.gateway.emitToUser(owner.id, 'notification', notif);

        await this.subRepo.update(sub.id, { expiredNotifSentAt: now });
        this.logger.log(`[SubExpired] Sent to clinic ${clinic.id} (${clinic.name})`);
      } catch (e: any) {
        this.logger.error(`[SubExpired] clinic ${sub.clinicId}: ${e.message}`);
      }
    }
  }

  // ── Auto no-show every 30 min ───────────────────────────────────────────────
  @Cron('*/30 * * * *')
  async markNoShows() {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await this.aptRepo
      .createQueryBuilder()
      .update(Appointment)
      .set({ status: AppointmentStatus.NO_SHOW })
      .where('status = :s AND endsAt < :t', { s: AppointmentStatus.SCHEDULED, t: thirtyMinsAgo })
      .execute();
    if (result.affected) this.logger.log(`[NoShow] Marked ${result.affected}`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async isDoctorMultiBranch(dentistId: string): Promise<boolean> {
    const result = await this.aptRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.branchId)', 'cnt')
      .where('a.dentistId = :dentistId', { dentistId })
      .andWhere('a.branchId IS NOT NULL')
      .andWhere("a.scheduledAt >= NOW() - INTERVAL '90 days'")
      .getRawOne();
    return Number(result?.cnt ?? 0) > 1;
  }
}