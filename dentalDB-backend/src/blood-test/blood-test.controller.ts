import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { BloodTestService } from './blood-test.service';
import { CreateBloodTestDto, UpdateBloodTestDto } from './dto/blood-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { BranchesService } from '../branch/branch.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('blood-test')
export class BloodTestController {
  constructor(
    private readonly svc: BloodTestService,
    private readonly branchesService: BranchesService,
  ) {}

  @Post()
  @RequirePermissions('blood_test.manage')
  async create(@Request() req, @Body() dto: CreateBloodTestDto) {
    const { id: userId, clinicId } = req.user;
    let branchId = dto.branchId;

    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const accessibleIds = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (accessibleIds.length === 0)
        throw new ForbiddenException('You are not assigned to any branch');
      if (!branchId || !accessibleIds.includes(branchId))
        branchId = accessibleIds[0];
    }

    return this.svc.create(clinicId, { ...dto, branchId: branchId || undefined });
  }

  @Get('stats')
  @RequirePermissions('blood_test.view')
  getStats(@Request() req) {
    return this.svc.getStats(req.user.clinicId);
  }

  @Get()
  @RequirePermissions('blood_test.view')
  async findAll(@Request() req, @Query() query: any) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const ids = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (ids.length > 0 && !query.branchId)
        query = { ...query, branchIds: ids.join(',') };
    }
    return this.svc.findAll(clinicId, query);
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