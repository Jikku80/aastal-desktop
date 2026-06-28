import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ConsentsService } from './consents.service';
import { PatientAuthService } from '../patient-auth/patient-auth.service';

@Controller('consents')
export class ConsentsController {
  constructor(
    private readonly svc: ConsentsService,
    private readonly patientAuthService: PatientAuthService,
  ) {}

  /** Extract & verify patient account ID from the httpOnly cookie token. */
  private getPatientAccountId(req: Request): string | null {
    try {
      const token = (req as any).cookies?.patient_token || req.headers.authorization?.split(' ')[1];
      if (!token) return null;
      const payload = this.patientAuthService.verifyToken(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  @Post('templates') create(@Body() body: any) { return this.svc.createTemplate(body); }
  @Patch('templates/:id') update(@Param('id') id: string, @Body() body: any) { return this.svc.updateTemplate(id, body); }
  @Delete('templates/:id') remove(@Param('id') id: string) { return this.svc.deleteTemplate(id); }
  @Get('templates') list(@Query() q: any) { return this.svc.getTemplates(q); }
  @Get('templates/:id') get(@Param('id') id: string) { return this.svc.getTemplate(id); }

  @Post('sign')
  sign(@Body() body: any, @Req() req: Request) {
    // #33: use token-derived patientAccountId; ignore any patientAccountId in body
    const patientAccountId = this.getPatientAccountId(req) || body.patientAccountId;
    return this.svc.sign({ ...body, patientAccountId, ipAddress: (req as any).ip });
  }

  @Get('signed')
  getSigned(@Req() req: Request, @Query('patientAccountId') fallbackId?: string) {
    // #3: extract from cookie token; fall back to query param for backward compat
    const id = this.getPatientAccountId(req) || fallbackId;
    if (!id) throw new UnauthorizedException('Patient authentication required');
    return this.svc.getSignedConsents(id);
  }

  @Get('appointment/:appointmentId')
  getPending(@Param('appointmentId') id: string, @Req() req: Request) {
    // #11: require patient or staff auth
    const patientId = this.getPatientAccountId(req);
    const staffToken = (req as any).cookies?.access_token || req.headers.authorization?.split(' ')[1];
    if (!patientId && !staffToken) throw new UnauthorizedException('Authentication required');
    return this.svc.getPendingForAppointment(id);
  }
}
