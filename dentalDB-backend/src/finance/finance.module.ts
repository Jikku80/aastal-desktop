import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { AccountingPeriod } from './entities/accounting-period.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { CoaService } from './coa.service';
import { JournalService } from './journal.service';
import { StatementsService } from './statements.service';
import { PeriodService } from './period.service';
import { FinancePdfService } from './finance-pdf.service';
import { FinanceController } from './finance.controller';
import { FinanceScheduler } from './finance.scheduler';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Phase 9 — Finance Module. A leaf module (no dependency on Billing/
 * Expenses/Payroll/Inventory) so it can be safely imported *into* those
 * modules for the auto-posting hooks (postInvoicePayment,
 * postExpenseApproved) without any circular-dependency risk.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Account, JournalEntry, JournalLine, AccountingPeriod, Clinic]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [FinanceController],
  providers: [CoaService, JournalService, StatementsService, PeriodService, FinancePdfService, FinanceScheduler],
  exports: [CoaService, JournalService, StatementsService, PeriodService, FinancePdfService],
})
export class FinanceModule {}