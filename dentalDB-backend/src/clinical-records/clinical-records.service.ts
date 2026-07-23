import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalRecord, Prescription } from './entities/clinical-record.entity';
import { CreateClinicalRecordDto, UpdateClinicalRecordDto, UpsertClinicalRecordFromBillingDto } from './dto/clinical-record.dto';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    @InjectRepository(ClinicalRecord) private repo: Repository<ClinicalRecord>,
    @InjectRepository(Prescription)   private rxRepo: Repository<Prescription>,
  ) {}

  async create(clinicId: string, dto: CreateClinicalRecordDto): Promise<ClinicalRecord> {
    const record = this.repo.create({
      clinicId,
      branchId:       dto.branchId || undefined,
      patientId:      dto.patientId,
      doctorId:       dto.doctorId,
      appointmentId:  dto.appointmentId,
      diagnosisNotes: dto.diagnosisNotes,
      treatmentPlan:  dto.treatmentPlan,
      attachments:    dto.attachments,
    });
    const saved = await this.repo.save(record);

    if (dto.prescriptions?.length) {
      const rxs = this.rxRepo.create(
        dto.prescriptions.map(rx => ({ ...rx, clinicalRecordId: saved.id })),
      );
      await this.rxRepo.save(rxs);
    }

    return this.findOne(clinicId, saved.id);
  }

  /**
   * Called automatically after billing/an invoice is created for a patient
   * (see InvoiceModal.tsx). Business rules, per product spec:
   *  - No services on the invoice  → do nothing, return null. (Products/lab
   *    tests alone should never spawn a clinical record.)
   *  - No existing clinical record for this patient → create one, seeded
   *    with a single visit entry.
   *  - A clinical record already exists → append a new dated visit entry to
   *    it (new date/time, new services) rather than overwriting anything —
   *    a single `treatmentPlan` text box can't represent multiple visits on
   *    different dates, so visit history lives in the `visits` array
   *    instead and treatmentPlan/diagnosisNotes are left for staff to edit
   *    by hand from the Clinical Records page.
   *  - No doctor resolved from the billing line items/appointment → the
   *    record's doctor is left blank instead of guessing.
   */
  /** The most-recently-touched clinical record for a patient, or null. Used by upsertFromBilling and the historical backfill script. */
  async findLatestForPatient(clinicId: string, patientId: string): Promise<ClinicalRecord | null> {
    return this.repo.findOne({
      where: { clinicId, patientId },
      order: { updatedAt: 'DESC' },
      relations: ['patient', 'doctor', 'prescriptions'],
    });
  }

  async upsertFromBilling(clinicId: string, dto: UpsertClinicalRecordFromBillingDto): Promise<ClinicalRecord | null> {
    const services = (dto.services || []).map(s => (s || '').trim()).filter(Boolean);
    if (services.length === 0) return null;

    // "The" clinical record for this patient — the one most recently
    // touched, so the auto-sync flow keeps appending to a single ongoing
    // chart instead of forking a new record every visit.
    let record = await this.findLatestForPatient(clinicId, dto.patientId);

    // Idempotency: this same invoice may already have been synced (a retry
    // after a transient failure, a re-run of the historical backfill
    // script, etc). Never append a second visit entry for the same
    // invoiceId — just return the record as-is.
    if (record && dto.invoiceId && (record.visits || []).some(v => v.invoiceId === dto.invoiceId)) {
      return record;
    }

    const visitEntry = {
      id: randomUUID(),
      date: dto.visitDate || new Date().toISOString(),
      appointmentId: dto.appointmentId || undefined,
      invoiceId: dto.invoiceId || undefined,
      doctorId: dto.doctorId || undefined,
      services,
      notes: dto.notes || undefined,
    };

    if (!record) {
      record = this.repo.create({
        clinicId,
        branchId: dto.branchId || undefined,
        patientId: dto.patientId,
        doctorId: dto.doctorId || undefined,
        appointmentId: dto.appointmentId || undefined,
        visits: [visitEntry],
      });
    } else {
      record.visits = [...(record.visits || []), visitEntry];
      // Fill in a blank doctor if this billing run finally has one; never
      // overwrite a doctor that's already set.
      if (dto.doctorId && !record.doctorId) record.doctorId = dto.doctorId;
      // Same rule for branch — fill if blank, never overwrite.
      if (dto.branchId && !record.branchId) record.branchId = dto.branchId;
      // Keep the record pointed at the most recent appointment it came from.
      if (dto.appointmentId) record.appointmentId = dto.appointmentId;
    }

    const saved = await this.repo.save(record);
    return this.findOne(clinicId, saved.id);
  }

  async findAll(clinicId: string, query?: any) {
    const { page = 1, limit = 20, patientId, doctorId, appointmentId, search, dateFrom, dateTo, branchId, branchIds } = query || {};
    let qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.patient', 'patient')
      .leftJoinAndSelect('r.doctor', 'doctor')
      .leftJoinAndSelect('r.prescriptions', 'prescriptions')
      .where('r.clinicId = :clinicId', { clinicId });

    if (patientId)     qb = qb.andWhere('r.patientId = :patientId',         { patientId });
    if (doctorId)      qb = qb.andWhere('r.doctorId = :doctorId',           { doctorId });
    if (appointmentId) qb = qb.andWhere('r.appointmentId = :appointmentId', { appointmentId });

    if (branchId) {
      qb = qb.andWhere('r.branchId = :branchId', { branchId });
    } else if (branchIds) {
      const ids = String(branchIds).split(',').map((s: string) => s.trim()).filter(Boolean);
      if (ids.length > 0) qb = qb.andWhere('r.branchId IN (:...ids)', { ids });
    }

    if (search) {
      qb = qb.andWhere(
        `(patient.firstName ${ilike()} :s OR patient.lastName ${ilike()} :s OR patient.opdNo ${ilike()} :s OR doctor.firstName ${ilike()} :s OR doctor.lastName ${ilike()} :s OR r.diagnosisNotes ${ilike()} :s)`,
        { s: `%${search}%` },
      );
    }

    if (dateFrom) qb = qb.andWhere('r.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb = qb.andWhere('r.createdAt <= :dateTo', { dateTo: end });
    }

    qb = qb.orderBy('r.createdAt', 'DESC');
    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(clinicId: string, id: string): Promise<ClinicalRecord> {
    const r = await this.repo.findOne({
      where: { id, clinicId },
      relations: ['patient', 'doctor', 'prescriptions'],
    });
    if (!r) throw new NotFoundException('Clinical record not found');
    return r;
  }

  async update(clinicId: string, id: string, dto: UpdateClinicalRecordDto): Promise<ClinicalRecord> {
    await this.findOne(clinicId, id);

    const { prescriptions, ...rest } = dto;
    if (Object.keys(rest).length) {
      await this.repo.update({ id, clinicId }, rest as any);
    }

    if (prescriptions !== undefined) {
      await this.rxRepo.delete({ clinicalRecordId: id });
      if (prescriptions.length) {
        const rxs = this.rxRepo.create(prescriptions.map(rx => ({ ...rx, clinicalRecordId: id })));
        await this.rxRepo.save(rxs);
      }
    }

    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }
}