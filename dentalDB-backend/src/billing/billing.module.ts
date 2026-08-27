import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PdfService } from './pdf.service';
import { BillingScheduler } from './billing.scheduler';
import { Invoice } from './entities/invoice.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { ServicesModule } from '../services/services.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { AuditModule } from '../audit/audit.module';
import { Clinic } from '../clinics/entities/clinic.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LabWorkModule } from '../lab-work/lab-work.module';
import { PatientWalletModule } from '../patient-wallet/patient-wallet.module';
import { ClinicalRecordsModule } from '../clinical-records/clinical-records.module';
import { JwantraIntegrationModule } from '../integrations/jwantra/jwantra-integration.module';
import { FinanceModule } from '../finance/finance.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Appointment, User, Branch, Clinic]),
    NotificationsModule,
    ClinicsModule,
    CommissionsModule,
    ServicesModule,
    InventoryModule,
    PharmacyModule,
    AuditModule,
    AnalyticsModule,
    LabWorkModule,
    PatientWalletModule,
    ClinicalRecordsModule,
    JwantraIntegrationModule,
    FinanceModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, PdfService, BranchLockGuard, BillingScheduler],
  exports: [BillingService],
})
export class BillingModule {}