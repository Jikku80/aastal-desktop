import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Role hierarchy — owner has all permissions
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(UserRole),
  [UserRole.OWNER]:        [UserRole.OWNER, UserRole.DENTIST, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, UserRole.STAFF],
  [UserRole.DENTIST]:      [UserRole.DENTIST],
  [UserRole.DOCTOR]:       [UserRole.DOCTOR],
  [UserRole.RECEPTIONIST]: [UserRole.RECEPTIONIST],
  [UserRole.ACCOUNTANT]:   [UserRole.ACCOUNTANT],
  [UserRole.STAFF]:        [UserRole.STAFF],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return false;

    const userRoles = ROLE_HIERARCHY[user.role] || [user.role];
    const hasRole = required.some(r => userRoles.includes(r));
    if (!hasRole) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}