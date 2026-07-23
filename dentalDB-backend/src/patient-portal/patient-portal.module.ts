import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
import { PatientAccount } from '../patient-auth/entities/patient-account.entity';
import { PatientAccountLink } from '../patient-auth/entities/patient-account-link.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalRecord, Prescription } from '../clinical-records/entities/clinical-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { TelehealthModule } from '../telehealth/telehealth.module';
import { FilesModule } from '../files/files.module';
import { Clinic } from 'src/clinics/entities/clinic.entity';
import { BloodTestModule } from 'src/blood-test/blood-test.module';
import { LabWorkModule } from 'src/lab-work/lab-work.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { HealthSummaryPdfService } from './health-summary-pdf.service';
import { RefillRequest } from '../doctor-portal/entities/refill-request.entity';
import { Referral } from '../doctor-portal/entities/referral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientAccount, PatientAccountLink, Appointment, ClinicalRecord, Prescription,
      Patient, Clinic, RefillRequest, Referral, User,
    ]),
    PatientAuthModule,
    TelehealthModule,
    FilesModule,
    BloodTestModule,
    LabWorkModule,
    NotificationsModule
  ],
  controllers: [PatientPortalController],
  providers: [PatientPortalService, HealthSummaryPdfService],
  exports: [PatientPortalService],
})
export class PatientPortalModule {}