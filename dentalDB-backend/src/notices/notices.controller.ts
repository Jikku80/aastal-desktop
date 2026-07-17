import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Request, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { NoticesService } from './notices.service';
import { NoticeType, NoticeScope } from './entities/notice.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branch/entities/branch.entity';

@ApiTags('Notices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notices')
export class NoticesController {
  constructor(
    private readonly service: NoticesService,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
  ) {}

  /**
   * GET /notices
   * Returns notices filtered for the currently logged-in user.
   * Automatically applies branch filtering based on the user's branch assignments.
   * No specific permission required — every staff member should see notices
   * addressed to them.
   */
  @Get()
  async findMine(
    @Request() req: any,
    @Query('type') type?: NoticeType,
  ) {
    const { id: userId, clinicId } = req.user;

    // Get branches this user belongs to
    const branches = await this.branchRepo.find({
      where:     { clinicId },
      relations: ['staff'],
    });

    const userBranchIds = branches
      .filter(b => b.staff?.some(u => u.id === userId))
      .map(b => b.id);

    return this.service.findForUser(clinicId, userId, userBranchIds, req.user.role);
  }

  /**
   * GET /notices/all  (admin view — all notices unfiltered)
   */
  @Get('all')
  @RequirePermissions('notice.view')
  findAll(@Request() req: any, @Query('type') type?: NoticeType) {
    return this.service.findAll(req.user.clinicId, type);
  }

  /**
   * POST /notices
   * Create a notice or holiday with scope targeting
   */
  @Post()
  @RequirePermissions('notice.manage')
  create(@Request() req: any, @Body() dto: {
    type:             NoticeType;
    title:            string;
    description?:     string;
    startDate?:       string;
    endDate?:         string;
    scope:            NoticeScope;
    targetBranchIds?: string[];
    targetUserIds?:   string[];
    targetRoles?:     string[];
  }) {
    return this.service.create(req.user.clinicId, req.user.id, dto);
  }

  /**
   * PATCH /notices/:id
   */
  @Patch(':id')
  @RequirePermissions('notice.manage')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  /**
   * DELETE /notices/:id
   */
  @Delete(':id')
  @RequirePermissions('notice.manage')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }
}