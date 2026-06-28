import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxItem } from './entities/outbox-item.entity';
import { OutboxService } from './outbox.service';
import { OutboxController } from './outbox.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecallsModule } from '../recalls/recalls.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxItem]),
    NotificationsModule,
    RecallsModule,
    PaymentsModule,
  ],
  controllers: [OutboxController],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
