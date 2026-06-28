import { Controller, Post, Get, Param, Body, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TelehealthService } from './telehealth.service';

@Controller('telehealth')
export class TelehealthController {
  constructor(private readonly svc: TelehealthService) {}

  /**
   * POST /telehealth/appointments/:id/room
   * Creates (or reuses) a video room for a VIDEO-type appointment.
   * Returns { roomUrl, guestToken, hostToken }.
   * Called by staff dashboard and by patient portal when joining a call.
   */
  @Post('appointments/:id/room')
  createRoom(@Param('id') id: string) {
    return this.svc.createRoomForAppointment(id);
  }

  /**
   * GET /telehealth/appointments/:id/patient-token
   * Returns { roomUrl, token } for the patient to join.
   * patientAccountId passed as query param (not body) so it works with GET.
   */
  @Get('appointments/:id/patient-token')
  patientToken(
    @Param('id') id: string,
    @Query('patientAccountId') patientAccountId: string,
    @Req() req: Request,
  ) {
    // Derive patientAccountId from cookie token if not passed explicitly
    const accountId = patientAccountId || (req as any).patientAccountId;
    if (!accountId) {
      throw new UnauthorizedException('Patient authentication required');
    }
    return this.svc.getPatientToken(id, accountId);
  }

  /**
   * GET /telehealth/appointments/:id/staff-token
   * Returns { roomUrl, token } for a staff member / doctor to join.
   */
  @Get('appointments/:id/staff-token')
  staffToken(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.svc.getStaffToken(id, userId || 'staff');
  }
}