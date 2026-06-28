import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientWallet } from './entities/patient-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { PatientWalletService } from './patient-wallet.service';
import { PatientWalletController } from './patient-wallet.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Invoice } from '../billing/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientWallet, WalletTransaction, Invoice]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [PatientWalletController],
  providers: [PatientWalletService],
  exports: [PatientWalletService],
})
export class PatientWalletModule {}
