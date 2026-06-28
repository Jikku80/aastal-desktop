import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

import { PrescriptionTemplate } from './entities/prescription-template.entity';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { PrescriptionsController } from './prescriptions.controller';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionTemplate, ClinicalRecord, Appointment, Clinic, Branch, User]),
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
      }),
    }),
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionPdfService, BranchLockGuard],
  exports: [PrescriptionPdfService],
})
export class PrescriptionsModule {}