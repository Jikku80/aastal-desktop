import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { RbacService } from './rbac.service';
import {
  CreateRoleDto, UpdateRoleDto, SetRolePermissionsDto,
  TogglePermissionDto, AssignRolesToUserDto,
} from './dto/rbac.dto';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rbac')
export class RbacController {
  constructor(private rbac: RbacService) {}

  /** GET /rbac/me/permissions — current user's flat permission list (called after login) */
  @Get('me/permissions')
  async getMyPermissions(@Request() req: any) {
    const keys = await this.rbac.resolvePermissionsForUser(req.user.id, req.user.role);
    return { permissions: keys };
  }

  /** GET /rbac/permissions — all system permission definitions */
  @Get('permissions')
  @RequirePermissions('roles.view')
  getAllPermissions() {
    return this.rbac.findAllPermissions();
  }

  /** GET /rbac/roles */
  @Get('roles')
  @RequirePermissions('roles.view')
  getRoles(@Request() req: any) {
    return this.rbac.findAllRoles(req.user.clinicId);
  }

  /** GET /rbac/roles/:id */
  @Get('roles/:id')
  @RequirePermissions('roles.view')
  getRole(@Param('id') id: string, @Request() req: any) {
    return this.rbac.findRole(id, req.user.clinicId);
  }

  /** POST /rbac/roles */
  @Post('roles')
  @RequirePermissions('roles.manage')
  createRole(@Body() dto: CreateRoleDto, @Request() req: any) {
    return this.rbac.createRole(dto, req.user.clinicId);
  }

  /** PUT /rbac/roles/:id */
  @Put('roles/:id')
  @RequirePermissions('roles.manage')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Request() req: any) {
    return this.rbac.updateRole(id, dto, req.user.clinicId);
  }

  /** DELETE /rbac/roles/:id */
  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('roles.manage')
  deleteRole(@Param('id') id: string, @Request() req: any) {
    return this.rbac.deleteRole(id, req.user.clinicId);
  }

  /** PUT /rbac/roles/:id/permissions — full permission replacement */
  @Put('roles/:id/permissions')
  @RequirePermissions('roles.manage')
  setRolePermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto, @Request() req: any) {
    return this.rbac.setRolePermissions(id, dto, req.user.clinicId);
  }

  /** PATCH /rbac/roles/:id/permissions/toggle — toggle one permission */
  @Patch('roles/:id/permissions/toggle')
  @RequirePermissions('roles.manage')
  togglePermission(@Param('id') id: string, @Body() dto: TogglePermissionDto, @Request() req: any) {
    return this.rbac.toggleRolePermission(id, dto, req.user.clinicId);
  }

  /** GET /rbac/users/:userId/roles */
  @Get('users/:userId/roles')
  @RequirePermissions('staff.view')
  getUserRoles(@Param('userId') userId: string) {
    return this.rbac.getUserRoles(userId);
  }

  /** PUT /rbac/users/:userId/roles — full role replacement for a user */
  @Put('users/:userId/roles')
  @RequirePermissions('staff.manage')
  assignRoles(@Param('userId') userId: string, @Body() dto: AssignRolesToUserDto, @Request() req: any) {
    return this.rbac.assignRolesToUser(userId, dto, req.user.clinicId, req.user.role);
  }
}
