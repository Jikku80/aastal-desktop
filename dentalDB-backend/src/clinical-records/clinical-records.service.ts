import { Injectable, NotFoundException } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalRecord, Prescription } from './entities/clinical-record.entity';
import { CreateClinicalRecordDto, UpdateClinicalRecordDto } from './dto/clinical-record.dto';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    @InjectRepository(ClinicalRecord) private repo: Repository<ClinicalRecord>,
    @InjectRepository(Prescription)   private rxRepo: Repository<Prescription>,
  ) {}

  async create(clinicId: string, dto: CreateClinicalRecordDto): Promise<ClinicalRecord> {
    const record = this.repo.create({
      clinicId,
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

  async findAll(clinicId: string, query?: any) {
    const { page = 1, limit = 20, patientId, doctorId, appointmentId, search, dateFrom, dateTo } = query || {};
    let qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.patient', 'patient')
      .leftJoinAndSelect('r.doctor', 'doctor')
      .leftJoinAndSelect('r.prescriptions', 'prescriptions')
      .where('r.clinicId = :clinicId', { clinicId });

    if (patientId)     qb = qb.andWhere('r.patientId = :patientId',         { patientId });
    if (doctorId)      qb = qb.andWhere('r.doctorId = :doctorId',           { doctorId });
    if (appointmentId) qb = qb.andWhere('r.appointmentId = :appointmentId', { appointmentId });

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