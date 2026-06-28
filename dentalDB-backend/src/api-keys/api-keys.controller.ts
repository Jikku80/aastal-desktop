import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @ApiOperation({ summary: 'Get API key stats for the clinic' })
  @Get('stats')
  getStats(@Request() req) {
    return this.service.getStats(req.user.clinicId);
  }

  @ApiOperation({ summary: 'List all API keys for the clinic (key hash never returned)' })
  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.clinicId);
  }

  @ApiOperation({ summary: 'Create a new API key — raw key returned ONCE' })
  @Post()
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  create(@Request() req, @Body() dto: CreateApiKeyDto) {
    return this.service.create(req.user.clinicId, dto);
  }

  @ApiOperation({ summary: 'Update API key name / IP allowlist / expiry' })
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  @ApiOperation({ summary: 'Revoke an API key (keeps record, marks as revoked)' })
  @Post(':id/revoke')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  revoke(@Request() req, @Param('id') id: string) {
    return this.service.revoke(req.user.clinicId, id);
  }

  @ApiOperation({ summary: 'Permanently delete an API key' })
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }
}
