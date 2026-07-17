// dentalDB-backend/src/seo/blog-admin.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { BlogService, CreateBlogPostDto, UpdateBlogPostDto } from './blog.service';
import { SeoService } from './seo.service';
import { BlogStatus } from './entities/blog-post.entity';

@ApiTags('Blog (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('blog')
export class BlogAdminController {
  constructor(
    private readonly blogService: BlogService,
    private readonly seoService:  SeoService,
  ) {}

  // GET /blog
  @Get()
  @RequirePermissions('website.view')
  findAll(
    @Request() req: any,
    @Query('status')   status?:   BlogStatus,
    @Query('category') category?: string,
    @Query('tag')      tag?:      string,
    @Query('author')   author?:   string,
    @Query('q')        q?:        string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    return this.blogService.findAll(req.user.clinicId, {
      status,
      category,
      tag,
      author,
      q,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // GET /blog/seo-health
  @Get('seo-health')
  @RequirePermissions('website.view')
  getSeoHealth(@Request() req: any) {
    return this.seoService.auditSeoHealth(req.user.clinicId);
  }

  // GET /blog/categories
  @Get('categories')
  @RequirePermissions('website.view')
  getCategories(@Request() req: any) {
    return this.blogService.getCategories(req.user.clinicId);
  }

  // GET /blog/tags
  @Get('tags')
  @RequirePermissions('website.view')
  getTags(@Request() req: any) {
    return this.blogService.getTags(req.user.clinicId);
  }

  // GET /blog/:id
  @Get(':id')
  @RequirePermissions('website.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.blogService.findOne(req.user.clinicId, id);
  }

  // GET /blog/:id/link-suggestions
  @Get(':id/link-suggestions')
  @RequirePermissions('website.view')
  async getInternalLinkSuggestions(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const post = await this.blogService.findOne(req.user.clinicId, id);
    return this.blogService.getInternalLinkSuggestions(req.user.clinicId, {
      id:      post.id,
      content: post.content ?? '',
      tags:    post.tags,
    });
  }

  // POST /blog
  @Post()
  @RequirePermissions('website.manage')
  create(@Request() req: any, @Body() dto: CreateBlogPostDto) {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    return this.blogService.create(req.user.clinicId, dto);
  }

  // PATCH /blog/:id
  @Patch(':id')
  @RequirePermissions('website.manage')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogService.update(req.user.clinicId, id, dto);
  }

  // DELETE /blog/:id
  @Delete(':id')
  @RequirePermissions('website.manage')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.blogService.remove(req.user.clinicId, id);
  }
}