import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabWork } from './entities/lab-work.entity';
import { LabService } from './entities/lab-service.entity';
import { LabWorkService } from './lab-work.service';
import { LabWorkController } from './lab-work.controller';
import { LabServiceCatalogService } from './lab-service.service';
import { LabServiceController } from './lab-service.controller';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Expense } from '../expenses/entities/expense.entity';
import { BranchesModule } from '../branch/branch.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { AuditModule } from '../audit/audit.module';
import { LabReportPdfService } from './lab-report-pdf.service';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Patient } from '../patients/entities/patient.entity';

/**
 * Phase 5 consolidation: this module now covers everything that used to be
 * split across `lab-work` and `blood-test` (which has been removed — see
 * migration 1785400000000-ConsolidateLabWork), plus the new dynamic
 * LabService catalog that replaces the old hardcoded BloodTestType enum.
 */
@Module({
  imports: [TypeOrmModule.forFeature([LabWork, LabService, Branch, Expense, Clinic, Patient]), BranchesModule, ClinicsModule, AuditModule],
  controllers: [LabWorkController, LabServiceController],
  providers: [LabWorkService, LabServiceCatalogService, LabReportPdfService, BranchLockGuard, PermissionsGuard],
  exports: [LabWorkService, LabServiceCatalogService],
})
export class LabWorkModule {}