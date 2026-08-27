import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { Vendor } from './entities/vendor.entity';
import { User } from '../users/entities/user.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Vendor, User]),
    AuditModule,
    NotificationsModule,
    FinanceModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}