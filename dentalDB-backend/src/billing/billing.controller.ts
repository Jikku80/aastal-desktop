import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, Res, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { BillingService } from './billing.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ClinicsService } from '../clinics/clinics.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private service: BillingService,
    private pdfService: PdfService,
    private clinicsService: ClinicsService,
    private auditService: AuditService,
  ) {}

  @Post('invoices')
  @RequirePermissions('invoice.create')
  create(@Request() req, @Body() dto: CreateInvoiceDto) {
    return this.service.create(req.user.clinicId, dto);
  }

  @Get('invoices')
  @RequirePermissions('billing.view')
  findAll(@Request() req, @Query() query: any) {
    return this.service.findAll(req.user.clinicId, query);
  }

  @Get('analytics')
  @RequirePermissions('analytics.view')
  getAnalytics(@Request() req, @Query() query: any) {
    return this.service.getAnalytics(req.user.clinicId, query);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Patch('invoices/:id')
  @RequirePermissions('invoice.update')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  @Patch('invoices/:id/pay')
  @RequirePermissions('billing.manage')
  markPaid(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.markPaid(req.user.clinicId, id, dto);
  }

  @Delete('invoices/:id')
  @RequirePermissions('invoice.delete')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }

  @Get('invoices/:id/pdf')
  @RequirePermissions('billing.view')
  async downloadPdf(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const invoice   = await this.service.findOne(req.user.clinicId, id);
    const clinic    = await this.clinicsService.findById(req.user.clinicId);
    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice, clinic);

    // Audit PDF export
    setImmediate(() => this.auditService.log({
      clinicId:   req.user.clinicId,
      userId:     req.user.id,
      action:     AuditAction.EXPORT,
      entityType: AuditEntityType.INVOICE,
      entityId:   id,
      ipAddress:  req.ip,
      userAgent:  req.headers['user-agent'],
    }));

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdfBuffer));
  }

  // ── Billing Template ───────────────────────────────────────────────────────

  @Get('template/preview')
  async getBillingTemplatePreview(@Request() req, @Res() res: Response) {
    const clinic     = await this.clinicsService.findById(req.user.clinicId);
    const tpl        = clinic.billingTemplate || {};
    const themeColor = tpl.themeColor || '#027cc6';
    const showLogo    = tpl.showLogo               === true;
    const showLicense = tpl.showLicenseNumber       === true;
    const showReg     = tpl.showRegistrationNumber  === true;
    const showVat     = tpl.showVatNumber           === true;

    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
    const logoHtml = showLogo && clinic.logo
      ? `<img src="${clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`}" alt="logo" style="max-height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:8px"/>`
      : '';

    const clinicMeta = [
      clinic.address || '123 Medical Street, Kathmandu',
      clinic.phone,
      clinic.email,
      showLicense && clinic.licenseNumber      ? `License: ${clinic.licenseNumber}`      : null,
      showReg     && clinic.registrationNumber  ? `Reg No: ${clinic.registrationNumber}`  : null,
      showVat     && clinic.vatNumber           ? `VAT No: ${clinic.vatNumber}`            : null,
    ].filter(Boolean).join('<br>');

    const headerNote = tpl.headerNote
      ? `<div style="font-size:11px;color:#6b7280;margin-top:6px;font-style:italic">${tpl.headerNote}</div>`
      : '';
    const footerNote = tpl.footerNote
      ? `<p style="margin-top:16px;text-align:center;font-size:11px;color:#9ca3af;font-style:italic">${tpl.footerNote}</p>`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:24px;background:#f3f4f6;}
  .card{background:#fff;border-radius:12px;padding:32px;max-width:700px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;border-bottom:3px solid ${themeColor};padding-bottom:18px;}
  .clinic-name{font-size:17px;font-weight:700;color:#1f2937;}
  .clinic-meta{font-size:11px;color:#6b7280;line-height:1.7;margin-top:4px;}
  .inv-label{font-size:22px;font-weight:800;color:${themeColor};}
  .inv-meta{font-size:12px;color:#6b7280;line-height:1.8;text-align:right;}
  table{width:100%;border-collapse:collapse;margin:20px 0;}
  thead tr{background:${themeColor};color:#fff;}
  th,td{padding:10px 12px;text-align:left;font-size:12px;}
  tbody tr:nth-child(even){background:#f9fafb;}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;background:${themeColor}20;color:${themeColor};}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:14px;}
</style></head><body><div class="card">
  <div class="header">
    <div>
      ${logoHtml}
      <div class="clinic-name">${clinic.name || 'Dental Clinic'}</div>
      <div class="clinic-meta">${clinicMeta}</div>
      ${headerNote}
    </div>
    <div>
      <div class="inv-label">INVOICE</div>
      <div class="inv-meta">
        <div><strong>INV-2024-001</strong></div>
        <div>Date: ${new Date().toLocaleDateString()}</div>
        <div>Due: ${new Date(Date.now() + 30 * 864e5).toLocaleDateString()}</div>
        <div style="margin-top:6px"><span class="badge">Paid</span></div>
      </div>
    </div>
  </div>
  <div style="display:flex;gap:20px;margin-bottom:24px;font-size:12px;">
    <div style="flex:1;padding:12px 14px;background:#f9fafb;border-radius:8px;border-left:3px solid ${themeColor}">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:6px">Bill To</div>
      <strong>John Patient</strong><br>john@example.com<br>+977 98XXXXXXXX
    </div>
    <div style="flex:1;padding:12px 14px;background:#f9fafb;border-radius:8px;border-left:3px solid ${themeColor}">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:6px">Payment</div>
      Method: Cash<br>Paid: ${new Date().toLocaleDateString()}
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      <tr><td>Dental Checkup</td><td style="text-align:center">1</td><td style="text-align:right">NPR 500</td><td style="text-align:right"><strong>NPR 500</strong></td></tr>
      <tr><td>X-Ray (OPG)</td><td style="text-align:center">1</td><td style="text-align:right">NPR 1,500</td><td style="text-align:right"><strong>NPR 1,500</strong></td></tr>
      <tr><td>Scaling &amp; Polishing</td><td style="text-align:center">1</td><td style="text-align:right">NPR 2,000</td><td style="text-align:right"><strong>NPR 2,000</strong></td></tr>
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:-8px">
    <table style="width:260px;margin:0">
      <tr><td style="padding:6px 8px;color:#6b7280">Subtotal</td><td style="padding:6px 8px;text-align:right">NPR 4,000</td></tr>
      <tr><td style="padding:6px 8px;color:#6b7280">VAT (13%)</td><td style="padding:6px 8px;text-align:right">NPR 520</td></tr>
      <tr style="background:${themeColor};color:#fff"><td style="padding:9px 12px;font-weight:700;border-radius:6px 0 0 6px">Total</td><td style="padding:9px 12px;text-align:right;font-weight:700;border-radius:0 6px 6px 0">NPR 4,520</td></tr>
    </table>
  </div>
  ${footerNote}
  <div class="footer">
    Generated by DentalOS &bull; ${new Date().getFullYear()}
    ${showVat && clinic.vatNumber          ? `&bull; VAT: ${clinic.vatNumber}`           : ''}
    ${showReg && clinic.registrationNumber ? `&bull; Reg: ${clinic.registrationNumber}`  : ''}
    ${showLicense && clinic.licenseNumber  ? `&bull; License: ${clinic.licenseNumber}`   : ''}
  </div>
</div></body></html>`;

    (res as any).setHeader('Content-Type', 'text/html');
    (res as any).send(html);
  }

  @Get('aging-report')
  getAgingReport(@Request() req, @Query('branchId') branchId?: string) {
    return this.service.getAgingReport(req.user.clinicId, branchId);
  }

  @Get('template')
  async getBillingTemplate(@Request() req) {
    const clinic = await this.clinicsService.findById(req.user.clinicId);
    return clinic.billingTemplate || {};
  }

  @Patch('template')
  async updateBillingTemplate(@Request() req, @Body() body: any) {
    const allowed = ['showLogo', 'showVatNumber', 'showRegistrationNumber',
                     'showLicenseNumber', 'headerNote', 'footerNote', 'themeColor'];
    const clinic = await this.clinicsService.findById(req.user.clinicId);
    const existing: Record<string, any> = clinic.billingTemplate || {};
    const merged: Record<string, any> = { ...existing };
    for (const k of allowed) {
      if (k in body) merged[k] = body[k];
    }
    await this.clinicsService.update(req.user.clinicId, { billingTemplate: merged } as any);
    return merged;
  }
}