import { Controller, Get, Post, Delete, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}

  @Get()
  getCurrent(@Request() req) {
    return this.service.getCurrent(req.user.clinicId);
  }

  @Get('plans')
  getPlans() {
    return this.service.getPlans();
  }

  @Post('upgrade')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  upgrade(@Request() req, @Body() dto: any) {
    return this.service.upgradePlan(req.user.clinicId, dto);
  }

  @Post('renew')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  renew(@Request() req) {
    return this.service.renewSubscription(req.user.clinicId);
  }

  @Delete('cancel')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  cancel(@Request() req) {
    return this.service.cancelSubscription(req.user.clinicId);
  }
}
