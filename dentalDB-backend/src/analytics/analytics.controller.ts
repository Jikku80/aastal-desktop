import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('revenue-forecast')
  @RequirePermissions('reports.view')
  getRevenueForecast(@Request() req: any, @Query() query: any) {
    return this.service.getMonthlyRevenueForecast(req.user.clinicId, query);
  }

  @Get('dashboard')
  @RequirePermissions('dashboard.view')
  getDashboard(
    @Request() req: any,
    @Query('branchId') branchId?: string,
    @Query('calendarType') calendarType?: string,
  ) {
    return this.service.getDashboard(req.user.clinicId, branchId, calendarType || 'BS');
  }

  @Get('appointments')
  @RequirePermissions('analytics.view')
  getAppointmentStats(@Request() req: any, @Query() query: any) {
    return this.service.getAppointmentStats(req.user.clinicId, query);
  }

  @Get('profit-loss')
  @RequirePermissions('reports.view')
  getProfitLoss(@Request() req: any, @Query() query: any) {
    return this.service.getProfitLoss(req.user.clinicId, query);
  }

  @Get('cash-flow')
  @RequirePermissions('reports.view')
  getCashFlow(@Request() req: any, @Query() query: any) {
    return this.service.getCashFlow(req.user.clinicId, query);
  }

  @Get('revenue-by-doctor')
  @RequirePermissions('reports.view')
  getRevenueByDoctor(@Request() req: any, @Query() query: any) {
    return this.service.getRevenueByDoctor(req.user.clinicId, query);
  }

  @Get('revenue-by-service')
  @RequirePermissions('reports.view')
  getRevenueByService(@Request() req: any, @Query() query: any) {
    return this.service.getRevenueByService(req.user.clinicId, query);
  }

  @Get('outstanding-receivables')
  @RequirePermissions('reports.view')
  getOutstandingReceivables(@Request() req: any, @Query('branchId') branchId?: string) {
    return this.service.getOutstandingReceivables(req.user.clinicId, branchId);
  }

  @Get('branch-performance')
  @RequirePermissions('reports.view')
  getBranchPerformance(@Request() req: any, @Query() query: any) {
    return this.service.getBranchPerformance(req.user.clinicId, query);
  }

  @Get('tax-report')
  @RequirePermissions('reports.view')
  getTaxReport(@Request() req: any, @Query() query: any) {
    return this.service.getTaxReport(req.user.clinicId, query);
  }
}