import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ClinicWebsite } from './entities/clinic-website.entity';
import { ContactMessage } from './entities/contact-message.entity';
import { WebsiteOrder } from './entities/website-order.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Product } from '../inventory/entities/product.entity';
import { ClinicService } from '../services/entities/service.entity';
import { WebsiteBuilderService } from './website-builder.service';
import { WebsiteBuilderController } from './website-builder.controller';
import { WebsiteBuilderPublicController } from './website-builder.public.controller';
import { WebsiteOrdersController } from './website-orders.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { NginxProvisioningService } from './nginx-provisioning.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicWebsite, ContactMessage, WebsiteOrder,
      Clinic, Branch, User, Appointment, Patient, Notification,
      Product, ClinicService,
    ]),
    MulterModule.register({}),
    NotificationsModule,
  ],
  controllers: [
    WebsiteBuilderController,
    WebsiteBuilderPublicController,
    WebsiteOrdersController,
  ],
  providers: [WebsiteBuilderService, NginxProvisioningService],
  exports:   [WebsiteBuilderService],
})
export class WebsiteBuilderModule {}