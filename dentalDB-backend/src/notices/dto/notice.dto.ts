import {
  IsString, IsDateString, IsBoolean, IsOptional,
  IsUUID, IsEnum, IsArray,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { NoticeType } from '../entities/notice.entity';

export class CreateNoticeDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NoticeType)
  @IsOptional()
  type?: NoticeType;

  @IsBoolean()
  @IsOptional()
  isClinicWide?: boolean;

  /** Single branch (backward-compat) */
  @IsUUID()
  @IsOptional()
  branchId?: string;

  /** Multiple branches — takes priority over branchId when present */
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  branchIds?: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
