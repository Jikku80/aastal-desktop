import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsDateString } from 'class-validator';
import { LabWorkStatus, LabWorkPriority } from '../entities/lab-work.entity';

export class CreateLabWorkDto {
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
