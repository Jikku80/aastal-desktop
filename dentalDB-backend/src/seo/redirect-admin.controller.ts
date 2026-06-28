import {
  Controller, Get, Post, Delete,
  Body, Param, Request, UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RedirectService } from './redirect.service';

@ApiTags('SEO Redirects (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seo/redirects')
export class RedirectAdminController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get()
  list(@Request() req: any) {
    return this.redirectService.list(req.user.clinicId);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { fromPath: string; toPath: string; statusCode?: 301 | 302 },
  ) {
    if (!body.fromPath?.startsWith('/')) {
      throw new BadRequestException('fromPath must start with /');
    }
    if (!body.toPath?.trim()) {
      throw new BadRequestException('toPath is required');
    }
    if (body.fromPath === body.toPath) {
      throw new BadRequestException('fromPath and toPath must differ');
    }
    return this.redirectService.upsert(
      req.user.clinicId,
      body.fromPath,
      body.toPath,
      body.statusCode ?? 301,
    );
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.redirectService.remove(req.user.clinicId, id);
  }
}
