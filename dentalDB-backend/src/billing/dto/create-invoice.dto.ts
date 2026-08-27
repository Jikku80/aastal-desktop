import { Type } from 'class-transformer';
import {
  IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, ValidateNested,
  IsNumber, IsUUID, Min,
} from 'class-validator';

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional() @IsString() serviceId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() doctorId?: string;
  @IsOptional() @IsNumber() commissionPercentage?: number;
  @IsOptional() @IsString() bloodTestId?: string;
  @IsOptional() @IsString() labWorkId?: string;
  // Links this item to the pharmacy-dispensing Prescription it fulfills
  // (Phase 11) — lets BillingService.deductStockForItem mark that
  // prescription's dispensedQuantity/dispensingStatus once this invoice is
  // paid, the same way labWorkId/bloodTestId already close out a lab order.
  @IsOptional() @IsString() prescriptionId?: string;
}

export class CreateInvoiceDto {
  // Optional — a pharmacy/product-only walk-in sale doesn't need a patient
  // record. Services and lab items still require one; that's enforced in
  // the frontend (InvoiceModal) rather than here, same as other
  // cross-field business rules on this DTO.
  @IsOptional() @IsUUID() patientId?: string;

  @IsOptional() @IsString() appointmentId?: string;
  @IsOptional() @IsString() branchId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'An invoice needs at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional() @IsNumber() subtotal?: number;
  @IsOptional() @IsNumber() taxPercent?: number;
  @IsOptional() @IsNumber() taxAmount?: number;
  @IsOptional() @IsNumber() discountAmount?: number;
  @IsOptional() @IsNumber() total?: number;
  @IsOptional() @IsNumber() dueAmount?: number;
  @IsOptional() @IsNumber() paidAmount?: number;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsNumber() vatPercent?: number;
}