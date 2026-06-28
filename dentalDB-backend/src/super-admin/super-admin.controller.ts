import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import {
  SubscriptionRequestType,
} from '../subscriptions/entities/subscription-request.entity';
import { SubscriptionStatus } from '../subscriptions/entities/subscription.entity';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // ── Super Admin only routes ────────────────────────────────────────────────

  @Get('dashboard')
  @UseGuards(SuperAdminGuard)
  getDashboard() {
    return this.service.getDashboardStats();
  }

  @Get('users')
  @UseGuards(SuperAdminGuard)
  getUsers(@Query() query: any) {
    return this.service.getAllUsers(query);
  }

  @Get('subscription')
  @UseGuards(SuperAdminGuard)
  getSubscriptions(@Query() query: any) {
    return this.service.getAllSubscriptions(query);
  }

  @Patch('subscription/:clinicId')
  @UseGuards(SuperAdminGuard)
  updateSubscription(
    @Param('clinicId') clinicId: string,
    @Request() req,
    @Body() dto: {
      plan: string;
      billingCycle?: string;
      status?: SubscriptionStatus;
      durationMonths?: number;
      numBranches?: number;
    },
  ) {
    return this.service.updateSubscription(clinicId, req.user.id, dto);
  }

  @Get('requests')
  @UseGuards(SuperAdminGuard)
  getPendingRequests(@Query() query: any) {
    return this.service.getPendingRequests(query);
  }

  @Patch('requests/:id/approve')
  @UseGuards(SuperAdminGuard)
  approveRequest(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { adminNote?: string },
  ) {
    return this.service.approveRequest(id, req.user.id, body?.adminNote);
  }

  @Patch('requests/:id/reject')
  @UseGuards(SuperAdminGuard)
  rejectRequest(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { adminNote?: string },
  ) {
    return this.service.rejectRequest(id, req.user.id, body?.adminNote);
  }

  // ── Owner routes (request activation / renewal) ────────────────────────────

  @Post('subscription-request')
  createSubscriptionRequest(
    @Request() req,
    @Body() dto: {
      requestedPlan: string;
      billingCycle?: string;
      type: SubscriptionRequestType;
      contactNumber?: string;
      paymentProofUrl?: string;
      paymentMethod?: string;
      numBranches?: number;
    },
  ) {
    return this.service.createSubscriptionRequest(
      req.user.id,
      req.user.clinicId,
      dto,
    );
  }

  @Get('subscription-request/my')
  getMyRequests(@Request() req) {
    return this.service.getUserRequests(req.user.clinicId);
  }

  @Delete('users/:id')
  @UseGuards(SuperAdminGuard)
  deleteUser(@Param('id') id: string) {
    return this.service.deleteUser(id);
  }

  @Delete('clinics/:id')
  @UseGuards(SuperAdminGuard)
  deleteClinic(@Param('id') id: string) {
    return this.service.deleteClinic(id);
  }
}
