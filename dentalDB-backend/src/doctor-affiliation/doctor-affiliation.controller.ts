import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { DoctorAffiliationService } from './doctor-affiliation.service';

@Controller('doctor-affiliations')
export class DoctorAffiliationController {
  constructor(private readonly service: DoctorAffiliationService) {}

  @Get('clinic/:clinicId')
  getClinicAffiliations(@Param('clinicId') clinicId: string) {
    return this.service.getClinicAffiliations(clinicId);
  }

  @Post('clinic/:clinicId/invite')
  inviteDoctor(@Param('clinicId') clinicId: string, @Body() body: { doctorUserId: string; branchId?: string }) {
    return this.service.inviteDoctor(body.doctorUserId, clinicId, body.branchId);
  }

  @Patch(':id/accept')
  acceptInvite(@Param('id') id: string, @Body('doctorUserId') doctorUserId: string) {
    return this.service.acceptInvite(id, doctorUserId);
  }

  @Patch(':id/decline')
  declineInvite(@Param('id') id: string, @Body('doctorUserId') doctorUserId: string) {
    return this.service.declineInvite(id, doctorUserId);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @Body('clinicId') clinicId: string) {
    return this.service.suspendDoctor(id, clinicId);
  }

  @Patch(':id/remove')
  remove(@Param('id') id: string, @Body('clinicId') clinicId: string) {
    return this.service.removeDoctor(id, clinicId);
  }
}
