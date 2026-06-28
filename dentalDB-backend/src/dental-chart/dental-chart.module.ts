import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DentalChart } from './entities/dental-chart.entity';
import { DentalChartService } from './dental-chart.service';
import { DentalChartController } from './dental-chart.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([DentalChart])],
  controllers: [DentalChartController],
  providers:   [DentalChartService],
  exports:     [DentalChartService],
})
export class DentalChartModule {}
