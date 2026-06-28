import {
  IsString, IsEnum, IsDateString, IsOptional,
  IsNumber, IsBoolean, Min, Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsString() dentistId: string;

  /** Branch where appointment is being booked */
  @ApiProperty({ required: false }) @IsOptional() @IsString() branchId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() serviceId?: string;

  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(15) @Max(180) durationMinutes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() chiefComplaint?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() fee?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() paymentMethod?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() autoGenerateInvoice?: boolean;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatment?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @IsString() cancelReason?: string;
  @IsOptional() @IsDateString() followUpDate?: string;
  @IsOptional() prescriptions?: any[];
  // fee, paymentMethod, autoGenerateInvoice inherited from CreateAppointmentDto via PartialType
}