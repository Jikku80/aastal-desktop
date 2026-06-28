import {
  Controller, Get, Post, Patch, Body, Param, Query,
  Req, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DoctorRoleGuard } from '../auth/guards/doctor-role.guard';
import { DoctorPortalService } from './doctor-portal.service';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { UserRole, isDoctorRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, DoctorRoleGuard)
@Controller('doctor-portal')
export class DoctorPortalController {
  constructor(private readonly service: DoctorPortalService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats(@Req() req: Request) {
    const id = (req as any).user.id as string;
    return this.service.getStats(id);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get('profile')
  getProfile(@Req() req: Request) {
    const id = (req as any).user.id as string;
    return this.service.getProfile(id);
  }

  @Patch('profile')
  updateProfile(@Req() req: Request, @Body() dto: any) {
    const id = (req as any).user.id as string;
    return this.service.updateProfile(id, dto);
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  @Get('appointments')
  getAppointments(@Req() req: Request, @Query() q: any) {
    const id = (req as any).user.id as string;
    return this.service.getAppointments(id, {
      status: q.status,
      date:   q.date,
      search: q.search,
      page:   q.page  ? Number(q.page)  : 1,
      limit:  q.limit ? Number(q.limit) : 20,
    });
  }

  @Get('appointments/today')
  getTodaySchedule(@Req() req: Request) {
    const id = (req as any).user.id as string;
    return this.service.getTodaySchedule(id);
  }

  @Get('appointments/:id')
  getAppointment(@Req() req: Request, @Param('id') apptId: string) {
    const id = (req as any).user.id as string;
    return this.service.getAppointmentById(id, apptId);
  }

  @Patch('appointments/:id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id') apptId: string,
    @Body('status') status: AppointmentStatus,
    @Body('notes') notes: string,
  ) {
    const id = (req as any).user.id as string;
    return this.service.updateAppointmentStatus(id, apptId, status, notes);
  }

  // ── Patients ──────────────────────────────────────────────────────────────

  @Get('patients')
  getPatients(@Req() req: Request, @Query() q: any) {
    const id = (req as any).user.id as string;
    return this.service.getPatients(id, {
      search: q.search,
      page:   q.page  ? Number(q.page)  : 1,
      limit:  q.limit ? Number(q.limit) : 20,
    });
  }

  @Get('patients/:patientId')
  getPatient(@Req() req: Request, @Param('patientId') patientId: string) {
    const id = (req as any).user.id as string;
    return this.service.getPatientById(id, patientId);
  }

  @Get('patients/:patientId/appointments')
  getPatientAppointments(@Req() req: Request, @Param('patientId') patientId: string) {
    const id = (req as any).user.id as string;
    return this.service.getPatientAppointments(id, patientId);
  }

  /** GET /doctor/patients/:patientId/full-history — consent-gated cross-clinic timeline */
  @Get('patients/:patientId/full-history')
  getFullHistory(@Req() req: Request, @Param('patientId') patientId: string) {
    const id = (req as any).user.id as string;
    return this.service.getFullHistory(id, patientId);
  }

  /** POST /doctor/patients/:patientId/request-history-access — sends the patient a consent-request notification */
  @Post('patients/:patientId/request-history-access')
  requestHistoryAccess(@Req() req: Request, @Param('patientId') patientId: string) {
    const id = (req as any).user.id as string;
    return this.service.requestHistoryAccess(id, patientId);
  }

  // ── Referrals ─────────────────────────────────────────────────────────────

  @Post('referrals')
  createReferral(@Req() req: Request, @Body() dto: any) {
    const id = (req as any).user.id as string;
    return this.service.createReferral(id, dto);
  }

  @Get('referrals')
  getReferrals(@Req() req: Request, @Query('direction') direction: 'incoming' | 'outgoing') {
    const id = (req as any).user.id as string;
    return this.service.getReferrals(id, direction || 'outgoing');
  }

  @Patch('referrals/:id/status')
  updateReferralStatus(@Req() req: Request, @Param('id') referralId: string, @Body('status') status: any) {
    const id = (req as any).user.id as string;
    return this.service.updateReferralStatus(id, referralId, status);
  }

  // ── Refill Requests ───────────────────────────────────────────────────────

  @Get('refill-requests')
  getRefillRequests(@Req() req: Request) {
    const id = (req as any).user.id as string;
    return this.service.getRefillRequests(id);
  }

  @Post('refill-requests/:id/approve')
  approveRefillRequest(@Req() req: Request, @Param('id') refillId: string) {
    const id = (req as any).user.id as string;
    return this.service.approveRefillRequest(id, refillId);
  }

  @Post('refill-requests/:id/deny')
  denyRefillRequest(@Req() req: Request, @Param('id') refillId: string, @Body('reason') reason: string) {
    const id = (req as any).user.id as string;
    return this.service.denyRefillRequest(id, refillId, reason);
  }

  // ── Clinical Records ──────────────────────────────────────────────────────

  @Get('records')
  getRecords(@Req() req: Request, @Query() q: any) {
    const id = (req as any).user.id as string;
    return this.service.getRecords(id, {
      patientId: q.patientId,
      page:  q.page  ? Number(q.page)  : 1,
      limit: q.limit ? Number(q.limit) : 20,
    });
  }

  @Get('records/:id')
  getRecord(@Req() req: Request, @Param('id') recordId: string) {
    const id = (req as any).user.id as string;
    return this.service.getRecordById(id, recordId);
  }

  @Post('records')
  createRecord(@Req() req: Request, @Body() dto: any) {
    const id = (req as any).user.id as string;
    return this.service.createRecord(id, dto);
  }

  @Patch('records/:id')
  updateRecord(@Req() req: Request, @Param('id') recordId: string, @Body() dto: any) {
    const id = (req as any).user.id as string;
    return this.service.updateRecord(id, recordId, dto);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @Get('invoices')
  getInvoices(@Req() req: Request, @Query() q: any) {
    const id = (req as any).user.id as string;
    return this.service.getInvoices(id, {
      status: q.status,
      page:  q.page  ? Number(q.page)  : 1,
      limit: q.limit ? Number(q.limit) : 20,
    });
  }
}
