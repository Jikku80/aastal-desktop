import {
  Controller, Get, Post, Param, Body, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { VitalsService } from './vitals.service';

@ApiTags('Vitals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Get(':id/vitals')
  @RequirePermissions('appointment.view')
  getVitals(@Param('id') id: string, @Request() req: any) {
    return this.vitalsService.getForAppointment(req.user.clinicId, id);
  }

  @Post(':id/vitals')
  @RequirePermissions('appointment.create')
  recordVitals(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.vitalsService.upsertForAppointment(req.user.clinicId, id, req.user.id, dto);
  }
}