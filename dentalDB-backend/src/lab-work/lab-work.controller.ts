import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, ForbiddenException, Res, StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { LabWorkService } from './lab-work.service';
import { LabReportPdfService } from './lab-report-pdf.service';
import { CreateLabWorkDto, UpdateLabWorkDto } from './dto/lab-work.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { BranchesService } from '../branch/branch.service';
import { ClinicsService } from '../clinics/clinics.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('lab-work')
export class LabWorkController {
  constructor(
    private readonly svc: LabWorkService,
    private readonly branchesService: BranchesService,
    private readonly pdfService: LabReportPdfService,
    private readonly clinicsService: ClinicsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermissions('lab.manage')
  async create(@Request() req, @Body() dto: CreateLabWorkDto) {
    const { id: userId, clinicId } = req.user;
    let branchId = dto.branchId;

    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const accessibleIds = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (accessibleIds.length === 0)
        throw new ForbiddenException('You are not assigned to any branch');
      if (!branchId || !accessibleIds.includes(branchId))
        branchId = accessibleIds[0];
    }

    return this.svc.create(clinicId, { ...dto, branchId: branchId || undefined }, req.user.id);
  }

  @Get('stats')
  @RequirePermissions('lab.view')
  async getStats(@Request() req, @Query('branchId') branchId?: string) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    let branchIds: string[] | undefined;
    if (!isOwner && !branchId) {
      const ids = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (ids.length > 0) branchIds = ids;
    }
    return this.svc.getStats(clinicId, { branchId, branchIds });
  }

  @Get()
  @RequirePermissions('lab.view')
  async findAll(@Request() req, @Query() query: any) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const ids = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (ids.length > 0 && !query.branchId)
        query = { ...query, branchIds: ids.join(',') };
    }
    return this.svc.findAll(clinicId, query);
  }

  @Get('patient/:patientId')
  @RequirePermissions('lab.view')
  findByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.svc.findByPatient(req.user.clinicId, patientId);
  }

  @Get('patient/:patientId/unbilled')
  @RequirePermissions('lab.view')
  findUnbilledByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.svc.findUnbilledByPatient(req.user.clinicId, patientId);
  }

  // ── Phase 8 — Design Studio template (lab report) ──────────────────────────
  // Same get/save + pdfmake-backed preview shape as billing/prescription
  // templates. Placed ahead of the ':id' routes below so 'template' isn't
  // swallowed as an id param.
  @Get('template')
  @RequirePermissions('lab.view')
  getTemplate(@Request() req) {
    return this.pdfService.getTemplate(req.user.clinicId);
  }

  @Patch('template')
  @RequirePermissions('lab.manage')
  async updateTemplate(@Request() req, @Body() body: any) {
    const allowed = ['themeColor', 'showLogo', 'showLicenseNumber', 'showMethodColumn', 'zebraStripes', 'headerNote', 'footerNote'];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) patch[k] = body[k];
    }
    return this.pdfService.saveTemplate(req.user.clinicId, patch);
  }

  @Get('template/preview')
  @RequirePermissions('lab.view')
  async previewTemplate(@Request() req, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.getTemplatePreviewPdf(req.user.clinicId);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'inline; filename="lab-report-template-preview.pdf"',
      'Content-Length':      pdfBuffer.length,
    });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdfBuffer));
  }

  @Get(':id')
  @RequirePermissions('lab.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  // Phase 7 — same pdfmake pipeline & print-confirmation pattern as the
  // invoice PDF endpoint (billing/billing.controller.ts downloadPdf).
  @Get(':id/pdf')
  @RequirePermissions('lab.view')
  async downloadPdf(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const lab       = await this.svc.findOne(req.user.clinicId, id);
    const clinic    = await this.clinicsService.findById(req.user.clinicId);
    const pdfBuffer = await this.pdfService.generateLabReportPdf(lab, clinic);

    setImmediate(() => this.auditService.log({
      clinicId:   req.user.clinicId,
      userId:     req.user.id,
      action:     AuditAction.EXPORT,
      entityType: AuditEntityType.LAB_WORK,
      entityId:   id,
      ipAddress:  req.ip,
      userAgent:  req.headers['user-agent'],
    }));

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Lab-Report-${lab.testName.replace(/[^a-z0-9]+/gi, '-')}-${lab.id.slice(0, 8)}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdfBuffer));
  }

  @Patch(':id')
  @RequirePermissions('lab.manage')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateLabWorkDto) {
    return this.svc.update(req.user.clinicId, id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('lab.manage')
  remove(@Request() req, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }
}
