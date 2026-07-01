import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  /** e.g. "DESKTOP-4F2K / win32" — free text, defaults server-side if omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}