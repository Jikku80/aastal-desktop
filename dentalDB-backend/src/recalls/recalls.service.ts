import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, MoreThan, IsNull, Not } from 'typeorm';
import { addDays, addWeeks, startOfDay, endOfDay, addMonths } from 'date-fns';
import { parseAsNepalTime, nepalStartOfTodayUTC, nepalWallClockToUTC } from '../common/utils/timezone.util';
import { Recall, RecallStatus, RecallType } from './entities/recall.entity';
import { CreateRecallDto, UpdateRecallDto, BulkCreateRecallDto, RecallDueUnit } from './dto/recall.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';

@Injectable()
export class RecallsService {
  private readonly logger = new Logger(RecallsService.name);

  constructor(
    @InjectRepository(Recall) private recallRepo: Repository<Recall>,
    @InjectRepository(Appointment) private aptRepo: Repository<Appointment>,
    private notifications: NotificationsService,
    private gateway: NotificationsGateway,
  ) {}

  async create(clinicId: string, userId: string, dto: CreateRecallDto): Promise<{ recall: Recall; appointment: Appointment | null }> {
    const recall = this.recallRepo.create({
      clinicId,
      createdByUserId: userId,
      patientId: dto.patientId,
      dueDate:   new Date(dto.dueDate),
      reason:    dto.reason,
      recallType: dto.recallType ?? RecallType.CHECKUP,
      notes:     dto.notes,
      status:    RecallStatus.PENDING,
    });
    let savedRecall = await this.recallRepo.save(recall) as unknown as Recall;

    // Auto-book the follow-up appointment right away so the user doesn't
    // have to come back to the Recalls page and book it manually later.
    // Skippable via `createAppointment: false`; failures never block the
    // recall itself from being saved — we just log and leave it PENDING.
    let appointment: Appointment | null = null;
    if (dto.createAppointment !== false) {
      if (!dto.dentistId) {
        // Appointment.dentistId is a required column — without it the insert
        // below will fail. Warn explicitly rather than letting the caller
        // only see a generic DB error in the logs.
        this.logger.warn(`[RecallService] No dentistId supplied for recall ${savedRecall.id} — auto-booking will fail and the recall will stay PENDING.`);
      }
      try {
        appointment = await this.autoBookAppointment(clinicId, savedRecall, dto.dueDate, {
          dentistId: dto.dentistId,
          branchId: dto.branchId,
          durationMinutes: dto.durationMinutes,
        });
        savedRecall = { ...savedRecall, status: RecallStatus.BOOKED, appointmentId: appointment.id };
      } catch (e: any) {
        this.logger.error(`[RecallService] Auto-booking appointment failed for recall ${savedRecall.id}: ${e?.message}`);
      }
    }

    return { recall: savedRecall, appointment };
  }

  async bulkCreate(clinicId: string, userId: string, dto: BulkCreateRecallDto): Promise<{ recall: Recall; appointment: Appointment | null }> {
    const unit = dto.unit ?? RecallDueUnit.MONTHS;
    const dueDay =
      unit === RecallDueUnit.DAYS  ? addDays(new Date(), dto.amount) :
      unit === RecallDueUnit.WEEKS ? addWeeks(new Date(), dto.amount) :
      addMonths(new Date(), dto.amount);

    // Combine the computed due day with the requested Nepal-local
    // time-of-day so the auto-booked follow-up appointment lands at a
    // sensible clinic hour instead of "right now".
    const [hh, mm] = (dto.dueTime || '10:00').split(':').map(Number);
    const dueDateTime = nepalWallClockToUTC(
      dueDay.getFullYear(), dueDay.getMonth() + 1, dueDay.getDate(), hh || 10, mm || 0,
    );

    return this.create(clinicId, userId, {
      patientId:  dto.patientId,
      dueDate:    dueDateTime.toISOString(),
      reason:     dto.reason,
      recallType: dto.recallType,
      notes:      dto.notes,
      dentistId:  dto.dentistId,
      branchId:   dto.branchId,
      durationMinutes: dto.durationMinutes,
      createAppointment: dto.createAppointment,
    } as CreateRecallDto);
  }

  /** Shared appointment-creation logic used by both auto-booking on recall
   *  creation (create/bulkCreate) and the manual "Book Appointment" action
   *  on the Recalls page (createAppointmentForRecall below). */
  private async autoBookAppointment(
    clinicId: string,
    recall: Recall,
    dueDateRaw: string,
    opts: { dentistId?: string; branchId?: string; durationMinutes?: number },
  ): Promise<Appointment> {
    const scheduledAt = parseAsNepalTime(dueDateRaw);
    const durationMinutes = opts.durationMinutes || 30;
    const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

    const apt = this.aptRepo.create({
      clinicId,
      branchId:        opts.branchId,
      patientId:       recall.patientId,
      dentistId:       opts.dentistId,
      scheduledAt,
      endsAt,
      status:          AppointmentStatus.SCHEDULED,
      type:            recall.recallType,
      notes:           recall.reason || 'Recall follow-up',
      durationMinutes,
    } as unknown as Appointment);

    const savedApt = await this.aptRepo.save(apt) as unknown as Appointment;

    await this.recallRepo.update(recall.id, {
      status: RecallStatus.BOOKED,
      appointmentId: savedApt.id,
    });

    return savedApt;
  }

  async findAll(clinicId: string) {
    const today = nepalStartOfTodayUTC();
    const weekEnd = endOfDay(addDays(new Date(), 7));

    // Show every active recall (pending, contacted, or already booked) in its
    // due-date bucket — only cancelled recalls drop off the board. Recalls
    // used to be filtered to status=PENDING only, which meant a recall
    // vanished from every column the moment it got auto-booked with an
    // appointment, making the page look empty. The UI already knows how to
    // render booked recalls (see the "Appointment Linked" card + status
    // badge in RecallCard), so we just need to keep sending them.
    const activeStatuses = Not(RecallStatus.CANCELLED);

    const [overdue, thisWeek, upcoming] = await Promise.all([
      this.recallRepo.find({
        where: { clinicId, status: activeStatuses, dueDate: LessThan(today) },
        order: { dueDate: 'ASC' },
        relations: ['appointment'],
      }),
      this.recallRepo.find({
        where: { clinicId, status: activeStatuses, dueDate: Between(today, weekEnd) },
        order: { dueDate: 'ASC' },
        relations: ['appointment'],
      }),
      this.recallRepo.find({
        where: { clinicId, status: activeStatuses, dueDate: MoreThan(weekEnd) },
        order: { dueDate: 'ASC' },
        relations: ['appointment'],
      }),
    ]);

    return { overdue, thisWeek, upcoming };
  }

  async getStats(clinicId: string) {
    const now = new Date();
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const [totalPending, overdueCount, bookedThisMonth] = await Promise.all([
      this.recallRepo.count({ where: { clinicId, status: RecallStatus.PENDING } }),
      this.recallRepo.count({
        where: { clinicId, status: RecallStatus.PENDING, dueDate: LessThan(startOfDay(now)) },
      }),
      this.recallRepo.count({
        where: { clinicId, status: RecallStatus.BOOKED, updatedAt: Between(monthStart, monthEnd) },
      }),
    ]);

    return { totalPending, overdueCount, bookedThisMonth };
  }

  async findByPatient(clinicId: string, patientId: string): Promise<Recall[]> {
    return this.recallRepo.find({
      where: { clinicId, patientId },
      order: { dueDate: 'DESC' },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateRecallDto): Promise<Recall> {
    const recall = await this.recallRepo.findOne({ where: { id, clinicId } });
    if (!recall) throw new NotFoundException('Recall not found');
    Object.assign(recall, dto);
    if (dto.dueDate) recall.dueDate = new Date(dto.dueDate);
    return this.recallRepo.save(recall) as unknown as Recall;
  }

  /** Create an appointment from a recall and mark recall as booked (idempotent) */
  async createAppointmentForRecall(
    clinicId: string,
    id: string,
    dto: {
      scheduledAt: string;
      dentistId?: string;
      branchId?: string;
      notes?: string;
      durationMinutes?: number;
    },
  ): Promise<{ recall: Recall; appointment: Appointment }> {
    const recall = await this.recallRepo.findOne({ where: { id, clinicId }, relations: ['patient'] });
    if (!recall) throw new NotFoundException('Recall not found');

    // Idempotency guard: if already linked to an appointment, return existing instead of duplicating
    if (recall.appointmentId) {
      const existing = await this.aptRepo.findOne({ where: { id: recall.appointmentId, clinicId } });
      if (existing) {
        this.logger.warn(`[RecallService] createAppointmentForRecall called on recall ${id} that already has appointmentId=${recall.appointmentId}. Returning existing.`);
        return { recall: recall as unknown as Recall, appointment: existing as unknown as Appointment };
      }
    }

    // Status guard: if already BOOKED/CANCELLED don't create another
    if (recall.status === RecallStatus.BOOKED) {
      this.logger.warn(`[RecallService] Recall ${id} already has status=BOOKED. Refusing duplicate appointment.`);
      throw new Error('This recall is already marked as booked. Reopen it before creating a new appointment.');
    }

    if (dto.notes) recall.reason = recall.reason || dto.notes;
    const savedApt = await this.autoBookAppointment(clinicId, recall, dto.scheduledAt, {
      dentistId: dto.dentistId,
      branchId: dto.branchId,
      durationMinutes: dto.durationMinutes,
    });

    const savedRecall = { ...recall, status: RecallStatus.BOOKED, appointmentId: savedApt.id } as Recall;
    return { recall: savedRecall, appointment: savedApt };
  }

  /** Update appointment outcome linked to a recall (complete, no-show, cancel) */
  async updateAppointmentOutcome(
    clinicId: string,
    recallId: string,
    outcome: 'completed' | 'no_show' | 'cancelled',
  ): Promise<{ recall: Recall; appointment: Appointment }> {
    const recall = await this.recallRepo.findOne({ where: { id: recallId, clinicId } });
    if (!recall) throw new NotFoundException('Recall not found');
    if (!recall.appointmentId) throw new NotFoundException('No appointment linked to this recall');

    const apt = await this.aptRepo.findOne({ where: { id: recall.appointmentId, clinicId } });
    if (!apt) throw new NotFoundException('Linked appointment not found');

    const statusMap: Record<string, AppointmentStatus> = {
      completed: AppointmentStatus.COMPLETED,
      no_show:   AppointmentStatus.NO_SHOW,
      cancelled: AppointmentStatus.CANCELLED,
    };
    apt.status = statusMap[outcome];
    const savedApt = await this.aptRepo.save(apt) as unknown as Appointment;

    if (outcome === 'completed') recall.status = RecallStatus.BOOKED;
    if (outcome === 'cancelled') recall.status = RecallStatus.CANCELLED;
    const savedRecall = await this.recallRepo.save(recall) as unknown as Recall;

    return { recall: savedRecall, appointment: savedApt };
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const recall = await this.recallRepo.findOne({ where: { id, clinicId } });
    if (!recall) throw new NotFoundException('Recall not found');
    await this.recallRepo.remove(recall);
  }

  /**
   * Called by cron — find recalls due in next 3 days, send SMS (priority) or email (fallback) + in-app.
   *
   * @param clinicContact  Optional clinic/branch contact details injected by the scheduler
   *                       so patient-facing messages include a way to get in touch.
   */

  async sendNow(clinicId: string, id: string): Promise<{ sent: boolean }> {
    const recall = await this.recallRepo.findOne({
      where: { id, clinicId },
      relations: ['patient'],
    });
    if (!recall) throw new Error('Recall not found');

    const patient = (recall as any).patient;
    if (patient?.phone) {
      try {
        await this.notifications.sendSms(
          patient.phone,
          `Reminder: ${(recall as any).recallType || 'appointment'} recall from your clinic. Please schedule soon.`,
        );
      } catch (e: any) {
        this.logger.error(`[SendNow] SMS failed for recall ${id}: ${e?.message}`);
      }
    }

    if (patient?.email) {
      try {
        await this.notifications.sendEmail({
          to: patient.email,
          subject: 'Recall Reminder from Your Clinic',
          html: `<p>This is a reminder for your scheduled recall. Please contact the clinic to book your appointment.</p>`,
        });
      } catch (e: any) {
        this.logger.error(`[SendNow] Email failed for recall ${id}: ${e?.message}`);
      }
    }

    await this.notifications.create({
      clinicId,
      type: 'appointment_reminder' as any,
      title: `Recall reminder sent: ${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
      body: `Manual recall reminder dispatched for recall ${id}`,
      link: `/dashboard/recalls`,
      entityId: id,
    });
    this.gateway.emitToClinic(clinicId, 'notification', { type: 'recall_sent', recallId: id });
    await this.recallRepo.update(id, { reminderSentAt: new Date() });
    return { sent: true };
  }

  async sendUpcomingReminders(clinicContact?: {
    clinicName?: string;
    address?: string;
    phone?: string;
    email?: string;
  }): Promise<void> {
    const today   = nepalStartOfTodayUTC();
    const in3days = endOfDay(addDays(new Date(), 3));

    // IsNull() is required — passing undefined does not filter in TypeORM
    const recalls = await this.recallRepo.find({
      where: {
        status:         RecallStatus.PENDING,
        dueDate:        Between(today, in3days),
        reminderSentAt: IsNull(),
      },
      relations: ['patient'],
    });

    this.logger.log(`[RecallReminder] ${recalls.length} recalls due in 3 days`);

    for (const recall of recalls) {
      const patient = recall.patient;
      const dueDateStr = new Date(recall.dueDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      });
      const recallTypeLabel = recall.recallType.replace(/_/g, ' ');

      // Contact block — fall back gracefully if not supplied
      const contactClinicName = clinicContact?.clinicName ?? 'your clinic';
      const contactPhone      = clinicContact?.phone;
      const contactEmail      = clinicContact?.email;
      const contactAddress    = clinicContact?.address;

      let channelNotified = false;

      // ── 1st priority: SMS ─────────────────────────────────────────────────
      if (patient?.phone) {
        try {
          const contactLine = contactPhone
            ? ` Call us on ${contactPhone} to book.`
            : ' Please contact us to book an appointment.';

          await this.notifications.sendSms(
            patient.phone,
            `Hi ${patient.firstName}, this is a reminder for your ${recallTypeLabel} due on ${dueDateStr}.${contactLine}${recall.reason ? ` Reason: ${recall.reason}` : ''}`.trim(),
          );
          channelNotified = true;
          this.logger.log(`[RecallReminder] SMS sent for recall ${recall.id} → ${patient.phone}`);
        } catch (e: any) {
          this.logger.warn(`[RecallReminder] SMS failed for recall ${recall.id} (${patient.phone}): ${e?.message} — falling back to email`);
        }
      }

      // ── 2nd priority: Email (if no phone, or SMS failed) ──────────────────
      if (!channelNotified) {
        if (patient?.email) {
          try {
            // Build contact rows for the detail card
            const contactRows = [
              contactAddress ? `
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;">📍 Address</td>
                  <td style="padding:6px 0;color:#374151;">${contactAddress}</td>
                </tr>` : '',
              contactPhone ? `
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">📞 Phone</td>
                  <td style="padding:6px 0;font-weight:600;color:#1f2937;">${contactPhone}</td>
                </tr>` : '',
              contactEmail ? `
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">✉️ Email</td>
                  <td style="padding:6px 0;"><a href="mailto:${contactEmail}" style="color:#027cc6;">${contactEmail}</a></td>
                </tr>` : '',
            ].filter(Boolean).join('');

            const contactSection = contactRows ? `
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-top:20px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.04em;">Contact Us</p>
                <table style="width:100%;border-collapse:collapse;">
                  ${contactRows}
                </table>
              </div>` : '';

            await this.notifications.sendEmail({
              to: patient.email,
              subject: `Recall Reminder: Your ${recallTypeLabel} is due on ${dueDateStr}`,
              html: `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:540px;margin:0 auto;color:#1f2937;">
                  <div style="background:#027cc6;padding:24px 32px;border-radius:12px 12px 0 0;">
                    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;">${contactClinicName}</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Recall Reminder</p>
                  </div>
                  <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
                    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">
                      Dear <strong>${patient.firstName}</strong>,
                    </p>
                    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px;">
                      This is a friendly reminder that your <strong style="text-transform:capitalize;">${recallTypeLabel}</strong> is due on <strong>${dueDateStr}</strong>.
                      ${recall.reason ? `<br>Reason: ${recall.reason}` : ''}
                    </p>
                    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                      <table style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;">📅 Due Date</td>
                          <td style="padding:6px 0;font-weight:600;color:#1f2937;">${dueDateStr}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#6b7280;font-size:13px;">Type</td>
                          <td style="padding:6px 0;font-weight:600;color:#1f2937;text-transform:capitalize;">${recallTypeLabel}</td>
                        </tr>
                        ${recall.notes ? `<tr>
                          <td style="padding:6px 0;color:#6b7280;font-size:13px;">📝 Notes</td>
                          <td style="padding:6px 0;color:#374151;">${recall.notes}</td>
                        </tr>` : ''}
                      </table>
                    </div>
                    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">
                      Please contact us to book your appointment at your earliest convenience.
                    </p>
                    <p style="color:#9ca3af;font-size:12px;margin:0;">
                      If you have already scheduled an appointment, please disregard this message.
                    </p>
                    ${contactSection}
                  </div>
                  <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">
                    Powered by ClinicKarobar &bull; ${new Date().getFullYear()}
                  </p>
                </div>
              `,
            });
            channelNotified = true;
            this.logger.log(`[RecallReminder] Email sent for recall ${recall.id} → ${patient.email}`);
          } catch (e: any) {
            this.logger.error(`[RecallReminder] Email also failed for recall ${recall.id} (${patient.email}): ${e?.message}`);
          }
        } else {
          this.logger.warn(`[RecallReminder] No phone or email for patient on recall ${recall.id} — skipping external notification`);
        }
      }

      // ── In-app notification (always — independent of SMS/email) ─────────────
      try {
        const n = await this.notifications.create({
          clinicId: recall.clinicId,
          type:     NotificationType.APPOINTMENT_REMINDER,
          title:    `Recall due soon: ${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
          body:     `${recallTypeLabel} due ${dueDateStr}${recall.reason ? ` — ${recall.reason}` : ''}`,
          link:     `/dashboard/recalls`,
          entityId: recall.id,
        });
        this.gateway.emitToClinic(recall.clinicId, 'notification', n);
      } catch (e: any) {
        this.logger.error(`[RecallReminder] In-app notification failed for recall ${recall.id}: ${e?.message}`);
      }

      // Stamp reminderSentAt regardless of channel outcome so we don't retry endlessly
      await this.recallRepo.update(recall.id, { reminderSentAt: new Date() });
      this.logger.log(`[RecallReminder] Processed recall ${recall.id} (notified=${channelNotified})`);
    }
  }
}