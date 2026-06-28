import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

const ALLOWED_ROLES: UserRole[] = [
  UserRole.DOCTOR,
  UserRole.DENTIST,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
];

/**
 * DoctorRoleGuard — must be applied after JwtAuthGuard so that req.user is populated.
 * Rejects any user whose role is not in the allowed doctor roles.
 */
@Injectable()
export class DoctorRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req  = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new ForbiddenException('Unauthenticated');

    if (!ALLOWED_ROLES.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        'This portal is for doctors only. Please use the patient portal.',
      );
    }

    return true;
  }
}
