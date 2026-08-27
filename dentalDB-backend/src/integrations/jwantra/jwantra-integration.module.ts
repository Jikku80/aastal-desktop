import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwantraIntegration } from './entities/jwantra-integration.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { ClinicService } from '../../services/entities/service.entity';
import { Invoice } from '../../billing/entities/invoice.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Product } from '../../inventory/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { TreatmentPlanItem } from '../../treatment-plans/entities/treatment-plan-item.entity';
import { InventoryConsumptionEvent } from '../../inventory/entities/inventory-consumption.entity';
import { Branch } from '../../branch/entities/branch.entity';
import { DoctorClinicAffiliation } from '../../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { JwantraIntegrationService } from './jwantra-integration.service';
import { JwantraAdminController } from './jwantra-admin.controller';
import { JwantraDataController } from './jwantra-data.controller';
import { JwantraTokenGuard } from './guards/jwantra-token.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JwantraIntegration, Patient, ClinicService, Invoice, Appointment, Product, User,
      TreatmentPlanItem, InventoryConsumptionEvent, Branch, DoctorClinicAffiliation,
    ]),
  ],
  controllers: [JwantraAdminController, JwantraDataController],
  providers: [JwantraIntegrationService, JwantraTokenGuard],
  // Exported so BillingModule/AppointmentsModule/PaymentsModule can inject
  // JwantraIntegrationService (via @Optional()) to fire invoice.paid /
  // appointment.completed webhooks without those modules owning any of
  // this module's entities or routes.
  exports: [JwantraIntegrationService],
})
export class JwantraIntegrationModule {}
