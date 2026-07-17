import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { addMinutes, format } from 'date-fns';
import { parseAsNepalTime, formatNepalTime, formatNepalDateTime, nepalTodayParts, nepalWallClockToUTC, nepalDateStringBoundsUTC } from '../common/utils/timezone.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { BillingService } from '../billing/billing.service';
import { Clinic } from '../clinics/entities/clinic.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
    @InjectRepository(Patient)     private patientRepo: Repository<Patient>,
    @InjectRepository(Clinic)      private clinicRepo: Repository<Clinic>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private billingService: BillingService,
  ) {}

  /** Send in-app notification to the assigned doctor */
  private async notifyDoctor(apt: Appointment, isUpdate = false) {
    try {
      const patientName = apt.patient
        ? `${apt.patient.firstName} ${apt.patient.lastName}`
        : 'a patient';
      const timeStr = formatNepalDateTime(apt.scheduledAt);
      const aptType = (apt.type || '').replace('_', ' ');

      const title = isUpdate
        ? `Appointment updated`
        : `New appointment booked`;
      const body = isUpdate
        ? `Your ${aptType} appointment with ${patientName} has been updated to ${timeStr}.`
        : `A ${aptType} appointment with ${patientName} is scheduled for ${timeStr}.`;

      const notif = await this.notificationsService.create({
        clinicId: apt.clinicId,
        userId:   apt.dentistId,
        type:     NotificationType.APPOINTMENT_CREATED,
        title,
        body,
        entityId: apt.id,
        link:     `/dashboard/appointments`,
      });

      // Push real-time to the specific doctor
      this.notificationsGateway.emitToUser(apt.dentistId, 'notification', notif);
    } catch (e) {
      // Non-critical — don't fail the main operation
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Conflict detection
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Core conflict check:
   *   - Same doctor + overlapping time = ALWAYS conflict (regardless of branch).
   *     A doctor cannot physically be in two places at the same time.
   *   - excludeId: skip this appointment (used during rescheduling).
   */
  private async findConflict(
    dentistId: string,
    scheduledAt: Date,
    endsAt: Date,
    excludeId?: string,
  ): Promise<Appointment | null> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.dentistId = :dentistId', { dentistId })
      .andWhere('a.status NOT IN (:...cancelled)', {
        cancelled: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      })
      // Overlap: new starts before existing ends AND new ends after existing starts
      .andWhere('a.scheduledAt < :endsAt AND a.endsAt > :scheduledAt', {
        scheduledAt,
        endsAt,
      });

    if (excludeId) {
      qb.andWhere('a.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  CRUD
  // ────────────────────────────────────────────────────────────────────────────

  async create(clinicId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    const scheduledAt = parseAsNepalTime(dto.scheduledAt);
    const endsAt      = addMinutes(scheduledAt, dto.durationMinutes || 30);

    // The conflict check (SELECT) and the insert (INSERT) used to run as two
    // separate, unsynchronized steps. If the same booking was submitted twice
    // in quick succession — a double-click/double-tap on "Book Appointment",
    // or a slow network response tempting the user to tap again — both
    // requests could pass the conflict check before either had committed,
    // silently creating two identical appointments for the same slot. The
    // duplicate would usually go unnoticed until the 30-minute auto-no-show
    // job flipped its still-"scheduled" status to "no_show", which looked
    // like the system had spontaneously generated a bogus appointment.
    //
    // Wrapping this in a transaction with a pessimistic write lock on any
    // matching rows for this dentist serializes concurrent create calls, so
    // the second request now sees the first's row (once committed) and is
    // correctly rejected as a conflict instead of slipping through.
    // SQLite (used for offline branch mode) has no row-level locking support —
    // TypeORM throws if setLock() is used against it. SQLite already
    // serializes concurrent write transactions at the connection/file level,
    // so simply running the check-then-insert inside a transaction is enough
    // to close the race there; Postgres additionally gets an explicit
    // pessimistic lock since its transactions don't serialize by default.
    const isSQLite = process.env.DB_DRIVER === 'sqlite';
    const saved = await this.repo.manager.transaction(async (manager) => {
      let query = manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.dentistId = :dentistId', { dentistId: dto.dentistId });
      if (!isSQLite) query = query.setLock('pessimistic_write');
      const lockedConflict = await query
        .andWhere('a.status NOT IN (:...cancelled)', {
          cancelled: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        })
        .andWhere('a.scheduledAt < :endsAt AND a.endsAt > :scheduledAt', {
          scheduledAt,
          endsAt,
        })
        .getOne();

      if (lockedConflict) {
        const isSameBranch = !dto.branchId || lockedConflict.branchId === dto.branchId;
        const where = isSameBranch ? 'at this branch' : 'at another branch';
        throw new ForbiddenException(
          `Doctor already has an appointment ${where} from ` +
          `${formatNepalTime(lockedConflict.scheduledAt)} ` +
          `to ${formatNepalTime(lockedConflict.endsAt)}`,
        );
      }

      const apt = manager.create(Appointment, { ...dto, clinicId, scheduledAt, endsAt });
      return manager.save(apt);
    });

    await this.patientRepo.update(dto.patientId, { lastVisitAt: scheduledAt } as any);

    // Load relations needed for notification
    const full = await this.findOne(clinicId, saved.id);
    this.notifyDoctor(full, false).catch(() => {});

    // Auto-generate invoice if payment details provided
    if ((dto as any).autoGenerateInvoice && (dto as any).fee && (dto as any).paymentMethod) {
      try { await this.autoCreateInvoice(clinicId, full, (dto as any).fee, (dto as any).paymentMethod); } catch {}
    }

    return saved;
  }

  async findAll(clinicId: string, query: any) {
    const {
      page = 1, limit = 300,
      date, month, from, to, dentistId, patientId, status, isPaid,
      branchId,                  // optional branch filter
      branchIds,                 // optional comma-separated branch filter (access control)
      order = 'ASC',             // 'ASC' | 'DESC'
    } = query;

    let qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.dentist', 'dentist')
      .leftJoinAndSelect('a.branch',  'branch')
      .leftJoinAndSelect('a.service', 'service')
      .where('a.clinicId = :clinicId', { clinicId });

    if (status)    qb = qb.andWhere('a.status = :status', { status });
    if (dentistId) qb = qb.andWhere('a.dentistId = :dentistId', { dentistId });
    if (patientId) qb = qb.andWhere('a.patientId = :patientId', { patientId });
    if (isPaid !== undefined) qb = qb.andWhere('a.isPaid = :isPaid', { isPaid: isPaid === 'true' || isPaid === true });

    // Branch filter — single branch or multiple (access control)
    if (branchId) {
      qb = qb.andWhere('a.branchId = :branchId', { branchId });
    } else if (branchIds) {
      const ids = String(branchIds).split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) qb = qb.andWhere('a.branchId IN (:...ids)', { ids });
    }

    if (date) {
      // `date` is a plain "YYYY-MM-DD" naming a Nepal calendar day — resolve
      // its bounds against Nepal's UTC+5:45 offset, not the server's own
      // timezone (see nepalDateStringBoundsUTC for why this matters).
      const { start, end } = nepalDateStringBoundsUTC(date);
      qb = qb.andWhere('a.scheduledAt BETWEEN :start AND :end', { start, end });
    } else if (from && to) {
      const { start } = nepalDateStringBoundsUTC(from);
      const { end }   = nepalDateStringBoundsUTC(to);
      qb = qb.andWhere('a.scheduledAt BETWEEN :start AND :end', { start, end });
    } else if (month) {
      // `month` is "YYYY-MM" — compute the last calendar day with plain
      // arithmetic (safe; no timezone involved), then resolve both ends as
      // Nepal-local day bounds.
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const { start } = nepalDateStringBoundsUTC(`${month}-01`);
      const { end }   = nepalDateStringBoundsUTC(`${month}-${String(lastDay).padStart(2, '0')}`);
      qb = qb.andWhere('a.scheduledAt BETWEEN :start AND :end', { start, end });
    }

    qb = qb.orderBy('a.scheduledAt', order === 'DESC' ? 'DESC' : 'ASC');

    const totalQb = qb.clone();
    const total   = await totalQb.getCount();

    qb = qb.skip((page - 1) * limit).take(+limit);
    const data = await qb.getMany();

    return { data, total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(clinicId: string, id: string): Promise<Appointment> {
    const apt = await this.repo.findOne({
      where:     { id, clinicId },
      relations: ['patient', 'dentist', 'branch', 'service'],
    });
    if (!apt) throw new NotFoundException('Appointment not found');
    return apt;
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const apt = await this.findOne(clinicId, id);

    // Re-check conflicts if rescheduling
    if (dto.scheduledAt) {
      const newStart    = parseAsNepalTime(dto.scheduledAt);
      const newEnd      = addMinutes(newStart, dto.durationMinutes ?? apt.durationMinutes);
      const newDentist  = dto.dentistId ?? apt.dentistId;

      const conflict = await this.findConflict(newDentist, newStart, newEnd, id);
      if (conflict) {
        const isSameBranch = conflict.branchId === (dto.branchId ?? apt.branchId);
        throw new ForbiddenException(
          `Doctor already booked ${isSameBranch ? 'here' : 'at another branch'} at that time`,
        );
      }
      apt.scheduledAt = newStart;
      apt.endsAt = newEnd;
    }

    Object.assign(apt, dto);
    apt.scheduledAt = apt.scheduledAt instanceof Date ? apt.scheduledAt : parseAsNepalTime(apt.scheduledAt as any);
    const updated = await this.repo.save(apt);

    // Notify doctor of the update (reschedule, type change, etc.)
    if (dto.scheduledAt || dto.dentistId || dto.type) {
      const full = await this.findOne(clinicId, updated.id);
      this.notifyDoctor(full, true).catch(() => {});
    }

    // Auto-generate invoice if payment details provided and not already invoiced
    if ((dto as any).autoGenerateInvoice && (dto as any).fee && (dto as any).paymentMethod) {
      try { await this.autoCreateInvoice(clinicId, updated, (dto as any).fee, (dto as any).paymentMethod); } catch {}
    }


    // Emit real-time to patient portal if status changed to confirmed
    if (dto.status === AppointmentStatus.CONFIRMED || (dto as any).status === 'confirmed') {
      const patientId = (updated as any).patientId || (updated as any).patient?.patientAccountId;
      if (patientId) {
        try {
          this.notificationsGateway.emitToPatient(patientId, 'appointment_confirmed', {
            appointmentId: updated.id,
            scheduledAt:   (updated as any).scheduledAt,
            videoRoomUrl:  (updated as any).videoRoomUrl,
          });
        } catch { /* non-critical */ }
      }
    }

    return updated;
  }

  async cancel(clinicId: string, id: string, reason?: string): Promise<Appointment> {
    const apt     = await this.findOne(clinicId, id);
    apt.status    = AppointmentStatus.CANCELLED;
    apt.cancelReason = reason || '';
    return this.repo.save(apt);
  }

  async complete(clinicId: string, id: string, dto: any): Promise<Appointment> {
    const apt = await this.findOne(clinicId, id);
    Object.assign(apt, { ...dto, status: AppointmentStatus.COMPLETED });
    return this.repo.save(apt);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }

  /**
   * Auto-create invoice from appointment when paid section is filled.
   */
  private async autoCreateInvoice(clinicId: string, apt: Appointment, fee: number, paymentMethod: string): Promise<void> {
    // Load clinic for VAT settings
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    const vatPercent = (clinic as any)?.settings?.vatPercent ?? 0;
    const subtotal   = Number(fee);
    const taxAmount  = +(subtotal * vatPercent / 100).toFixed(2);
    const total      = +(subtotal + taxAmount).toFixed(2);
    const aptType    = (apt.type || 'appointment').replace(/_/g, ' ');
    const label      = aptType.charAt(0).toUpperCase() + aptType.slice(1);

    // IMPORTANT: include serviceId and doctorId so triggerCommission can fire.
    // Both fields are nullable for backward-compat; only set them when present.
    const item: any = {
      description: label,
      quantity:    1,
      unitPrice:   subtotal,
      total:       subtotal,
    };
    if (apt.serviceId)  item.serviceId = apt.serviceId;
    if (apt.dentistId)  item.doctorId  = apt.dentistId;

    await this.billingService.create(clinicId, {
      patientId:     apt.patientId,
      appointmentId: apt.id,
      branchId:      apt.branchId,
      items: [item],
      subtotal,
      taxPercent: vatPercent,
      taxAmount,
      discountAmount: 0,
      total,
      paidAmount: total,
      dueAmount:  0,
      status:     'paid',
      paymentMethod,
      paidAt: new Date(),
    });
  }

  /**
   * AI slot suggestions — returns available 30-min slots for next 7 days.
   */
  async suggestSlots(clinicId: string, query: any): Promise<any> {
    const { dentistId, durationMinutes = 30 } = query;
    if (!dentistId) return { suggestions: [] };

    const now       = new Date();
    const slots: any[] = [];
    const today     = nepalTodayParts();
    // Use a UTC noon anchor purely for safe calendar-day arithmetic (avoids DST/month-rollover edge cases).
    const anchor    = new Date(Date.UTC(today.year, today.month - 1, today.day, 12));

    for (let day = 0; day < 7; day++) {
      const d = new Date(anchor.getTime() + day * 86_400_000);
      const base = nepalWallClockToUTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 9, 0);

      for (let slot = 0; slot < 18; slot++) {
        const start = new Date(base.getTime() + slot * 30 * 60_000);
        const end   = addMinutes(start, durationMinutes);
        if (start <= now) continue;

        const conflict = await this.findConflict(dentistId, start, end);
        if (!conflict) {
          slots.push({
            scheduledAt: start.toISOString(),
            endsAt:      end.toISOString(),
            label:       formatNepalTime(start, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          });
          if (slots.length >= 6) break;
        }
      }
      if (slots.length >= 6) break;
    }

    return { suggestions: slots };
  }
}