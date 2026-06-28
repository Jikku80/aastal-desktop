import { IsString, IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { RecallType, RecallStatus } from '../entities/recall.entity';

export class CreateRecallDto {
  @IsUUID()
  patientId: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RecallType)
  recallType?: RecallType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRecallDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RecallType)
  recallType?: RecallType;

  @IsOptional()
  @IsEnum(RecallStatus)
  status?: RecallStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}

export class BulkCreateRecallDto {
  @IsUUID()
  patientId: string;

  /** Months from today until due */
  monthsFromNow: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RecallType)
  recallType?: RecallType;

  @IsOptional()
  @IsString()
  notes?: string;
}
