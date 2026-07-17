import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private service: BranchesService) {}

  @Get()
  @RequirePermissions('branch.view')
  findAll(@Request() req) {
    return this.service.findAll(req.user.clinicId);
  }

  @Get('my')
  async getMyBranches(@Request() req) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    if (perms.has('*') || perms.has('branch.manage'))
      return this.service.findAll(clinicId);
    return this.service.getUserBranches(clinicId, userId);
  }

  /**
   * Returns full quota + downgrade-selection status.
   * Source of truth for the frontend branch management screen.
   */
  @Get('quota-status')
  @RequirePermissions('branch.view')
  getQuotaStatus(@Request() req) {
    return this.service.getQuotaStatus(req.user.clinicId);
  }

  @Get(':id')
  @RequirePermissions('branch.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Get(':id/stats')
  @RequirePermissions('analytics.view')
  getBranchStats(@Request() req, @Param('id') id: string) {
    return this.service.getBranchStats(req.user.clinicId, id);
  }

  // Anyone who can create/view appointments needs this to populate the doctor
  // dropdown — it shouldn't require branch-management access. A role with
  // only appointment.create (e.g. a receptionist) was getting a silent 403
  // here, which the frontend was misreading as "no doctors assigned".
  @Get(':id/doctors')
  @RequirePermissions('branch.view', 'appointment.create', 'appointment.view')
  getBranchDoctors(@Request() req, @Param('id') id: string) {
    return this.service.getBranchDoctors(req.user.clinicId, id);
  }

  @Post()
  @RequirePermissions('branch.manage')
  create(@Request() req, @Body() dto: any) {
    return this.service.create(req.user.clinicId, dto);
  }

  /**
   * Confirm downgrade branch selection.
   * Body: { keepIds: string[] }
   * - keepIds must be ≤ plan quota
   * - selected → ACTIVE, unselected → INACTIVE (data preserved)
   * - Clears the pending DowngradeSelection record for this clinic
   */
  @Post('confirm-downgrade-selection')
  @RequirePermissions('branch.manage')
  confirmDowngradeSelection(@Request() req, @Body() body: { keepIds: string[] }) {
    return this.service.confirmDowngradeSelection(req.user.clinicId, body.keepIds ?? []);
  }

  @Patch(':id')
  @RequirePermissions('branch.manage')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('branch.manage')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }

  @Post(':id/staff/:userId')
  @RequirePermissions('branch.manage')
  assignStaff(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.assignStaff(req.user.clinicId, id, userId);
  }

  @Delete(':id/staff/:userId')
  @RequirePermissions('branch.manage')
  removeStaff(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeStaff(req.user.clinicId, id, userId);
  }
}