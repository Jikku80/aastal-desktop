import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsBoolean,
  IsString, IsDateString, IsInt, Min, IsUUID,
} from 'class-validator';
import { ExpenseCategory, ApprovalStatus } from '../entities/expense.entity';

export class CreateExpenseDto {
  @IsOptional() @IsString() branchId?: string;
  @IsEnum(ExpenseCategory) category: ExpenseCategory;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() currency?: string;
  @IsNotEmpty() @IsString() description: string;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsOptional() @IsBoolean() isRecurring?: boolean;
  @IsOptional() @IsInt() recurringIntervalDays?: number;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsDateString() expenseDate: string;
  @IsOptional() @IsString() notes?: string;

  /** Dentist/staff linked to this salary expense */
  @IsOptional() @IsString() staffId?: string;

  /** Lab work order that triggered this expense */
  @IsOptional() @IsString() labWorkId?: string;

  /** Purchase order that triggered this expense */
  @IsOptional() @IsString() purchaseOrderId?: string;

  /** Payroll run that generated this expense */
  @IsOptional() @IsString() payrollRunId?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsOptional() @IsBoolean() isRecurring?: boolean;
  @IsOptional() @IsInt() recurringIntervalDays?: number;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsDateString() expenseDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() labWorkId?: string;
  @IsOptional() @IsString() purchaseOrderId?: string;
}

export class ExpenseFilterDto {
  branchId?: string;
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  vendorId?: string;
  staffId?: string;
  approvalStatus?: ApprovalStatus;
  calendarType?: 'BS' | 'AD';
  page?: number;
  limit?: number;
}