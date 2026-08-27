import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { CreateMedicineBatchDto, UpdateMedicineBatchDto, DispenseBatchDto, DisposeBatchDto } from './dto/medicine-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { BranchesService } from '../branch/branch.service';
import { BatchStatus } from './entities/medicine-batch.entity';

/**
 * Mirrors the branch-scoping pattern used by LabWorkController: owners /
 * branch.manage holders see everything, everyone else is restricted to
 * their assigned branches via the existing BranchesService — no new access
 * model introduced (section 1/15).
 */
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('pharmacy/batches')
export class PharmacyController {
  constructor(
    private readonly svc: PharmacyService,
    private readonly branchesService: BranchesService,
  ) {}

  private async resolveBranchIds(req: any): Promise<string[] | undefined> {
    const { id: userId, clinicId } = req.user;
    const perms: Set<string> = req.user._permissions;
    const isOwner = perms.has('*') || perms.has('branch.manage') || perms.has('pharmacy.view_all_branches');
    if (isOwner) return undefined;
    const ids = await this.branchesService.getAccessibleBranchIds(clinicId, userId, req.user.role);
    if (!ids.length) throw new ForbiddenException('You are not assigned to any branch');
    return ids;
  }

  @Post()
  @RequirePermissions('pharmacy.manage_batches')
  async create(@Request() req: any, @Body() dto: CreateMedicineBatchDto) {
    const accessible = await this.resolveBranchIds(req);
    if (accessible && dto.branchId && !accessible.includes(dto.branchId)) {
      throw new ForbiddenException('You do not have access to that branch');
    }
    if (accessible && !dto.branchId) dto.branchId = accessible[0];
    return this.svc.createBatch(req.user.clinicId, dto, req.user.id);
  }

  @Get()
  @RequirePermissions('pharmacy.view')
  async findAll(@Request() req: any, @Query() query: any) {
    const accessible = await this.resolveBranchIds(req);
    return this.svc.findAll(req.user.clinicId, {
      productId: query.productId,
      branchId: query.branchId,
      branchIds: !query.branchId ? accessible : undefined,
      status: query.status as BatchStatus,
      expiringWithinDays: query.expiringWithinDays !== undefined ? Number(query.expiringWithinDays) : undefined,
      page: query.page, limit: query.limit,
    });
  }

  @Get('usable-stock/:productId')
  @RequirePermissions('pharmacy.view')
  async usableStock(@Request() req: any, @Param('productId') productId: string, @Query('branchId') branchId?: string) {
    const usableStock = await this.svc.getUsableStock(req.user.clinicId, productId, branchId);
    return { productId, branchId: branchId ?? null, usableStock };
  }

  @Get('eligible/:productId')
  @RequirePermissions('pharmacy.view')
  async eligible(@Request() req: any, @Param('productId') productId: string, @Query('branchId') branchId?: string) {
    return this.svc.getEligibleBatches(req.user.clinicId, productId, branchId);
  }

  // ── Reporting (section 14) ────────────────────────────────────────────────
  // Registered before the ':id' route below so 'reports/expiry' etc. don't
  // get swallowed as a batch id.

  /** Resolves the branchIds filter for a report request: honours an explicit ?branchId, but only within what the user is allowed to see. */
  private async resolveReportBranchIds(req: any, branchId?: string): Promise<string[] | undefined> {
    const accessible = await this.resolveBranchIds(req);
    if (!branchId) return accessible;
    if (accessible && !accessible.includes(branchId)) {
      throw new ForbiddenException('You do not have access to that branch');
    }
    return [branchId];
  }

  @Get('reports/expiry')
  @RequirePermissions('pharmacy.view_expiry')
  async expiryReport(@Request() req: any, @Query('branchId') branchId?: string) {
    return this.svc.getExpiryReport(req.user.clinicId, await this.resolveReportBranchIds(req, branchId));
  }

  @Get('reports/expired')
  @RequirePermissions('pharmacy.view_expiry')
  async expiredStockReport(@Request() req: any, @Query('branchId') branchId?: string) {
    return this.svc.getExpiredStockReport(req.user.clinicId, await this.resolveReportBranchIds(req, branchId));
  }

  @Get('reports/near-expiry')
  @RequirePermissions('pharmacy.view_expiry')
  async nearExpiryReport(
    @Request() req: any,
    @Query('days') days: string = '30',
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.getNearExpiryReport(req.user.clinicId, Number(days), await this.resolveReportBranchIds(req, branchId));
  }

  @Get('reports/branch-comparison')
  @RequirePermissions('pharmacy.view_expiry')
  async branchComparison(@Request() req: any) {
    const accessible = await this.resolveBranchIds(req);
    return this.svc.getBranchComparison(req.user.clinicId, accessible);
  }

  @Get(':id')
  @RequirePermissions('pharmacy.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('pharmacy.manage_batches')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateMedicineBatchDto) {
    if (dto.branchId) {
      const accessible = await this.resolveBranchIds(req);
      if (accessible && !accessible.includes(dto.branchId)) {
        throw new ForbiddenException('You do not have access to that branch');
      }
    }
    return this.svc.update(req.user.clinicId, id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('pharmacy.manage_batches')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id, req.user.id);
  }

  @Post('dispense')
  @RequirePermissions('pharmacy.dispense')
  async dispense(@Request() req: any, @Body() dto: DispenseBatchDto) {
    if (dto.batchId) {
      const perms: Set<string> = req.user._permissions;
      if (!perms.has('*') && !perms.has('pharmacy.manual_batch_selection')) {
        throw new ForbiddenException('Manual batch selection requires the pharmacy.manual_batch_selection permission');
      }
    }
    return this.svc.dispense(req.user.clinicId, dto, req.user.id);
  }

  @Post('plan-fefo/:productId')
  @RequirePermissions('pharmacy.dispense')
  async planFefo(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body('quantity') quantity: number,
    @Body('branchId') branchId?: string,
  ) {
    return this.svc.planFefoAllocation(req.user.clinicId, productId, quantity, branchId);
  }

  // ── Expired stock disposal (section 9) ───────────────────────────────────

  @Post(':id/dispose')
  @RequirePermissions('pharmacy.manage_expired_stock')
  async dispose(@Request() req: any, @Param('id') id: string, @Body() dto: DisposeBatchDto) {
    return this.svc.disposeBatch(req.user.clinicId, id, dto, req.user.id);
  }
}
