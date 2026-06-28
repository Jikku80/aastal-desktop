import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentTemplate } from './entities/consent-template.entity';
import { ConsentSubmission } from './entities/consent-submission.entity';

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(ConsentTemplate) private templateRepo: Repository<ConsentTemplate>,
    @InjectRepository(ConsentSubmission) private submissionRepo: Repository<ConsentSubmission>,
  ) {}

  async createTemplate(dto: Partial<ConsentTemplate>) { return this.templateRepo.save(this.templateRepo.create(dto)); }
  async updateTemplate(id: string, dto: Partial<ConsentTemplate>) {
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
  async sign(dto: Partial<ConsentSubmission> & { ipAddress?: string }) {
    return this.submissionRepo.save(this.submissionRepo.create(dto));
  }
  async getSignedConsents(patientAccountId: string) {
    return this.submissionRepo.find({ where: { patientAccountId }, order: { signedAt: 'DESC' } });
  }
  async getPendingForAppointment(appointmentId: string) {
    return this.submissionRepo.find({ where: { appointmentId } });
  }
}
