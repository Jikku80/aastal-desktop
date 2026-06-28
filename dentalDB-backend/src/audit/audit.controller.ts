import { Controller, Get, Query, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query() query: {
      userId?: string;
      entityType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { role, clinicId } = req.user;
    if (role !== UserRole.OWNER && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only owners can access audit logs');
    }
    return this.auditService.findAll(clinicId, query);
  }
}
