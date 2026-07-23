import {
  IsString, IsOptional, IsEnum, IsArray, IsNumber, IsDateString,
  IsIn, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LabWorkStatus, LabWorkPriority } from '../entities/lab-work.entity';

const RESULT_FLAGS = ['normal', 'low', 'high', 'critical'] as const;

// Explicit, validated shape for a single result row. Nothing here strips
// or defaults `flag` -- @IsIn only rejects values outside the known set.
export class ResultRowDto {
  @IsString()
  parameter: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  referenceRange?: string;

  @IsOptional()
  @IsIn(RESULT_FLAGS)
  flag?: 'normal' | 'low' | 'high' | 'critical';
}

export class CreateLabWorkDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  orderedById: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  labName?: string;

  @IsString()
  testName: string;

  @IsOptional()
  @IsString()
  testDescription?: string;

  @IsOptional()
  @IsEnum(LabWorkPriority)
  priority?: LabWorkPriority;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  sampleCollectedAt?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  externalRef?: string;
}

export class UpdateLabWorkDto {
  @IsOptional()
  @IsString()
  labName?: string;

  @IsOptional()
  @IsString()
  testName?: string;

  @IsOptional()
  @IsString()
  testDescription?: string;

  @IsOptional()
  @IsEnum(LabWorkStatus)
  status?: LabWorkStatus;

  @IsOptional()
  @IsEnum(LabWorkPriority)
  priority?: LabWorkPriority;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  sampleCollectedAt?: string;

  @IsOptional()
  @IsString()
  resultsReceivedAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultRowDto)
  results?: ResultRowDto[];

  @IsOptional()
  @IsString()
  resultSummary?: string;

  @IsOptional()
  @IsArray()
  attachments?: { name: string; url: string }[];

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;
}