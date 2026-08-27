import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Vitals } from '../appointments/entities/vitals.entity';
import { BranchesModule } from '../branch/branch.module';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PatientFile } from '../files/entities/patient-file.entity';
import { LabWork } from '../lab-work/entities/lab-work.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { PatientAccountLink } from '../patient-auth/entities/patient-account-link.entity';
import { VitalsService } from 'src/appointments/vitals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient, Appointment, ClinicalRecord, Vitals, Branch,
      PatientFile, LabWork, Invoice, PatientAccountLink,
    ]),
    BranchesModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService, BranchLockGuard, VitalsService],
  exports: [PatientsService],
})
export class PatientsModule {}