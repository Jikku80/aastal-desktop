import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { RemindersScheduler } from './reminders.scheduler';
import { SparrowSmsService } from './sparrow-sms.service';
import { Notification } from './entities/notification.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from 'src/branch/entities/branch.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Notification, Appointment, Clinic, Branch, Subscription, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, SparrowSmsService, NotificationsGateway, RemindersScheduler],
  exports: [NotificationsService, SparrowSmsService, NotificationsGateway],
})
export class NotificationsModule {}
