import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Req,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { DentalChartService } from './dental-chart.service';

@Controller('dental-chart')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DentalChartController {
  constructor(private readonly service: DentalChartService) {}

  /** GET /dental-chart/:patientId */
  @Get(':patientId')
  @RequirePermissions('records.view')
  async findOne(@Req() req: any, @Param('patientId') patientId: string) {
    const chart = await this.service.findByPatient(req.user.clinicId, patientId);
    if (!chart) return null;
    return chart;
  }

  /** POST /dental-chart/:patientId  — upsert full chart */
  @Post(':patientId')
  @RequirePermissions('records.update')
  @HttpCode(HttpStatus.OK)
  upsert(
    @Req() req: any,
    @Param('patientId') patientId: string,
    @Body() body: { teeth: Record<number, any>; history?: any[] },
  ) {
    return this.service.upsert(req.user.clinicId, patientId, body);
  }

  /** PUT /dental-chart/:patientId  — also upsert full chart */
  @Put(':patientId')
  @RequirePermissions('records.update')
  @HttpCode(HttpStatus.OK)
  upsertPut(
    @Req() req: any,
    @Param('patientId') patientId: string,
    @Body() body: { teeth: Record<number, any>; history?: any[] },
  ) {
    return this.service.upsert(req.user.clinicId, patientId, body);
  }

  /** PATCH /dental-chart/:patientId/tooth/:toothNumber — update a single tooth */
  @Patch(':patientId/tooth/:toothNumber')
  @RequirePermissions('records.update')
  updateTooth(
    @Req() req: any,
    @Param('patientId') patientId: string,
    @Param('toothNumber') toothNumber: string,
    @Body() body: { state: any; historyEntry?: any },
  ) {
    return this.service.updateTooth(
      req.user.clinicId,
      patientId,
      parseInt(toothNumber, 10),
      body.state,
      body.historyEntry,
    );
  }

  /** DELETE /dental-chart/:patientId */
  @Delete(':patientId')
  @RequirePermissions('records.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('patientId') patientId: string) {
    return this.service.remove(req.user.clinicId, patientId);
  }
}