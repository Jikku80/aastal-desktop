import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString,
  IsDateString, IsBoolean, IsArray, ValidateNested, ArrayMinSize, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../entities/account.entity';

export class CreateAccountDto {
  @IsNotEmpty() @IsString() code: string;
  @IsNotEmpty() @IsString() name: string;
  @IsEnum(AccountType) type: AccountType;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateAccountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class JournalLineInputDto {
  @IsNotEmpty() @IsString() accountId: string;
  @IsOptional() @IsNumber() @Min(0) debit?: number;
  @IsOptional() @IsNumber() @Min(0) credit?: number;
  @IsOptional() @IsString() description?: string;
}

export class CreateManualJournalEntryDto {
  @IsDateString() date: string;
  @IsNotEmpty() @IsString() memo: string;
  @IsOptional() @IsString() branchId?: string;
  @IsArray() @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineInputDto)
  lines: JournalLineInputDto[];
}

export class LedgerQueryDto {
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() branchId?: string;
}

export class StatementQueryDto {
  @IsOptional() @IsDateString() asOfDate?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() calendarType?: 'BS' | 'AD';
}

export class ClosePeriodDto {
  @IsNotEmpty() @IsString() label: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
}