import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { Product } from './entities/product.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { InventoryService } from './inventory.service';
import { InventoryController, PurchaseOrdersController } from './inventory.controller';
import { LowStockScheduler } from './low-stock.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Vendor } from '../expenses/entities/vendor.entity';

// Ensure upload directory exists at startup
mkdir(join(process.cwd(), 'uploads', 'products'), { recursive: true }).catch(() => {});

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, PurchaseOrder, User, Expense, Vendor]),
    NotificationsModule,
    MulterModule.register({}),
  ],
  controllers: [InventoryController, PurchaseOrdersController],
  providers: [InventoryService, LowStockScheduler],
  exports: [InventoryService, TypeOrmModule],
})
export class InventoryModule {}