import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AddToQueueDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WalkInDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  opdNo?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckInAppointmentDto {
  @IsUUID()
  appointmentId: string;
}