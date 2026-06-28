import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vitals } from './entities/vitals.entity';
import { Appointment } from './entities/appointment.entity';

export interface UpsertVitalsDto {
  systolic?:    number;
  diastolic?:   number;
  pulse?:       number;
  temperature?: number;
  weight?:      number;
  height?:      number;
  spo2?:        number;
  bloodSugar?:  number;
  notes?:       string;
}

@Injectable()
export class VitalsService {
  constructor(
    @InjectRepository(Vitals)
    private vitalsRepo: Repository<Vitals>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  /** Upsert vitals for an appointment */
  async upsertForAppointment(
    clinicId: string,
    appointmentId: string,
    recordedBy: string,
    dto: UpsertVitalsDto,
  ): Promise<Vitals> {
    const appt = await this.appointmentRepo.findOne({
      where: { id: appointmentId, clinicId },
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    let vitals = await this.vitalsRepo.findOne({ where: { appointmentId } });
    if (!vitals) {
      vitals = this.vitalsRepo.create({
        clinicId,
        patientId: appt.patientId,
        appointmentId,
        recordedBy,
      });
    }
    Object.assign(vitals, dto);
    vitals.recordedBy = recordedBy;
    return this.vitalsRepo.save(vitals);
  }

  /** Get vitals for a single appointment */
  async getForAppointment(clinicId: string, appointmentId: string): Promise<Vitals | null> {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId, clinicId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    return this.vitalsRepo.findOne({ where: { appointmentId } });
  }

  /** Get last 20 vitals records for a patient (for trend charts) */
  async getPatientHistory(clinicId: string, patientId: string): Promise<Vitals[]> {
    return this.vitalsRepo.find({
      where: { clinicId, patientId },
      order: { recordedAt: 'DESC' },
      take: 20,
      relations: ['recorder'],
    });
  }
}