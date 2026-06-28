import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AttendanceService } from './attendance.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Post('check-in')
  @RequirePermissions('attendance.view')
  checkIn(@Request() req: any) {
    return this.svc.checkIn(req.user.clinicId, req.user.id, req.user.branchId);
  }

  @Post('check-out')
  @RequirePermissions('attendance.view')
  checkOut(@Request() req: any) {
    return this.svc.checkOut(req.user.clinicId, req.user.id);
  }

  @Get('today')
  @RequirePermissions('attendance.view')
  today(@Request() req: any) {
    return this.svc.getTodayStatus(req.user.clinicId, req.user.id);
  }

  // Must be before @Get() to avoid ':id' collision
  @Get('monthly-summary')
  @RequirePermissions('attendance.view')
  monthlySummary(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.svc.getMonthlySummary(
      req.user.clinicId,
      +year  || new Date().getFullYear(),
      +month || new Date().getMonth() + 1,
    );
  }

  @Get('export')
  @RequirePermissions('attendance.view')
  async exportCsv(@Request() req: any, @Query() q: any, @Res() res: Response) {
    const data = await this.svc.findAll(req.user.clinicId, { ...q, limit: 10000 });
    const rows: any[] = (data as any).data ?? data ?? [];
    const headers = ['Date', 'User', 'Status', 'Check In', 'Check Out', 'Notes'];
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => [
        r.date,
        `"${((r.user?.firstName || '') + ' ' + (r.user?.lastName || '')).trim()}"`,
        r.status,
        r.checkIn  || '',
        r.checkOut || '',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    res.send(csv);
  }

  @Get()
  @RequirePermissions('attendance.view')
  findAll(@Request() req: any, @Query() q: any) {
    return this.svc.findAll(req.user.clinicId, q);
  }

  @Patch(':id/override')
  @RequirePermissions('attendance.manage')
  adminOverride(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.adminOverride(req.user.clinicId, id, dto);
  }
}