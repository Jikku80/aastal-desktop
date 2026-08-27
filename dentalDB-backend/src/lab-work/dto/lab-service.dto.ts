import {
  IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LabServiceParameterTemplateDto {
  @IsString()
  parameter: string;

  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() referenceRange?: string;
  @IsOptional() @IsString() referenceRangeMale?: string;
  @IsOptional() @IsString() referenceRangeFemale?: string;
  @IsOptional() @IsString() method?: string;
}

export class CreateLabServiceDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() panelName?: string;

  @IsOptional() @IsNumber() defaultPrice?: number;
  @IsOptional() @IsNumber() defaultTurnaroundHours?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabServiceParameterTemplateDto)
  defaultParameters?: LabServiceParameterTemplateDto[];

  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLabServiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() panelName?: string;

  @IsOptional() @IsNumber() defaultPrice?: number;
  @IsOptional() @IsNumber() defaultTurnaroundHours?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabServiceParameterTemplateDto)
  defaultParameters?: LabServiceParameterTemplateDto[];

  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
}