import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { startOfDay, endOfDay } from 'date-fns';
import { parseAsNepalTime, nepalStartOfTodayUTC, nepalEndOfTodayUTC } from '../common/utils/timezone.util';

import { WaitingQueue, QueueStatus } from './entities/waiting-queue.entity';
import { AddToQueueDto, WalkInDto }  from './dto/waiting-queue.dto';
import { Patient }                   from '../patients/entities/patient.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { WaitingQueueGateway }       from './waiting-queue.gateway';

@Injectable()
export class WaitingQueueService {
  constructor(
    @InjectRepository(WaitingQueue) private queueRepo: Repository<WaitingQueue>,
    @InjectRepository(Patient)      private patientRepo: Repository<Patient>,
    @InjectRepository(Appointment)  private appointmentRepo: Repository<Appointment>,
    private gateway: WaitingQueueGateway,
  ) {}

  // ── Token number: max today for this branch + 1, reset each day ───────────
  private async nextToken(clinicId: string, branchId: string): Promise<number> {
    const todayStart = nepalStartOfTodayUTC();
    const todayEnd   = nepalEndOfTodayUTC();
    const last = await this.queueRepo
      .createQueryBuilder('q')
      .where('q.clinicId = :clinicId', { clinicId })
      .andWhere('q.branchId = :branchId', { branchId })
      .andWhere('q.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .orderBy('q.tokenNumber', 'DESC')
      .getOne();
    return last ? last.tokenNumber + 1 : 1;
  }

  // ── Broadcast updated queue to all listeners ───────────────────────────────
  private async broadcast(clinicId: string, branchId: string) {
    const [queue, stats] = await Promise.all([
      this.getQueue(clinicId, branchId),
      this.getTodayStats(clinicId, branchId),
    ]);
    this.gateway.emitQueueUpdate(clinicId, branchId, { queue, stats });
  }

  // ── Add existing patient to queue ─────────────────────────────────────────
  async addToQueue(clinicId: string, branchId: string, dto: AddToQueueDto) {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const tokenNumber = await this.nextToken(clinicId, branchId);
    const entry = this.queueRepo.create({
      clinicId, branchId,
      patientId:     dto.patientId,
      appointmentId: dto.appointmentId,
      doctorId:      dto.doctorId,
      notes:         dto.notes,
      status:        QueueStatus.WAITING,
      tokenNumber,
    });
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;
    await this.broadcast(clinicId, branchId);
    return saved;
  }

  // ── Walk-in: find or create minimal patient, add to queue ─────────────────
  async walkIn(clinicId: string, branchId: string, dto: WalkInDto) {
    // Find existing patient by phone in this clinic
    let patient = await this.patientRepo.findOne({
      where: { clinicId, phone: dto.phone },
    });

    if (!patient) {
      patient = this.patientRepo.create({
        clinicId,
        branchId,
        firstName: dto.firstName,
        lastName:  dto.lastName || '',
        phone:     dto.phone,
        opdNo:     dto.opdNo || undefined,
      });
      patient = await this.patientRepo.save(patient) as unknown as Patient;
    } else {
      // Update patient details from walk-in form if changed
      let updated = false;
      if (dto.firstName && patient.firstName !== dto.firstName) { patient.firstName = dto.firstName; updated = true; }
      if (dto.lastName  && patient.lastName  !== dto.lastName)  { patient.lastName  = dto.lastName;  updated = true; }
      if (dto.opdNo     && patient.opdNo     !== dto.opdNo)     { patient.opdNo     = dto.opdNo;     updated = true; }
      if (updated) patient = await this.patientRepo.save(patient) as unknown as Patient;
    }

    const tokenNumber = await this.nextToken(clinicId, branchId);
    const entry = this.queueRepo.create({
      clinicId, branchId,
      patientId: patient.id,
      doctorId:  dto.doctorId,
      notes:     dto.notes,
      status:    QueueStatus.WAITING,
      tokenNumber,
    });
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;
    await this.broadcast(clinicId, branchId);
    return { entry: saved, patient };
  }

  // ── Check in an appointment: CHECKED_IN status + add to queue ────────────
  async checkInAppointment(clinicId: string, branchId: string, appointmentId: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId, clinicId },
      relations: ['patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in a cancelled appointment');
    }

    // Update appointment status
    (appointment as any).status = AppointmentStatus.CHECKED_IN;
    (appointment as any).checkedInAt = new Date();
    await this.appointmentRepo.save(appointment as unknown as Appointment);

    // Add to queue
    const tokenNumber = await this.nextToken(clinicId, branchId);
    const entry = this.queueRepo.create({
      clinicId, branchId,
      patientId:     appointment.patientId,
      appointmentId: appointment.id,
      doctorId:      appointment.dentistId,
      status:        QueueStatus.WAITING,
      tokenNumber,
    });
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;
    await this.broadcast(clinicId, branchId);
    return saved;
  }

  // ── Call next waiting patient for a doctor ────────────────────────────────
  async callNext(clinicId: string, branchId: string, doctorId?: string) {
    const where: any = {
      clinicId, branchId,
      status: QueueStatus.WAITING,
    };
    if (doctorId) where.doctorId = doctorId;

    const next = await this.queueRepo.findOne({
      where,
      order: { tokenNumber: 'ASC' },
    });
    if (!next) throw new NotFoundException('No patients waiting');

    next.status   = QueueStatus.CALLED;
    next.calledAt = new Date();
    const saved = await this.queueRepo.save(next) as unknown as WaitingQueue;
    await this.broadcast(clinicId, branchId);
    return saved;
  }

  // ── Call a specific queue entry ───────────────────────────────────────────
  async callEntry(id: string, clinicId: string) {
    const entry = await this.queueRepo.findOne({ where: { id, clinicId } });
    if (!entry) throw new NotFoundException('Queue entry not found');

    entry.status   = QueueStatus.CALLED;
    entry.calledAt = new Date();
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;
    await this.broadcast(clinicId, saved.branchId);
    return saved;
  }

  // ── Mark in-progress ─────────────────────────────────────────────────────
  async markInProgress(id: string, clinicId: string) {
    const entry = await this.queueRepo.findOne({ where: { id, clinicId } });
    if (!entry) throw new NotFoundException('Queue entry not found');

    entry.status = QueueStatus.IN_PROGRESS;
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;
    await this.broadcast(clinicId, saved.branchId);
    return saved;
  }

  // ── Mark done — creates/updates linked appointment as COMPLETED ───────────
  async markDone(id: string, clinicId: string) {
    const entry = await this.queueRepo.findOne({ where: { id, clinicId }, relations: ['patient'] });
    if (!entry) throw new NotFoundException('Queue entry not found');

    entry.status      = QueueStatus.DONE;
    entry.completedAt = new Date();
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;

    // If there's a linked appointment, mark it COMPLETED
    if (entry.appointmentId) {
      await this.appointmentRepo.update(
        { id: entry.appointmentId, clinicId },
        { status: AppointmentStatus.COMPLETED },
      );
    }
    // Note: For walk-ins without an appointment, we do NOT auto-create one here.
    // The frontend "Create Appointment" button is available to let staff manually
    // create a proper appointment with correct type/notes. Auto-creating here caused
    // duplicates when staff clicked "Create Appointment" after marking done.

    await this.broadcast(clinicId, saved.branchId);
    return saved;
  }

  // ── Create appointment for a completed walk-in queue entry ───────────────
  async createAppointmentForEntry(
    id: string,
    clinicId: string,
    dto: {
      scheduledAt: string;
      endsAt: string;
      type?: string;
      notes?: string;
      dentistId?: string;
      branchId?: string;
    },
  ): Promise<{ appointment: Appointment; queueEntry: WaitingQueue }> {
    const entry = await this.queueRepo.findOne({ where: { id, clinicId }, relations: ['patient'] });
    if (!entry) throw new NotFoundException('Queue entry not found');

    // Idempotency: if already linked, return the existing appointment
    if (entry.appointmentId) {
      const existing = await this.appointmentRepo.findOne({
        where: { id: entry.appointmentId, clinicId },
      });
      if (existing) {
        return { appointment: existing as unknown as Appointment, queueEntry: entry };
      }
    }

    const scheduledAt     = parseAsNepalTime(dto.scheduledAt);
    const endsAt          = parseAsNepalTime(dto.endsAt);
    const durationMinutes = Math.round((endsAt.getTime() - scheduledAt.getTime()) / 60000) || 30;

    const apt = this.appointmentRepo.create({
      clinicId,
      branchId:        dto.branchId ?? entry.branchId,
      patientId:       entry.patientId,
      dentistId:       dto.dentistId ?? entry.doctorId ?? undefined,
      scheduledAt,
      endsAt,
      status:          AppointmentStatus.COMPLETED,
      type:            dto.type ?? 'walk_in',
      notes:           dto.notes ?? entry.notes ?? '',
      durationMinutes,
    } as unknown as Appointment);

    const createdApt = await this.appointmentRepo.save(apt) as unknown as Appointment;

    // Link queue entry → appointment (prevents re-creation on second click)
    await this.queueRepo.update({ id }, { appointmentId: createdApt.id });
    entry.appointmentId = createdApt.id;

    return { appointment: createdApt, queueEntry: entry };
  }

  // ── Skip an entry ─────────────────────────────────────────────────────────
  async skipEntry(id: string, clinicId: string) {
    const entry = await this.queueRepo.findOne({ where: { id, clinicId } });
    if (!entry) throw new NotFoundException('Queue entry not found');

    entry.status = QueueStatus.SKIPPED;
    const saved = await this.queueRepo.save(entry) as unknown as WaitingQueue;
    await this.broadcast(clinicId, saved.branchId);
    return saved;
  }

  // ── Remove from queue ─────────────────────────────────────────────────────
  async removeFromQueue(id: string, clinicId: string) {
    const entry = await this.queueRepo.findOne({ where: { id, clinicId } });
    if (!entry) throw new NotFoundException('Queue entry not found');
    await this.queueRepo.remove(entry);
    await this.broadcast(clinicId, entry.branchId);
    return { success: true };
  }

  // ── Get today's active queue ──────────────────────────────────────────────
  async getQueue(clinicId: string, branchId: string) {
    const todayStart = nepalStartOfTodayUTC();
    const todayEnd   = nepalEndOfTodayUTC();

    return this.queueRepo.find({
      where: {
        clinicId, branchId,
        createdAt: Between(todayStart, todayEnd),
      },
      relations: ['patient', 'doctor', 'appointment'],
      order: { tokenNumber: 'ASC' },
    });
  }

  // ── Today's stats ─────────────────────────────────────────────────────────
  async getTodayStats(clinicId: string, branchId: string) {
    const todayStart = nepalStartOfTodayUTC();
    const todayEnd   = nepalEndOfTodayUTC();

    const all = await this.queueRepo.find({
      where: {
        clinicId, branchId,
        createdAt: Between(todayStart, todayEnd),
      },
    });

    const waiting    = all.filter(e => e.status === QueueStatus.WAITING).length;
    const called     = all.filter(e => e.status === QueueStatus.CALLED).length;
    const inProgress = all.filter(e => e.status === QueueStatus.IN_PROGRESS).length;
    const done       = all.filter(e => e.status === QueueStatus.DONE).length;
    const skipped    = all.filter(e => e.status === QueueStatus.SKIPPED).length;
    const total      = all.length;

    // Average wait time for done entries (calledAt - createdAt in minutes)
    const waitTimes = all
      .filter(e => e.status === QueueStatus.DONE && e.calledAt)
      .map(e => (e.calledAt.getTime() - e.createdAt.getTime()) / 60000);
    const avgWaitMinutes = waitTimes.length
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;

    return { total, waiting, called, inProgress, done, skipped, avgWaitMinutes };
  }

  // ── Search appointments eligible for check-in ─────────────────────────────
  async searchCheckInAppointments(clinicId: string, branchId: string, query: string) {
    const todayStart = nepalStartOfTodayUTC();
    const todayEnd   = nepalEndOfTodayUTC();

    return this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'p')
      .leftJoinAndSelect('a.dentist', 'd')
      .where('a.clinicId = :clinicId', { clinicId })
      .andWhere('a.branchId = :branchId', { branchId })
      .andWhere('a.scheduledAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .andWhere('a.status NOT IN (:...statuses)', {
        statuses: [
          AppointmentStatus.CANCELLED,
          AppointmentStatus.COMPLETED,
          (AppointmentStatus as any).CHECKED_IN ?? 'checked_in',
        ],
      })
      .andWhere(
        '(LOWER(p.firstName) LIKE :q OR LOWER(p.lastName) LIKE :q OR p.phone LIKE :q)',
        { q: `%${query.toLowerCase()}%` },
      )
      .orderBy('a.scheduledAt', 'ASC')
      .take(10)
      .getMany();
  }
}