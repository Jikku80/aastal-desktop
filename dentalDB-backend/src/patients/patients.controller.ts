import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchesService } from '../branch/branch.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { VitalsService } from '../appointments/vitals.service';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('patients')
export class PatientsController {
  constructor(
    private service: PatientsService,
    private branchesService: BranchesService,
    private vitalsService: VitalsService,
  ) {}

  @Get(':id/vitals-history')
  getVitalsHistory(@Request() req, @Param('id') id: string) {
    return this.vitalsService.getPatientHistory(req.user.clinicId, id);
  }

  @Post()
  @RequirePermissions('patient.create')
  async create(@Request() req, @Body() dto: any) {
    const { id: userId, clinicId } = req.user;
    let { branchId } = dto;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner) {
      const accessibleIds = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (accessibleIds.length === 0)
        throw new ForbiddenException('You are not assigned to any branch');
      if (!branchId || !accessibleIds.includes(branchId))
        branchId = accessibleIds[0];
    }
    return this.service.create(clinicId, { ...dto, branchId: branchId || null });
  }

  @Get()
  @RequirePermissions('patient.view')
  async findAll(@Request() req, @Query() query: any) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner && !query.branchId) {
      const ids = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (ids.length > 0) query = { ...query, branchIds: ids.join(',') };
    }
    return this.service.findAll(clinicId, query);
  }

  @Get(':id')
  @RequirePermissions('patient.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Get(':id/history')
  @RequirePermissions('patient.record')
  getHistory(@Request() req, @Param('id') id: string) {
    return this.service.getHistory(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('patient.update')
  async update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    if (!isOwner && dto.branchId) {
      const accessibleIds = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
      if (!accessibleIds.includes(dto.branchId))
        throw new ForbiddenException('You cannot assign patient to a branch you are not assigned to');
    }
    return this.service.update(clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('patient.delete')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }

  // ── Bulk duplicate cleanup ──────────────────────────────────────────────
  // Finds patients that match on OPD number, or on name + phone (both
  // case-insensitive), and merges each duplicate set down to one record.
  // GET first with ?dryRun=true (or just call findDuplicates) to preview.
  @Get('duplicates/find')
  @RequirePermissions('patient.delete')
  findDuplicates(@Request() req) {
    return this.service.mergeAllDuplicates(req.user.clinicId, true);
  }

  @Post('duplicates/merge')
  @RequirePermissions('patient.delete')
  mergeDuplicates(@Request() req, @Query('dryRun') dryRun?: string) {
    return this.service.mergeAllDuplicates(req.user.clinicId, dryRun === 'true');
  }
}