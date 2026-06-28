import {
  IsString, IsOptional, IsArray, IsUUID,
  IsBoolean, MinLength, MaxLength, Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString() @MinLength(2) @MaxLength(60)
  name: string;

  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60)
  name?: string;

  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
}

export class SetRolePermissionsDto {
  @IsArray() @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class TogglePermissionDto {
  @IsUUID('4')
  permissionId: string;

  @IsBoolean()
  enabled: boolean;
}

export class AssignRolesToUserDto {
  @IsArray() @IsUUID('4', { each: true })
  roleIds: string[];
}
