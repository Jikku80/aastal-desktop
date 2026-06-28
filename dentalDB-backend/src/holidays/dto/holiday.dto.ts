import { IsString, IsDateString, IsBoolean, IsOptional, IsUUID, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateHolidayDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isClinicWide?: boolean;

  /** true = applies only to specific team members */
  @IsBoolean()
  @IsOptional()
  isTeamMemberSpecific?: boolean;

  /** Single branch (backward-compat) */
  @IsUUID()
  @IsOptional()
  branchId?: string;

  /** Multiple branches — takes priority over branchId when present */
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  branchIds?: string[];

  /** Specific user IDs — used when isTeamMemberSpecific = true */
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  targetUserIds?: string[];

  /** true = applies only to specific roles */
  @IsBoolean()
  @IsOptional()
  isRoleSpecific?: boolean;

  /** Built-in UserRole values or custom RBAC Role UUIDs — used when isRoleSpecific = true */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetRoles?: string[];
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}