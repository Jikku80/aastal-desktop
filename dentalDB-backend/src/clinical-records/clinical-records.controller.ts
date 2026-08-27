import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { ClinicalRecordsService } from './clinical-records.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { CreateClinicalRecordDto, UpdateClinicalRecordDto, UpsertClinicalRecordFromBillingDto } from './dto/clinical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchesService } from '../branch/branch.service';

@UseGuards(JwtAuthGuard, BranchLockGuard, PermissionsGuard)
@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(
    private readonly svc: ClinicalRecordsService,
    private readonly branchesService: BranchesService,
  ) {}

  @Post()
  @RequirePermissions('records.create')
  async create(@Request() req: any, @Body() dto: CreateClinicalRecordDto) {
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

  // Called by the Billing modal right after an invoice is created — creates
  // or updates (appends a dated visit to) the patient's clinical record.
  // No-ops (returns null) when the invoice had no services, by design.
  @Post('upsert-from-billing')
  @RequirePermissions('records.create')
  upsertFromBilling(@Request() req: any, @Body() dto: UpsertClinicalRecordFromBillingDto) {
    return this.svc.upsertFromBilling(req.user.clinicId, dto);
  }

  // Pharmacy fulfillment queue (Phase 3, section 13) — prescriptions linked
  // to a pharmacy Product that still have quantity outstanding. Registered
  // ahead of the ':id' route below so it isn't swallowed as a record id.
  // Gated on pharmacy.dispense (not records.view) since this is meant for
  // pharmacy/dispensing staff, who may not otherwise have chart access.
  @Get('prescriptions/pending-dispensing')
  @RequirePermissions('pharmacy.dispense')
  async pendingDispensing(@Request() req: any, @Query('branchId') branchId?: string) {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage');

    let branchIds: string[] | undefined;
    if (branchId) {
      branchIds = [branchId];
    } else if (!isOwner) {
      branchIds = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
    }
    return this.svc.findPendingDispensing(clinicId, branchIds);
  }

  @Get()
  @RequirePermissions('records.view')
  async findAll(@Request() req: any, @Query() query: any) {
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

  @Get(':id')
  @RequirePermissions('records.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('records.update')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateClinicalRecordDto) {
    return this.svc.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('records.delete')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }
}