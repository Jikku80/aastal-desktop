import {
  IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, IsDateString,
  IsIn, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BloodTestStatus, BloodTestPriority, BloodTestType } from '../entities/blood-test.entity';

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

export class CreateBloodTestDto {
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

  @IsOptional()
  @IsEnum(BloodTestType)
  testType?: BloodTestType;

  @IsString()
  testName: string;

  @IsOptional()
  @IsString()
  testDescription?: string;

  @IsOptional()
  @IsEnum(BloodTestPriority)
  priority?: BloodTestPriority;

  @IsOptional()
  @IsBoolean()
  fasting?: boolean;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsDateString()
  sampleCollectedAt?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  externalRef?: string;
}

export class UpdateBloodTestDto {
  @IsOptional()
  @IsString()
  labName?: string;

  @IsOptional()
  @IsEnum(BloodTestType)
  testType?: BloodTestType;

  @IsOptional()
  @IsString()
  testName?: string;

  @IsOptional()
  @IsString()
  testDescription?: string;

  @IsOptional()
  @IsEnum(BloodTestStatus)
  status?: BloodTestStatus;

  @IsOptional()
  @IsEnum(BloodTestPriority)
  priority?: BloodTestPriority;

  @IsOptional()
  @IsBoolean()
  fasting?: boolean;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsDateString()
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