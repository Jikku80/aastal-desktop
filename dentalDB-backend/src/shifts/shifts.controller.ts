import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ShiftsService }  from './shifts.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { ShiftResolver }  from './shift-resolver.service';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly svc:      ShiftsService,
    private readonly resolver: ShiftResolver,
  ) {}

  @Post()
  @RequirePermissions('shift.manage')
  createShift(@Request() req: any, @Body() dto: any) {
    return this.svc.createShift(req.user.clinicId, dto);
  }

  @Get()
  @RequirePermissions('shift.view')
  listShifts(@Request() req: any) {
    return this.svc.findAllShifts(req.user.clinicId);
  }

  @Get(':id')
  @RequirePermissions('shift.view')
  getShift(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOneShift(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('shift.manage')
  updateShift(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateShift(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('shift.manage')
  deleteShift(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteShift(req.user.clinicId, id);
  }

  @Get('patterns/users/:userId')
  @RequirePermissions('shift.view')
  getWeeklySchedule(@Request() req: any, @Param('userId') userId: string) {
    return this.svc.getWeeklySchedule(req.user.clinicId, userId);
  }

  @Get('patterns/me')
  @RequirePermissions('shift.view')
  getMySchedule(@Request() req: any) {
    return this.svc.getWeeklySchedule(req.user.clinicId, req.user.id);
  }

  @Post('patterns')
  @RequirePermissions('shift.manage')
  upsertPattern(@Request() req: any, @Body() dto: any) {
    return this.svc.upsertPattern(req.user.clinicId, dto);
  }

  @Delete('patterns/:id')
  @RequirePermissions('shift.manage')
  deletePattern(@Request() req: any, @Param('id') id: string) {
    return this.svc.deletePattern(req.user.clinicId, id);
  }

  @Get('assignments/users/:userId')
  @RequirePermissions('shift.view')
  getUserAssignments(
    @Request() req: any,
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.getUserAssignments(req.user.clinicId, userId, startDate, endDate);
  }

  @Post('assignments')
  @RequirePermissions('shift.manage')
  upsertAssignment(@Request() req: any, @Body() dto: any) {
    return this.svc.upsertAssignment(req.user.clinicId, dto);
  }

  @Delete('assignments/:id')
  @RequirePermissions('shift.manage')
  deleteAssignment(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteAssignment(req.user.clinicId, id);
  }

  @Get('resolve')
  @RequirePermissions('shift.view')
  resolve(@Request() req: any, @Query('userId') userId: string, @Query('date') date: string) {
    return this.resolver.resolveUserShift(
      userId || req.user.id,
      req.user.clinicId,
      date || new Date().toISOString().slice(0, 10),
    );
  }
}
