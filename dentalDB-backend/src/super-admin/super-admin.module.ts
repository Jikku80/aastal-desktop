import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { User } from '../users/entities/user.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionRequest } from '../subscriptions/entities/subscription-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchesModule } from '../branch/branch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Clinic, Subscription, SubscriptionRequest]),
    NotificationsModule,
    BranchesModule
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
