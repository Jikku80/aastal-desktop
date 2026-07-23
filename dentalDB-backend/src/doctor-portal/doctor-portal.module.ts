import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorPortalController } from './doctor-portal.controller';
import { DoctorPortalService } from './doctor-portal.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { DoctorProfileModule } from '../doctor-profile/doctor-profile.module';
import { PatientAccount } from '../patient-auth/entities/patient-account.entity';
import { PatientAccountLink } from '../patient-auth/entities/patient-account-link.entity';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { Referral } from './entities/referral.entity';
import { RefillRequest } from './entities/refill-request.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { PatientPortalModule } from '../patient-portal/patient-portal.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment, Patient, ClinicalRecord, Invoice, User, DoctorProfile,
      PatientAccount, PatientAccountLink, Referral, RefillRequest, Clinic,
      DoctorCommission,
    ]),
    DoctorProfileModule,
    PatientAuthModule,
    PatientPortalModule,
    NotificationsModule,
  ],
  controllers: [DoctorPortalController],
  providers: [DoctorPortalService],
  exports: [DoctorPortalService],
})
export class DoctorPortalModule {}
