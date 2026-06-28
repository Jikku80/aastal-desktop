import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DentalChart } from './entities/dental-chart.entity';

@Injectable()
export class DentalChartService {
  constructor(
    @InjectRepository(DentalChart)
    private repo: Repository<DentalChart>,
  ) {}

  /** Get chart for a patient (returns null if not yet created) */
  async findByPatient(clinicId: string, patientId: string): Promise<DentalChart | null> {
    return this.repo.findOne({ where: { clinicId, patientId } });
  }

  /** Upsert the full dental chart for a patient */
  async upsert(clinicId: string, patientId: string, body: {
    teeth: Record<number, any>;
    history?: any[];
  }): Promise<DentalChart> {
    let chart = await this.repo.findOne({ where: { clinicId, patientId } });

    if (chart) {
      chart.teeth   = body.teeth;
      chart.history = body.history ?? chart.history;
    } else {
      chart = this.repo.create({
        clinicId,
        patientId,
        teeth:   body.teeth   ?? {},
        history: body.history ?? [],
      });
    }

    return this.repo.save(chart);
  }

  /** Update a single tooth state */
  async updateTooth(
    clinicId:  string,
    patientId: string,
    toothNumber: number,
    toothState:  any,
    historyEntry?: any,
  ): Promise<DentalChart> {
    let chart = await this.repo.findOne({ where: { clinicId, patientId } });
    if (!chart) {
      chart = this.repo.create({ clinicId, patientId, teeth: {}, history: [] });
    }

    chart.teeth = { ...chart.teeth, [toothNumber]: toothState };
    if (historyEntry) {
      chart.history = [...(chart.history ?? []), historyEntry];
    }

    return this.repo.save(chart);
  }

  /** Delete chart */
  async remove(clinicId: string, patientId: string): Promise<void> {
    const chart = await this.repo.findOne({ where: { clinicId, patientId } });
    if (chart) await this.repo.remove(chart);
  }
}
