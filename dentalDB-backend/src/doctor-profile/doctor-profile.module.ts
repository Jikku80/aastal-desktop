import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorProfileController } from './doctor-profile.controller';
import { DoctorProfileService } from './doctor-profile.service';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { DoctorLocation } from './entities/doctor-location.entity';
import { IndependentAvailability } from './entities/independent-availability.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile, DoctorLocation, IndependentAvailability, User])],
  controllers: [DoctorProfileController],
  providers: [DoctorProfileService],
  exports: [DoctorProfileService],
})
export class DoctorProfileModule {}
