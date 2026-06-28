import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { User } from '../users/entities/user.entity';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { PrescriptionController } from './prescription.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalRecord, Clinic, User]),
  ],
  controllers: [PrescriptionController],
  providers:   [PrescriptionPdfService],
  exports:     [PrescriptionPdfService],
})
export class PrescriptionModule {}
