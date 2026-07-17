// dentalDB-backend/src/prescription/prescription.controller.ts
import {
  Controller, Get, Param, Res, Request,
  UseGuards, NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { User } from '../users/entities/user.entity';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('records.view')
@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly pdfService: PrescriptionPdfService,
    @InjectRepository(ClinicalRecord) private recordRepo: Repository<ClinicalRecord>,
    @InjectRepository(Clinic)         private clinicRepo: Repository<Clinic>,
    @InjectRepository(User)           private userRepo:   Repository<User>,
  ) {}

  /**
   * GET /prescriptions/:recordId/pdf
   *
   * Feature #11 changes:
   * - Logo: always pulled from clinic.logo (clinic settings) — NOT from prescriptionTemplate
   * - Signature: always pulled from the LOGGED-IN user's profile (user.signature)
   * - No "select signature" or manual upload needed
   */
  @Get(':recordId/pdf')
  async downloadPdf(
    @Param('recordId') recordId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { clinicId, id: doctorId } = req.user;

    // Validate record belongs to clinic
    const record = await this.recordRepo.findOne({
      where:     { id: recordId, clinicId },
      relations: ['patient'],
    });
    if (!record) throw new NotFoundException('Clinical record not found');

    // Clinic provides the LOGO
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    // Logged-in user provides the SIGNATURE
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const buffer = await this.pdfService.generate(clinicId, recordId, doctorId);

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="prescription-${recordId}.pdf"`,
      'Content-Length':      buffer.length,
    });

    res.end(buffer);
  }

  /**
   * GET /prescriptions/:recordId/preview
   * Returns HTML for browser-based print preview
   */
  @Get(':recordId/preview')
  async previewHtml(
    @Param('recordId') recordId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { clinicId, id: doctorId } = req.user;

    const record = await this.recordRepo.findOne({
      where:     { id: recordId, clinicId },
      relations: ['patient'],
    });
    if (!record) throw new NotFoundException('Clinical record not found');

    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });

    const html = this.pdfService.buildHtml({
      clinicalRecord: record,
      doctor:         doctor!,
      clinic:         clinic!,
    });

    res.set('Content-Type', 'text/html');
    res.send(html);
  }
}