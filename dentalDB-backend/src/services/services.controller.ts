import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Post()
  @RequirePermissions('services.manage')
  create(@Request() req: any, @Body() dto: CreateServiceDto) {
    return this.svc.create(req.user.clinicId, dto);
  }

  @Get()
  @RequirePermissions('services.view')
  findAll(@Request() req: any, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
  }

  @Get(':id')
  @RequirePermissions('services.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('services.manage')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.svc.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('services.manage')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }
}