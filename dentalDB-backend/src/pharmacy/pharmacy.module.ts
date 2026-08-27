import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicineBatch } from './entities/medicine-batch.entity';
import { BatchNotificationLog } from './entities/batch-notification-log.entity';
import { Product } from '../inventory/entities/product.entity';
import { Branch } from '../branch/entities/branch.entity';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyScheduler } from './pharmacy.scheduler';
import { InventoryModule } from '../inventory/inventory.module';
import { BranchesModule } from '../branch/branch.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@Module({
  imports: [
    // BranchLockGuard (used on PharmacyController) injects Branch's own
    // repository directly — it isn't exported by BranchesModule, so every
    // module that uses the guard registers Branch itself too. Mirrors
    // LabWorkModule exactly (see lab-work.module.ts).
    TypeOrmModule.forFeature([MedicineBatch, BatchNotificationLog, Product, Branch]),
    // Circular with InventoryModule (it needs PharmacyService for the
    // usable-stock-aware low-stock check) — forwardRef on both sides.
    forwardRef(() => InventoryModule),
    BranchesModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService, PharmacyScheduler, BranchLockGuard, PermissionsGuard],
  exports: [PharmacyService, TypeOrmModule],
})
export class PharmacyModule {}
