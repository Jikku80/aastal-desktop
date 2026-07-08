import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Request, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { v4 as uuid } from 'uuid';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BranchLockGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  /** Self-service: get my profile (no permission needed beyond being logged in) */
  @Get('me')
  getMe(@Request() req) {
    return this.service.findOne(req.user.clinicId, req.user.id);
  }

  /** Self-service: update own profile */
  @Patch('me')
  updateMe(@Request() req, @Body() dto: any) {
    const allowed = ['firstName', 'lastName', 'phone'];
    const safe: any = {};
    for (const k of allowed) if (dto[k] !== undefined) safe[k] = dto[k];
    return this.service.update(req.user.clinicId, req.user.id, safe);
  }

  /** Self-service: upload avatar */
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: join(UPLOADS_DIR, 'avatars'),
      filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /\.(jpg|jpeg|png|webp)$/i.test(extname(file.originalname));
      cb(ok ? null : new Error('Only image files allowed'), ok);
    },
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    await this.service.update(req.user.clinicId, req.user.id, { avatar: avatarUrl });
    return { avatarUrl };
  }

  /** Self-service: upload personal signature */
  @Post('me/signature')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(UPLOADS_DIR, 'signatures'),
      filename: (_req, file, cb) => cb(null, `sig-${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /\.(jpg|jpeg|png|webp|svg)$/i.test(extname(file.originalname));
      cb(ok ? null : new Error('Only image files allowed'), ok);
    },
  }))
  async uploadSignature(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const signatureUrl = `/uploads/signatures/${file.filename}`;
    await this.service.update(req.user.clinicId, req.user.id, { signatureUrl });
    return { signatureUrl };
  }

  /** Admin: upload signature for a specific staff member */
  @Post(':id/signature')
  @RequirePermissions('staff.manage')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(UPLOADS_DIR, 'signatures'),
      filename: (_req, file, cb) => cb(null, `sig-${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /\.(jpg|jpeg|png|webp|svg)$/i.test(extname(file.originalname));
      cb(ok ? null : new Error('Only image files allowed'), ok);
    },
  }))
  async uploadStaffSignature(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const signatureUrl = `/uploads/signatures/${file.filename}`;
    await this.service.update(req.user.clinicId, id, { signatureUrl });
    return { signatureUrl };
  }

  @Get('staff')
  @RequirePermissions('staff.view')
  listStaff(@Request() req, @Query() query: any) {
    return this.service.findStaff(req.user.clinicId, query);
  }

  // ⚠️ IMPORTANT: Static routes MUST come before :id param routes in NestJS.
  // 'dentists/:id/performance' and 'admin/dentists/performance' were previously
  // declared after ':id' and were being swallowed by the generic param handler.

  @Get('admin/dentists/performance')
  @RequirePermissions('analytics.view')
  getAdminDentistPerformance(@Request() req) {
    return this.service.getAdminDentistPerformance(req.user.clinicId);
  }

  @Get('dentists/:id/performance')
  @RequirePermissions('analytics.view')
  getDentistPerformance(@Request() req, @Param('id') id: string) {
    return this.service.getDentistPerformance(req.user.clinicId, id);
  }

  @Get(':id')
  @RequirePermissions('staff.view')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Post()
  @RequirePermissions('staff.manage')
  create(@Request() req, @Body() dto: any) {
    return this.service.create(req.user.clinicId, dto);
  }

  @Patch(':id')
  @RequirePermissions('staff.manage')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('staff.manage')
  deactivate(@Request() req, @Param('id') id: string) {
    return this.service.deactivate(req.user.clinicId, id);
  }

  @Patch(':id/reactivate')
  @RequirePermissions('staff.manage')
  reactivate(@Request() req, @Param('id') id: string) {
    return this.service.reactivate(req.user.clinicId, id);
  }

  @Delete(':id')
  @RequirePermissions('staff.manage')
  deleteStaff(@Request() req, @Param('id') id: string) {
    return this.service.deleteStaff(req.user.clinicId, id);
  }
}