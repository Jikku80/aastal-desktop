import { Controller, Get, Patch, Param, Request, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@Request() req, @Query('limit') limit?: number, @Query('branchId') branchId?: string) {
    const effectiveBranchId = branchId ?? req.user.branchId;
    return this.service.findForUser(req.user.clinicId, req.user.id, limit ? +limit : 30, effectiveBranchId);
  }

  @Get('unread-count')
  unreadCount(@Request() req, @Query('branchId') branchId?: string) {
    const effectiveBranchId = branchId ?? req.user.branchId;
    return this.service.getUnreadCount(req.user.clinicId, req.user.id, effectiveBranchId);
  }

  @Patch(':id/read')
  markRead(@Request() req, @Param('id') id: string) {
    return this.service.markRead(req.user.clinicId, id);
  }

  @Patch('read-all')
  markAllRead(@Request() req, @Query('branchId') branchId?: string) {
    const effectiveBranchId = branchId ?? req.user.branchId;
    return this.service.markAllRead(req.user.clinicId, req.user.id, effectiveBranchId);
  }
}
