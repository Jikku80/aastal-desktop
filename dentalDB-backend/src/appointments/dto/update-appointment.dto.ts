import { PartialType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';
import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatment?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @IsString() cancelReason?: string;
  @IsOptional() @IsDateString() followUpDate?: string;
  @IsOptional() prescriptions?: any[];
  @IsOptional() vitals?: Record<string, any>;
}
