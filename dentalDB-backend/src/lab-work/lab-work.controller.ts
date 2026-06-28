import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { LabWorkService } from './lab-work.service';
import { CreateLabWorkDto, UpdateLabWorkDto } from './dto/lab-work.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('lab-work')
export class LabWorkController {
  constructor(private readonly svc: LabWorkService) {}

  @Post()
  @RequirePermissions('lab.manage')
  create(@Request() req, @Body() dto: CreateLabWorkDto) {
    return this.svc.create(req.user.clinicId, dto, req.user.id);
  }

  @Get('stats')
  @RequirePermissions('lab.view')
  getStats(@Request() req) {
    return this.svc.getStats(req.user.clinicId);
  }

  @Get()
  @RequirePermissions('lab.view')
  findAll(@Request() req, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
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

  @Get(':id')
  @RequirePermissions('lab.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
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
