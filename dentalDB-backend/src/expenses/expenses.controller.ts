import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';
import { ApprovalStatus } from './entities/expense.entity';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private svc: ExpensesService) {}

  @Post()
  @RequirePermissions('expense.manage')
  create(@Request() req: any, @Body() dto: CreateExpenseDto) {
    return this.svc.create(req.user.clinicId, dto, req.user.id);
  }

  @Get()
  @RequirePermissions('expense.view')
  findAll(@Request() req: any, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
  }

  @Get('summary')
  @RequirePermissions('expense.view')
  getSummary(@Request() req: any, @Query() query: any) {
    return this.svc.getSummaryByCategory(req.user.clinicId, query);
  }

  @Get('monthly-trend')
  @RequirePermissions('expense.view')
  getMonthlyTrend(@Request() req: any, @Query() query: any) {
    return this.svc.getMonthlyTrend(req.user.clinicId, query);
  }

  @Get('vendors')
  @RequirePermissions('expense.view')
  listVendors(@Request() req: any, @Query() query: any) {
    return this.svc.listVendors(req.user.clinicId, query);
  }

  @Post('vendors')
  @RequirePermissions('expense.manage')
  createVendor(@Request() req: any, @Body() dto: CreateVendorDto) {
    return this.svc.createVendor(req.user.clinicId, dto);
  }

  @Patch('vendors/:id')
  @RequirePermissions('expense.manage')
  updateVendor(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.svc.updateVendor(req.user.clinicId, id, dto);
  }

  @Delete('vendors/:id')
  @RequirePermissions('expense.manage')
  deleteVendor(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteVendor(req.user.clinicId, id);
  }

  @Get(':id')
  @RequirePermissions('expense.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  @RequirePermissions('expense.manage')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.svc.update(req.user.clinicId, id, dto, req.user.id);
  }

  @Patch(':id/approve')
  @RequirePermissions('expense.approve')
  approve(@Request() req: any, @Param('id') id: string, @Body() body: { status: ApprovalStatus }) {
    return this.svc.approve(req.user.clinicId, id, req.user.id, body.status ?? ApprovalStatus.APPROVED);
  }

  @Delete(':id')
  @RequirePermissions('expense.manage')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user.clinicId, id, req.user.id);
  }
}