import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Req, Res, UnauthorizedException, StreamableFile,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { createReadStream } from 'fs';
import { PatientPortalService } from './patient-portal.service';
import { PatientAuthService } from '../patient-auth/patient-auth.service';
import { FilesService } from '../files/files.service';

@Controller('patient')
export class PatientPortalController {
  constructor(
    private readonly portalService: PatientPortalService,
    private readonly patientAuthService: PatientAuthService,
    private readonly filesService: FilesService,
  ) {}

  private getAccountId(req: Request): string {
    const token = (req as any).cookies?.patient_token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    const payload = this.patientAuthService.verifyToken(token);
    return payload.sub;
  }

  @Get('profile')
  getProfile(@Req() req: Request) {
    return this.portalService.getProfile(this.getAccountId(req));
  }

  @Patch('profile')
  updateProfile(@Req() req: Request, @Body() body: any) {
    return this.portalService.updateProfile(this.getAccountId(req), body);
  }

  @Get('family')
  getFamilyMembers(@Req() req: Request) {
    return this.portalService.getFamilyMembers(this.getAccountId(req));
  }

  @Post('family')
  addFamilyMember(@Req() req: Request, @Body() body: any) {
    return this.portalService.addFamilyMember(this.getAccountId(req), body);
  }

  @Delete('family/:id')
  removeFamilyMember(@Req() req: Request, @Param('id') id: string) {
    return this.portalService.removeFamilyMember(id, this.getAccountId(req));
  }

  /** POST /patient/family/claim — submit a near-match record claim for clinic verification */
  @Post('family/claim')
  claimRecord(@Req() req: Request, @Body() body: any) {
    return this.portalService.claimRecord(this.getAccountId(req), body);
  }

  @Get('appointments')
  getAppointments(@Req() req: Request, @Query() q: any) {
    return this.portalService.getAppointments(this.getAccountId(req), {
      upcoming: q.upcoming === 'true',
    });
  }

  @Post('appointments')
  bookAppointment(@Req() req: Request, @Body() body: any) {
    return this.portalService.bookAppointment(this.getAccountId(req), body);
  }

  @Patch('appointments/:id/cancel')
  cancelAppointment(@Req() req: Request, @Param('id') id: string, @Body('reason') reason: string) {
    return this.portalService.cancelAppointment(id, this.getAccountId(req), reason);
  }

  @Patch('appointments/:id/reschedule')
  rescheduleAppointment(@Req() req: Request, @Param('id') id: string, @Body('scheduledAt') scheduledAt: string) {
    return this.portalService.rescheduleAppointment(id, this.getAccountId(req), scheduledAt);
  }

  @Get('prescriptions')
  getPrescriptions(@Req() req: Request) {
    return this.portalService.getPrescriptions(this.getAccountId(req));
  }

  /** POST /patient/prescriptions/:id/refill-request */
  @Post('prescriptions/:id/refill-request')
  requestRefill(@Req() req: Request, @Param('id') id: string) {
    return this.portalService.requestRefill(this.getAccountId(req), id);
  }

  /** GET /patient/consents/clinics — clinics linked to this account, with cross-clinic sharing status */
  @Get('consents/clinics')
  getConsentClinics(@Req() req: Request) {
    return this.portalService.getConsentClinics(this.getAccountId(req));
  }

  /** PATCH /patient/consents/clinics/:clinicId — opt in/out of sharing full history with this clinic */
  @Patch('consents/clinics/:clinicId')
  setConsent(@Req() req: Request, @Param('clinicId') clinicId: string, @Body('granted') granted: boolean) {
    return this.portalService.setConsent(this.getAccountId(req), clinicId, !!granted);
  }

  /** GET /patient/referrals — referrals sent on this patient's behalf between clinics */
  @Get('referrals')
  getReferrals(@Req() req: Request) {
    return this.portalService.getReferrals(this.getAccountId(req));
  }

  /** GET /patient/reports — cross-clinic files, blood tests, and clinical record attachments */
  @Get('reports')
  getReports(@Req() req: Request) {
    return this.portalService.getReports(this.getAccountId(req));
  }

  /**
   * GET /patient/reports/files/:id/download
   * Patient-scoped file download — verifies ownership via PatientAccountLink before streaming.
   */
  @Get('reports/files/:id/download')
  async downloadReportFile(
    @Req() req: Request,
    @Param('id') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.portalService.getReportFileForDownload(this.getAccountId(req), fileId);
    const stream = createReadStream(this.filesService.getAbsolutePath(file));
    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Get('invoices')
  getInvoices(@Req() req: Request) {
    return this.portalService.getInvoices(this.getAccountId(req));
  }

  @Post('invoices/:id/pay')
  payInvoice(@Req() req: Request, @Param('id') id: string) {
    return this.portalService.payInvoice(id, this.getAccountId(req));
  }

  @Get('health-summary')
  getHealthSummary(@Req() req: Request) {
    return this.portalService.getHealthSummary(this.getAccountId(req));
  }

  /** GET /patient/notifications — appointment/lab/report-relevant notifications across all linked clinics */
  @Get('notifications')
  getPatientNotifications(@Req() req: Request, @Query('limit') limit?: string) {
    return this.portalService.getPatientNotifications(this.getAccountId(req), limit ? parseInt(limit, 10) : undefined);
  }

  /** GET /patient/notifications/unread-count */
  @Get('notifications/unread-count')
  async getPatientNotificationUnreadCount(@Req() req: Request) {
    const count = await this.portalService.getPatientNotificationUnreadCount(this.getAccountId(req));
    return { count };
  }

  /** PATCH /patient/notifications/:id/read */
  @Patch('notifications/:id/read')
  markPatientNotificationRead(@Req() req: Request, @Param('id') id: string) {
    return this.portalService.markPatientNotificationRead(this.getAccountId(req), id);
  }

  /** PATCH /patient/notifications/read-all */
  @Patch('notifications/read-all')
  markAllPatientNotificationsRead(@Req() req: Request) {
    return this.portalService.markAllPatientNotificationsRead(this.getAccountId(req));
  }

  /**
   * GET /patient/health-summary/export
   * Returns a consolidated PDF health summary across all linked clinics.
   */
  @Get('health-summary/export')
  async exportHealthSummary(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const accountId = this.getAccountId(req);
    const pdfBuffer = await this.portalService.exportHealthSummaryPdf(accountId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="health-summary.pdf"',
    });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdfBuffer));
  }
}