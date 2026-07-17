import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { JwtModule }       from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WaitingQueue }    from './entities/waiting-queue.entity';
import { WaitingQueueService }    from './waiting-queue.service';
import { WaitingQueueController } from './waiting-queue.controller';
import { WaitingQueueGateway }    from './waiting-queue.gateway';
import { Patient }         from '../patients/entities/patient.entity';
import { Appointment }     from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitingQueue, Patient, Appointment]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WaitingQueueController],
  providers:   [WaitingQueueService, WaitingQueueGateway],
  exports:     [WaitingQueueService, WaitingQueueGateway],
})
export class WaitingQueueModule {}