import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { BloodTestService } from './blood-test.service';
import { CreateBloodTestDto, UpdateBloodTestDto } from './dto/blood-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('blood-test')
export class BloodTestController {
  constructor(private readonly svc: BloodTestService) {}

  @Post()
  @RequirePermissions('blood_test.manage')
  create(@Request() req, @Body() dto: CreateBloodTestDto) {
    return this.svc.create(req.user.clinicId, dto);
  }

  @Get('stats')
  @RequirePermissions('blood_test.view')
  getStats(@Request() req) {
    return this.svc.getStats(req.user.clinicId);
  }

  @Get()
  @RequirePermissions('blood_test.view')
  findAll(@Request() req, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
  }

  @Get('patient/:patientId')
  @RequirePermissions('blood_test.view')
  findByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.svc.findByPatient(req.user.clinicId, patientId);
  }

  @Get('patient/:patientId/unbilled')
  @RequirePermissions('blood_test.view')
  findUnbilledByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.svc.findUnbilledByPatient(req.user.clinicId, patientId);
  }

  @Get(':id')
  @RequirePermissions('blood_test.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('blood_test.manage')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateBloodTestDto) {
    return this.svc.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('blood_test.manage')
  remove(@Request() req, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }
}