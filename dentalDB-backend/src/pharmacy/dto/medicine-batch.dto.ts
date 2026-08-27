import {
  IsString, IsNumber, IsOptional, IsDateString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicineBatchDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  batchNumber: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  expiryDate: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityReceived: number;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;
}

export class UpdateMedicineBatchDto {
  /**
   * Reassigning branchId moves this batch (and its preserved batch number,
   * expiry, manufacturing/start dates, and quantity) to another branch —
   * section 12. Clinickarobar has no separate inter-branch transfer module
   * to hook into yet, so this is exposed the same way every other
   * batch-level correction is, via pharmacy.manage_batches + audit log
   * (before/after), rather than standing up a new transfer subsystem.
   */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityAvailable?: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;
}

/** Manual batch selection (section 8) — only exposed to users with pharmacy.manual_batch_selection. */
export class DispenseBatchDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsString()
  branchId?: string;

  /** If set, allocate from this exact batch instead of running FEFO. Requires pharmacy.manual_batch_selection. */
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  patientId?: string;
}

/** Expired-stock write-off (section 9) — only valid against EXPIRED batches. */
export class DisposeBatchDto {
  /** Defaults to the batch's full remaining quantity if omitted. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
