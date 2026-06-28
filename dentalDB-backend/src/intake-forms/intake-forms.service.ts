import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntakeFormTemplate } from './entities/intake-form-template.entity';
import { IntakeFormSubmission } from './entities/intake-form-submission.entity';

@Injectable()
export class IntakeFormsService {
  constructor(
    @InjectRepository(IntakeFormTemplate) private templateRepo: Repository<IntakeFormTemplate>,
    @InjectRepository(IntakeFormSubmission) private submissionRepo: Repository<IntakeFormSubmission>,
  ) {}

  async createTemplate(dto: Partial<IntakeFormTemplate>) {
    return this.templateRepo.save(this.templateRepo.create(dto));
  }
  async updateTemplate(id: string, dto: Partial<IntakeFormTemplate>) {
    await this.templateRepo.update(id, dto);
    return this.templateRepo.findOne({ where: { id } });
  }
  async deleteTemplate(id: string) { await this.templateRepo.update(id, { isActive: false }); }
  async getTemplates(filter: { clinicId?: string; doctorUserId?: string }) {
    return this.templateRepo.find({ where: { ...filter, isActive: true } });
  }
  async getTemplate(id: string) {
    const t = await this.templateRepo.findOne({ where: { id, isActive: true } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }
  async submit(dto: Partial<IntakeFormSubmission>) {
    return this.submissionRepo.save(this.submissionRepo.create(dto));
  }
  async getSubmission(appointmentId: string) {
    return this.submissionRepo.findOne({ where: { appointmentId } });
  }
}
