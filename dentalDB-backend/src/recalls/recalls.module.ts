import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecallsController } from './recalls.controller';
import { RecallsService } from './recalls.service';
import { RecallsScheduler } from './recalls.scheduler';
import { Recall } from './entities/recall.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Clinic } from 'src/clinics/entities/clinic.entity';
import { Branch } from 'src/branch/entities/branch.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recall, Clinic, Branch, Appointment]),
    NotificationsModule,
  ],
  controllers: [RecallsController],
  providers: [RecallsService, RecallsScheduler],
  exports: [RecallsService],
})
export class RecallsModule {}
