import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Invoice } from '../billing/entities/invoice.entity';
import { JwantraIntegrationModule } from '../integrations/jwantra/jwantra-integration.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice]), HttpModule, JwantraIntegrationModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
