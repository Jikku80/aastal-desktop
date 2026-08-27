import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { TreatmentPlanStatus } from '../entities/treatment-plan-item.entity';

export class CreateTreatmentPlanDto {
  @IsString()
  patientId: string;

  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString()
  serviceId?: string;

  @IsString()
  serviceName: string;

  @IsOptional() @IsString()
  doctorId?: string;

  @IsOptional() @IsString()
  appointmentId?: string;

  @IsOptional() @IsDateString()
  proposedAt?: string;

  @IsOptional() @IsNumber() @Min(0)
  priceQuoted?: number;

  @IsOptional() @IsString()
  note?: string;
}

export class UpdateTreatmentPlanStatusDto {
  @IsEnum(TreatmentPlanStatus)
  status: TreatmentPlanStatus;

  @IsOptional() @IsString()
  note?: string;
}
