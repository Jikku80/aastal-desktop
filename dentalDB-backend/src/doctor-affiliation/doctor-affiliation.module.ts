import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorAffiliationController } from './doctor-affiliation.controller';
import { DoctorAffiliationService } from './doctor-affiliation.service';
import { DoctorClinicAffiliation } from './entities/doctor-clinic-affiliation.entity';
import { User } from '../users/entities/user.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorClinicAffiliation, User, DoctorProfile, Clinic])],
  controllers: [DoctorAffiliationController],
  providers: [DoctorAffiliationService],
  exports: [DoctorAffiliationService],
})
export class DoctorAffiliationModule {}
