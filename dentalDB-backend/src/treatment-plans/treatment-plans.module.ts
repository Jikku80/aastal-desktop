import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentPlanItem } from './entities/treatment-plan-item.entity';
import { ClinicService } from '../services/entities/service.entity';
import { TreatmentPlansService } from './treatment-plans.service';
import { TreatmentPlansController } from './treatment-plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TreatmentPlanItem, ClinicService])],
  controllers: [TreatmentPlansController],
  providers: [TreatmentPlansService],
  // Exported so integrations/jwantra can inject TreatmentPlansService
  // (listForJwantra) and TypeOrmModule can inject the repo directly,
  // same pattern InventoryModule uses.
  exports: [TreatmentPlansService, TypeOrmModule],
})
export class TreatmentPlansModule {}
