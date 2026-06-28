import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { WaitingQueue }    from './entities/waiting-queue.entity';
import { WaitingQueueService }    from './waiting-queue.service';
import { WaitingQueueController } from './waiting-queue.controller';
import { WaitingQueueGateway }    from './waiting-queue.gateway';
import { Patient }         from '../patients/entities/patient.entity';
import { Appointment }     from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitingQueue, Patient, Appointment]),
  ],
  controllers: [WaitingQueueController],
  providers:   [WaitingQueueService, WaitingQueueGateway],
  exports:     [WaitingQueueService, WaitingQueueGateway],
})
export class WaitingQueueModule {}