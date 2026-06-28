import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectRepository(DoctorProfile) private profileRepo: Repository<DoctorProfile>,
  ) {}

  async createReview(patientAccountId: string, dto: {
    clinicId?: string; doctorUserId?: string; branchId?: string;
    appointmentId?: string; rating: number; comment?: string;
  }): Promise<Review> {
    if (!dto.clinicId && !dto.doctorUserId) throw new BadRequestException('clinicId or doctorUserId required');
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be 1-5');

    // Check for existing review on same appointment
    if (dto.appointmentId) {
      const existing = await this.reviewRepo.findOne({ where: { appointmentId: dto.appointmentId, patientAccountId } });
      if (existing) throw new BadRequestException('You have already reviewed this appointment');
    }

    const review = await this.reviewRepo.save(
      this.reviewRepo.create({ ...dto, patientAccountId })
    );

    // Update cached aggregates
    if (dto.clinicId) await this.recalcClinicRating(dto.clinicId);
    if (dto.doctorUserId) await this.recalcDoctorRating(dto.doctorUserId);

    return review;
  }

  async respondToReview(reviewId: string, response: string, responderId: string, responderType: 'clinic' | 'doctor'): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    if (responderType === 'clinic') review.clinicResponse = response;
    else review.doctorResponse = response;
    review.responseAt = new Date();

    return this.reviewRepo.save(review);
  }

  async getClinicReviews(clinicId: string, page = 1, limit = 20) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { clinicId },
      relations: ['patientAccount'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    const avg = data.reduce((s, r) => s + r.rating, 0) / (data.length || 1);
    return { data, total, page, limit, averageRating: data.length ? Math.round(avg * 10) / 10 : null };
  }

  async getDoctorReviews(doctorUserId: string, page = 1, limit = 20) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { doctorUserId },
      relations: ['patientAccount'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    const avg = data.reduce((s, r) => s + r.rating, 0) / (data.length || 1);
    return { data, total, page, limit, averageRating: data.length ? Math.round(avg * 10) / 10 : null };
  }

  async getPatientReviews(patientAccountId: string) {
    return this.reviewRepo.find({
      where: { patientAccountId },
      relations: ['clinic'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteReview(reviewId: string, patientAccountId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId, patientAccountId } });
    if (!review) throw new NotFoundException('Review not found');
    const { clinicId, doctorUserId } = review;
    await this.reviewRepo.delete(reviewId);
    if (clinicId) await this.recalcClinicRating(clinicId);
    if (doctorUserId) await this.recalcDoctorRating(doctorUserId);
  }

  private async recalcClinicRating(clinicId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.clinicId = :clinicId', { clinicId })
      .getRawOne();
    await this.clinicRepo.update(clinicId, {
      rating: result.avg ? parseFloat(parseFloat(result.avg).toFixed(2)) : null,
      reviewCount: parseInt(result.count) || 0,
    });
  }

  private async recalcDoctorRating(doctorUserId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.doctorUserId = :doctorUserId', { doctorUserId })
      .getRawOne();
    await this.profileRepo.update({ userId: doctorUserId }, {
      rating: result.avg ? parseFloat(parseFloat(result.avg).toFixed(2)) : null,
      reviewCount: parseInt(result.count) || 0,
    });
  }
}
