import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly svc: CommissionsService) {}

  @Get()
  @RequirePermissions('analytics.view')
  getSummary(@Request() req: any, @Query() query: any) {
    return this.svc.getSummary(req.user.clinicId, query);
  }

  @Get('chart')
  @RequirePermissions('analytics.view')
  getMonthlyChart(@Request() req: any, @Query() query: any) {
    return this.svc.getMonthlyChart(req.user.clinicId, query);
  }
}