import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelehealthController } from './telehealth.controller';
import { TelehealthService } from './telehealth.service';
import { VideoProviderService } from './video-provider.service';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment])],
  controllers: [TelehealthController],
  providers: [TelehealthService, VideoProviderService],
  exports: [TelehealthService, VideoProviderService],
})
export class TelehealthModule {}
