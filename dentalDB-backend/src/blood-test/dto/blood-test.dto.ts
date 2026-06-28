import {
  IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, IsDateString,
} from 'class-validator';
import { BloodTestStatus, BloodTestPriority, BloodTestType } from '../entities/blood-test.entity';

export class CreateBloodTestDto {
  @IsString()
  patientId: string;

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
  results?: {
    parameter: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    flag?: 'normal' | 'low' | 'high' | 'critical';
  }[];

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