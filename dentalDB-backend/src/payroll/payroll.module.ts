import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollDeductionRule } from './entities/payroll-deduction-rule.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Attendance } from '../attendance/entities/attendance.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollEntry,
      PayrollDeductionRule,  // new
      Attendance,
      DoctorCommission,
      User,
      Branch,                // new — for branchName lookup
      Expense,
    ]),
    AuditModule,
    NotificationsModule,
    FinanceModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}