import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionDto {
  @IsString()
  medicineName: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateClinicalRecordDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  // Optional — a record can be created without a doctor attached (e.g. from
  // a billing flow where no doctor was selected on any billed service).
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  diagnosisNotes?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  prescriptions?: PrescriptionDto[];

  @IsOptional()
  @IsArray()
  attachments?: { name: string; url: string; type: string }[];
}

export class UpdateClinicalRecordDto {
  @IsOptional()
  @IsString()
  diagnosisNotes?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  prescriptions?: PrescriptionDto[];

  @IsOptional()
  @IsArray()
  attachments?: { name: string; url: string; type: string }[];
}

// ── Billing → Clinical Record sync ─────────────────────────────────────────
// Called automatically from the Billing modal right after an invoice is
// created. Never rejects for "no services" the way create/update do — the
// service layer just no-ops in that case (see
// ClinicalRecordsService.upsertFromBilling for the full find-or-create /
// append-a-visit logic).
export class UpsertClinicalRecordFromBillingDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @IsOptional()
  @IsString()
  visitDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
