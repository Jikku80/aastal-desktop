import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { LeaveService } from './leave.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly svc: LeaveService) {}

  @Post()
  apply(@Request() req: any, @Body() dto: any) {
    return this.svc.apply(req.user.clinicId, req.user.id, dto);
  }

  @Get()
  @RequirePermissions('leave.view')
  findAll(@Request() req: any, @Query() q: any) {
    return this.svc.findAll(req.user.clinicId, q);
  }

  @Patch(':id/approve')
  @RequirePermissions('leave.manage')
  approve(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.approve(req.user.clinicId, id, req.user.id, body.note);
  }

  @Patch(':id/reject')
  @RequirePermissions('leave.manage')
  reject(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.reject(req.user.clinicId, id, req.user.id, body.note);
  }

  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.svc.cancel(req.user.clinicId, id, req.user.id);
  }
}
