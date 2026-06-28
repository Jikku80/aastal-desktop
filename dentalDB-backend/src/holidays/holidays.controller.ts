import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@ApiTags('Holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('holidays')
export class HolidaysController {
  constructor(private service: HolidaysService) {}

  @Post()
  @RequirePermissions('holiday.manage')
  create(@Request() req, @Body() dto: CreateHolidayDto) {
    return this.service.create(req.user.clinicId, req.user.id, dto);
  }

  @Get()
  @RequirePermissions('holiday.view')
  findAll(@Request() req, @Query('branchId') branchId?: string) {
    const isManager = req.user._permissions?.has?.('*') || req.user._permissions?.has?.('holiday.manage');
    return this.service.findAll(
      req.user.clinicId, branchId,
      isManager ? undefined : req.user.id,
      isManager ? undefined : req.user.role,
    );
  }

  @Get(':id')
  @RequirePermissions('holiday.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('holiday.manage')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.service.update(req.user.clinicId, id, req.user.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('holiday.manage')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id, req.user.id);
  }
}
