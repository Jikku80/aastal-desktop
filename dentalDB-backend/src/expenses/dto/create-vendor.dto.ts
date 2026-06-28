import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { VendorType } from '../entities/vendor.entity';

export class CreateVendorDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsEnum(VendorType) vendorType: VendorType;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateVendorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEnum(VendorType) vendorType?: VendorType;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
