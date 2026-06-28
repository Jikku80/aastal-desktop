import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { ClinicalRecordsService } from './clinical-records.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { CreateClinicalRecordDto, UpdateClinicalRecordDto } from './dto/clinical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, BranchLockGuard)
@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(private readonly svc: ClinicalRecordsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateClinicalRecordDto) {
    return this.svc.create(req.user.clinicId, dto);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateClinicalRecordDto) {
    return this.svc.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }
}
