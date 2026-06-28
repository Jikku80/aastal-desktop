import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';

@Injectable()
export class ClinicsService {
  constructor(@InjectRepository(Clinic) private repo: Repository<Clinic>) {}

  async findById(id: string): Promise<Clinic> {
    const clinic = await this.repo.findOne({ where: { id } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async update(id: string, dto: Partial<Clinic>): Promise<Clinic> {
    await this.repo.update({ id }, dto);
    return this.findById(id);
  }

  async updateWorkingHours(id: string, workingHours: any): Promise<Clinic> {
    await this.repo.update({ id }, { workingHours });
    return this.findById(id);
  }
}

// ─── clinics.controller.ts ────────────────────────────────────────────────────
import { Controller, Get, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Clinics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinics')
export class ClinicsController {
  constructor(private service: ClinicsService) {}

  @Get('me')
  getMyClinic(@Request() req) {
    return this.service.findById(req.user.clinicId);
  }

  @Patch('me')
  update(@Request() req, @Body() dto: any) {
    return this.service.update(req.user.clinicId, dto);
  }

  @Patch('me/working-hours')
  updateWorkingHours(@Request() req, @Body() dto: any) {
    return this.service.updateWorkingHours(req.user.clinicId, dto);
  }
}
