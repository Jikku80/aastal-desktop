import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchesService } from '../branch/branch.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { VitalsService } from './vitals.service';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private service: AppointmentsService,
    private branchesService: BranchesService,
    private vitalsService: VitalsService,
  ) {}

  @Post()
  @RequirePermissions('appointment.create')
  async create(@Request() req, @Body() dto: CreateAppointmentDto) {
    const { id: userId, clinicId } = req.user;
    let branchId = (dto as any).branchId;

    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const accessibleIds = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (accessibleIds.length === 0)
        throw new ForbiddenException('You are not assigned to any branch');
      if (!branchId || !accessibleIds.includes(branchId))
        branchId = accessibleIds[0];
    }

    return this.service.create(clinicId, { ...dto, branchId: branchId || null } as any);
  }

  @Get()
  @RequirePermissions('appointment.view')
  async findAll(@Request() req, @Query() query: any) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const ids = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (ids.length > 0 && !query.branchId)
        query = { ...query, branchIds: ids.join(',') };
    }
    return this.service.findAll(clinicId, query);
  }

  @Get('suggest-slots')
  @RequirePermissions('appointment.view')
  suggestSlots(@Request() req, @Query() query: any) {
    return this.service.suggestSlots(req.user.clinicId, query);
  }

  @Post('suggest-slots')
  @RequirePermissions('appointment.view')
  suggestSlotsPost(@Request() req, @Body() dto: any) {
    return this.service.suggestSlots(req.user.clinicId, dto);
  }

  @Get(':id')
  @RequirePermissions('appointment.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('appointment.update')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('appointment.update')
  cancel(@Request() req, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.cancel(req.user.clinicId, id, reason);
  }

  @Patch(':id/complete')
  @RequirePermissions('appointment.update')
  complete(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.complete(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('appointment.delete')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }

  // ── Vitals ──────────────────────────────────────────────────────────────────

  @Get(':id/vitals')
  getVitals(@Request() req, @Param('id') id: string) {
    return this.vitalsService.getForAppointment(req.user.clinicId, id);
  }

  @Post(':id/vitals')
  upsertVitals(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.vitalsService.upsertForAppointment(req.user.clinicId, id, req.user.id, body);
  }
}