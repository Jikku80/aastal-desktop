import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { Product } from './entities/product.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { InventoryConsumptionEvent } from './entities/inventory-consumption.entity';
import { InventoryService } from './inventory.service';
import { InventoryController, PurchaseOrdersController } from './inventory.controller';
import { LowStockScheduler } from './low-stock.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Vendor } from '../expenses/entities/vendor.entity';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { FinanceModule } from '../finance/finance.module';

// Ensure upload directory exists at startup
mkdir(join(UPLOADS_DIR, 'products'), { recursive: true }).catch(() => {});

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, PurchaseOrder, User, Expense, Vendor, InventoryConsumptionEvent]),
    NotificationsModule,
    MulterModule.register({}),
    // PharmacyModule also imports InventoryModule (for InventoryService /
    // adjustStock), so this side needs forwardRef too — LowStockScheduler
    // uses PharmacyService.getUsableStockByProduct to extend the existing
    // low-stock check for pharmaceutical items (section 10).
    forwardRef(() => PharmacyModule),
    FinanceModule,
  ],
  controllers: [InventoryController, PurchaseOrdersController],
  providers: [InventoryService, LowStockScheduler],
  exports: [InventoryService, TypeOrmModule],
})
export class InventoryModule {}