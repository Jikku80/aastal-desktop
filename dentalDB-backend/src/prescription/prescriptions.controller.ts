import {
  Controller, Get, Post, Patch, Param, Body, Res, UseGuards, Request,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { v4 as uuid } from 'uuid';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PrescriptionPdfService } from './prescription-pdf.service';

@UseGuards(JwtAuthGuard, BranchLockGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly pdfSvc: PrescriptionPdfService) {}

  // ── GET /prescriptions/template/preview-html ────────────────────────────────
  /** Renders a sample prescription using the clinic's current template — used by the settings live preview */
  @Get('template/preview-html')
  async getTemplatePreview(@Request() req: any, @Res() res: Response) {
    const clinicId = req.user.clinicId;
    const template = await this.pdfSvc.getTemplate(clinicId);
    const clinic   = await this.pdfSvc.getClinicForPreview(clinicId);

    const sampleRecord: any = {
      diagnosisNotes: 'Acute apical periodontitis — sample preview only',
      treatmentPlan:  null,
      prescriptions: [
        { medicineName: 'Amoxicillin', dosage: '500 mg', frequency: 'Three times daily', duration: '5 days',  instructions: 'After meals' },
        { medicineName: 'Ibuprofen',   dosage: '400 mg', frequency: 'As needed (pain)',  duration: '3 days',  instructions: 'With food, max 3×/day' },
        { medicineName: 'Metronidazole', dosage: '400 mg', frequency: 'Twice daily', duration: '5 days', instructions: 'Avoid alcohol' },
      ],
      patient: { firstName: 'Sample', lastName: 'Patient', gender: 'female', ageYears: 32, dateOfBirth: null },
      doctor:  { firstName: 'Jane', lastName: 'Smith' },
      createdAt: new Date(),
    };

    const html = this.pdfSvc.buildPrescriptionHtml(sampleRecord, clinic, template, new Date());
    res.set({ 'Content-Type': 'text/html' });
    res.end(html);
  }

  // ── GET /prescriptions/template ─────────────────────────────────────────────
  @Get('template')
  getTemplate(@Request() req: any) {
    return this.pdfSvc.getTemplate(req.user.clinicId);
  }

  // ── PATCH /prescriptions/template ───────────────────────────────────────────
  @Patch('template')
  updateTemplate(@Request() req: any, @Body() body: any) {
    const allowed = [
      'headerHtml', 'footerHtml', 'showLogo',
      'showLicenseNumber', 'showDoctorName', 'showPatientAge', 'showPatientGender',
    ];
    const dto: any = {};
    for (const key of allowed) {
      if (key in body) dto[key] = body[key];
    }
    return this.pdfSvc.saveTemplate(req.user.clinicId, dto);
  }

  // ── POST /prescriptions/template/logo  (upload logo) ────────────────────────
  @Post('template/logo')
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => cb(null, `rx-logo-${uuid()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        const ok = /\.(jpg|jpeg|png|webp|svg)$/i.test(extname(file.originalname));
        cb(ok ? null : new BadRequestException('Only image files allowed') as any, ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadLogo(@Request() req: any, @UploadedFiles() files: Express.Multer.File[]) {
    const file = files?.[0];
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/${file.filename}`;
    return this.pdfSvc.saveTemplate(req.user.clinicId, { logoUrl: url });
  }

  // ── POST /prescriptions/template/signature  (upload signature) ──────────────
  @Post('template/signature')
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => cb(null, `rx-sig-${uuid()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        const ok = /\.(jpg|jpeg|png|webp|svg)$/i.test(extname(file.originalname));
        cb(ok ? null : new BadRequestException('Only image files allowed') as any, ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadSignature(@Request() req: any, @UploadedFiles() files: Express.Multer.File[]) {
    const file = files?.[0];
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/${file.filename}`;
    return this.pdfSvc.saveTemplate(req.user.clinicId, { signatureUrl: url });
  }

  // ── GET /prescriptions/appointment/:appointmentId/pdf ───────────────────────
  @Get('appointment/:appointmentId/pdf')
  async getPdfByAppointment(
    @Request() req: any,
    @Param('appointmentId') appointmentId: string,
    @Res() res: Response,
  ) {
    const buf = await this.pdfSvc.generateForAppointment(req.user.clinicId, appointmentId);
    const isPdf = buf[0] === 0x25 && buf[1] === 0x50; // %P — PDF magic bytes
    res.set({
      'Content-Type': isPdf ? 'application/pdf' : 'text/html',
      'Content-Disposition': `inline; filename="prescription-${appointmentId}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }

  // ── GET /prescriptions/record/:recordId/pdf ──────────────────────────────────
  @Get('record/:recordId/pdf')
  async getPdfByRecord(
    @Request() req: any,
    @Param('recordId') recordId: string,
    @Res() res: Response,
  ) {
    const buf = await this.pdfSvc.generateForRecord(req.user.clinicId, recordId);
    const isPdf = buf[0] === 0x25 && buf[1] === 0x50;
    res.set({
      'Content-Type': isPdf ? 'application/pdf' : 'text/html',
      'Content-Disposition': `inline; filename="prescription-${recordId}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }

  // ── GET /prescriptions/record/:recordId/preview-html ────────────────────────
  /** Returns raw HTML for the in-browser print preview modal */
  @Get('record/:recordId/preview-html')
  async getPreviewHtml(
    @Request() req: any,
    @Param('recordId') recordId: string,
    @Res() res: Response,
  ) {
    const { html } = await this.pdfSvc.buildPreviewHtml(req.user.clinicId, recordId);
    res.set({ 'Content-Type': 'text/html' });
    res.end(html);
  }
}