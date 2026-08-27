import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { LabServiceCatalogService } from './lab-service.service';
import { CreateLabServiceDto, UpdateLabServiceDto } from './dto/lab-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

/**
 * Clinic-wide lab service catalog — not branch-locked (like Inventory's
 * product catalog), since the list of tests a clinic runs is a tenant-level
 * configuration, not a per-branch one. Individual lab orders (LabWorkController)
 * remain branch-scoped as before.
 */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lab-catalog')
export class LabServiceController {
  constructor(private readonly svc: LabServiceCatalogService) {}

  @Post()
  @RequirePermissions('lab.manage_services')
  create(@Request() req, @Body() dto: CreateLabServiceDto) {
    return this.svc.create(req.user.clinicId, dto);
  }

  @Get()
  @RequirePermissions('lab.view')
  findAll(@Request() req, @Query('includeInactive') includeInactive?: string,
          @Query('category') category?: string, @Query('search') search?: string) {
    return this.svc.findAll(req.user.clinicId, {
      includeInactive: includeInactive === 'true',
      category,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('lab.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('lab.manage_services')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateLabServiceDto) {
    return this.svc.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('lab.manage_services')
  remove(@Request() req, @Param('id') id: string) {
    // Soft-delete (deactivate) — see LabServiceCatalogService.remove().
    return this.svc.remove(req.user.clinicId, id);
  }
}