import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionRequest } from './entities/subscription-request.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { SyncMeta } from '../sync/entities/sync-meta.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchesModule } from '../branch/branch.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, SubscriptionRequest, Clinic, SyncMeta]), NotificationsModule, BranchesModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
