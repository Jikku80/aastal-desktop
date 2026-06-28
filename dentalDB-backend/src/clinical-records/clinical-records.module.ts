import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalRecord, Prescription } from './entities/clinical-record.entity';
import { ClinicalRecordsService } from './clinical-records.service';
import { ClinicalRecordsController } from './clinical-records.controller';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalRecord, Prescription, Branch])],
  controllers: [ClinicalRecordsController],
  providers: [ClinicalRecordsService, BranchLockGuard],
  exports: [ClinicalRecordsService],
})
export class ClinicalRecordsModule {}
