import { Module } from '@nestjs/common';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';

@Module({
  imports: [
    PatientAuthModule,TypeOrmModule.forFeature([Review, Clinic, DoctorProfile])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
