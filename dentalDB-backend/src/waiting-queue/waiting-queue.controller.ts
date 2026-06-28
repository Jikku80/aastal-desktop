import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { WaitingQueueService } from './waiting-queue.service';
import { AddToQueueDto, WalkInDto } from './dto/waiting-queue.dto';
import { JwtAuthGuard }            from '../auth/guards/jwt-auth.guard';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class WaitingQueueController {
  constructor(private readonly service: WaitingQueueService) {}

  /** Get today's queue for a branch */
  @Get()
  getQueue(@Req() req: any, @Query('branchId') branchId: string) {
    return this.service.getQueue(req.user.clinicId, branchId);
  }

  /** Today's stats */
  @Get('stats')
  getStats(@Req() req: any, @Query('branchId') branchId: string) {
    return this.service.getTodayStats(req.user.clinicId, branchId);
  }

  /** Search today's appointments eligible for check-in */
  @Get('search-appointments')
  searchAppointments(
    @Req() req: any,
    @Query('branchId') branchId: string,
    @Query('q') q: string,
  ) {
    return this.service.searchCheckInAppointments(req.user.clinicId, branchId, q || '');
  }

  /** Add an existing patient to the queue */
  @Post()
  addToQueue(
    @Req() req: any,
    @Query('branchId') branchId: string,
    @Body() dto: AddToQueueDto,
  ) {
    return this.service.addToQueue(req.user.clinicId, branchId, dto);
  }

  /** Walk-in: find/create patient and add to queue */
  @Post('walk-in')
  walkIn(
    @Req() req: any,
    @Query('branchId') branchId: string,
    @Body() dto: WalkInDto,
  ) {
    return this.service.walkIn(req.user.clinicId, branchId, dto);
  }

  /** Check in a specific appointment */
  @Post('check-in/:appointmentId')
  checkIn(
    @Req() req: any,
    @Query('branchId') branchId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.service.checkInAppointment(req.user.clinicId, branchId, appointmentId);
  }

  /** Call next patient */
  @Patch('call-next')
  callNext(
    @Req() req: any,
    @Query('branchId') branchId: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.service.callNext(req.user.clinicId, branchId, doctorId);
  }

  /** Call a specific queue entry */
  @Patch(':id/call')
  callEntry(@Req() req: any, @Param('id') id: string) {
    return this.service.callEntry(id, req.user.clinicId);
  }

  /** Mark in-progress */
  @Patch(':id/in-progress')
  markInProgress(@Req() req: any, @Param('id') id: string) {
    return this.service.markInProgress(id, req.user.clinicId);
  }

  /** Mark done */
  @Patch(':id/done')
  markDone(@Req() req: any, @Param('id') id: string) {
    return this.service.markDone(id, req.user.clinicId);
  }

  /** Skip entry */
  @Patch(':id/skip')
  skipEntry(@Req() req: any, @Param('id') id: string) {
    return this.service.skipEntry(id, req.user.clinicId);
  }

  /** Remove entry */
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.removeFromQueue(id, req.user.clinicId);
  }

  /** Create appointment for a completed walk-in queue entry (idempotent) */
  @Post(':id/create-appointment')
  createAppointmentForEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: {
      scheduledAt: string;
      endsAt: string;
      type?: string;
      notes?: string;
      dentistId?: string;
      branchId?: string;
    },
  ) {
    return this.service.createAppointmentForEntry(id, req.user.clinicId, dto);
  }
}