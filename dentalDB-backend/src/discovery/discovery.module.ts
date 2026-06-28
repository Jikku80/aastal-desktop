import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { DoctorClinicAffiliation } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { DoctorLocation } from '../doctor-profile/entities/doctor-location.entity';
import { IndependentAvailability } from '../doctor-profile/entities/independent-availability.entity';
import { ClinicService } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic, Branch, DoctorProfile, DoctorClinicAffiliation,
      DoctorLocation, IndependentAvailability, ClinicService, User,
    ]),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
