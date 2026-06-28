import { IsString, IsOptional, IsArray, IsNumber, IsEnum, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class POItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitsPerPurchase?: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemDto)
  items: POItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
