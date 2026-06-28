import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecallsService } from './recalls.service';
import { CreateRecallDto, UpdateRecallDto, BulkCreateRecallDto } from './dto/recall.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@ApiTags('Recalls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('recalls')
export class RecallsController {
  constructor(private service: RecallsService) {}

  @Post()
  @RequirePermissions('appointment.create')
  create(@Request() req, @Body() dto: CreateRecallDto) {
    return this.service.create(req.user.clinicId, req.user.id, dto);
  }

  @Post('bulk')
  @RequirePermissions('appointment.create')
  bulkCreate(@Request() req, @Body() dto: BulkCreateRecallDto) {
    return this.service.bulkCreate(req.user.clinicId, req.user.id, dto);
  }

  @Get()
  @RequirePermissions('appointment.view')
  findAll(@Request() req) {
    return this.service.findAll(req.user.clinicId);
  }

  @Get('stats')
  @RequirePermissions('appointment.view')
  stats(@Request() req) {
    return this.service.getStats(req.user.clinicId);
  }

  @Get('patient/:patientId')
  @RequirePermissions('patient.view')
  findByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.service.findByPatient(req.user.clinicId, patientId);
  }

  @Post(':id/create-appointment')
  @RequirePermissions('appointment.create')
  createAppointment(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.createAppointmentForRecall(req.user.clinicId, id, dto);
  }

  @Patch(':id/appointment-outcome')
  @RequirePermissions('appointment.create')
  updateAppointmentOutcome(@Request() req, @Param('id') id: string, @Body() body: { outcome: 'completed' | 'no_show' | 'cancelled' }) {
    return this.service.updateAppointmentOutcome(req.user.clinicId, id, body.outcome);
  }

  @Patch(':id')
  @RequirePermissions('appointment.create')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateRecallDto) {
    return this.service.update(req.user.clinicId, id, dto);
  }


  @Post(':id/send-now')
  @RequirePermissions('appointment.create')
  sendNow(@Request() req, @Param('id') id: string) {
    return this.service.sendNow(req.user.clinicId, id);
  }

  @Delete(':id')
  @RequirePermissions('appointment.create')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }
}
