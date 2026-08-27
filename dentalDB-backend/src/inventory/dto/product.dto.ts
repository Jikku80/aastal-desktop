import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryItemType, DosageForm } from '../entities/product.entity';

/** Shared pharma-attribute fields, mixed into both Create/Update DTOs below. */
class PharmaAttributesDto {
  @IsOptional()
  @IsEnum(InventoryItemType)
  itemType?: InventoryItemType;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  medicineCategory?: string;

  @IsOptional()
  @IsEnum(DosageForm)
  dosageForm?: DosageForm;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  dosageUnit?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  storageInstructions?: string;

  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;

  @IsOptional()
  @IsString()
  barcode?: string;
}

export class CreateProductDto extends PharmaAttributesDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitsPerPurchase?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateProductDto extends PharmaAttributesDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitsPerPurchase?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}