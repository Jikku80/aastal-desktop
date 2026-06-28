import { Controller, Get, Post, Delete, Param, Body, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { PatientAuthService } from '../patient-auth/patient-auth.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly patientAuthService: PatientAuthService,
  ) {}

  private getPatientAccountId(req: Request): string {
    const token = (req as any).cookies?.patient_token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Patient authentication required');
    const payload = this.patientAuthService.verifyToken(token);
    return payload.sub;
  }

  // Public
  @Get('clinic/:clinicId')
  getClinicReviews(@Param('clinicId') clinicId: string, @Query() q: any) {
    return this.reviewsService.getClinicReviews(clinicId, +q.page || 1, +q.limit || 20);
  }

  @Get('doctor/:doctorId')
  getDoctorReviews(@Param('doctorId') doctorId: string, @Query() q: any) {
    return this.reviewsService.getDoctorReviews(doctorId, +q.page || 1, +q.limit || 20);
  }

  // Patient (requires patient JWT cookie)
  @Post()
  createReview(@Body() body: any, @Req() req: Request) {
    const patientAccountId = this.getPatientAccountId(req);
    return this.reviewsService.createReview(patientAccountId, body);
  }

  @Get('my')
  getMyReviews(@Req() req: Request) {
    const patientAccountId = this.getPatientAccountId(req);
    return this.reviewsService.getPatientReviews(patientAccountId);
  }

  @Delete(':id')
  deleteReview(@Param('id') id: string, @Req() req: Request) {
    // #34: extract patientAccountId from verified token, never from body
    const patientAccountId = this.getPatientAccountId(req);
    return this.reviewsService.deleteReview(id, patientAccountId);
  }

  // Clinic / Doctor response
  @Post(':id/respond')
  respond(@Param('id') id: string, @Body() body: { response: string; responderId: string; responderType: 'clinic' | 'doctor' }) {
    return this.reviewsService.respondToReview(id, body.response, body.responderId, body.responderType);
  }
}
