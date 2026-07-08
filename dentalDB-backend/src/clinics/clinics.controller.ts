import {
  Controller, Get, Patch, Post, Param, Body, Request, UseGuards,
  UploadedFile, UseInterceptors, ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PatientsService } from '../patients/patients.service';

@ApiTags('Clinics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinics')
export class ClinicsController {
  constructor(
    private service: ClinicsService,
    private patientsService: PatientsService,
  ) {}

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

  @Post('me/logo')
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: join(UPLOADS_DIR, 'logos'),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  async uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const logoUrl = `/uploads/logos/${file.filename}`;
    const clinic = await this.service.update(req.user.clinicId, { logo: logoUrl } as any);
    return { logo: clinic.logo };
  }

  /**
   * POST /clinics/:clinicId/patients/merge
   * Clinic-admin tool for fixing accidental duplicate Patient rows (e.g.
   * the same person registered twice with a slightly different phone or
   * email). `:clinicId` must match the caller's own clinic — this never
   * merges across clinics.
   */
  @Post(':clinicId/patients/merge')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('patient.merge')
  mergePatients(
    @Request() req,
    @Param('clinicId') clinicId: string,
    @Body() dto: { keepId: string; mergeId: string },
  ) {
    if (clinicId !== req.user.clinicId) {
      throw new ForbiddenException('Cannot merge patients in another clinic.');
    }
    return this.patientsService.merge(clinicId, dto.keepId, dto.mergeId);
  }
}
