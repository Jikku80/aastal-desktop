import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service';
import { CreateTreatmentPlanDto, UpdateTreatmentPlanStatusDto } from './dto/treatment-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly svc: TreatmentPlansService) {}

  @Post()
  @RequirePermissions('records.create')
  create(@Request() req: any, @Body() dto: CreateTreatmentPlanDto) {
    return this.svc.create(req.user.clinicId, req.user.id, dto);
  }

  @Get()
  @RequirePermissions('records.view')
  findAll(@Request() req: any, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
  }

  @Get(':id')
  @RequirePermissions('records.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id/status')
  @RequirePermissions('records.update')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTreatmentPlanStatusDto) {
    return this.svc.updateStatus(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('records.delete')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }
}
