import { IsString, IsEnum, IsOptional, IsDateString, IsUUID, IsInt, Min, Matches, IsBoolean } from 'class-validator';
import { RecallType, RecallStatus } from '../entities/recall.entity';

export enum RecallDueUnit {
  DAYS   = 'days',
  WEEKS  = 'weeks',
  MONTHS = 'months',
}

export class CreateRecallDto {
  @IsUUID()
  patientId: string;

  /** Accepts either a bare date ("YYYY-MM-DD") or a full datetime/ISO instant.
   *  When a time component is included, that exact moment is used to
   *  auto-book the follow-up appointment (see RecallsService.create). */
  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RecallType)
  recallType?: RecallType;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Optional dentist to assign on the auto-created follow-up appointment */
  @IsOptional()
  @IsUUID()
  dentistId?: string;

  /** Optional branch to assign on the auto-created follow-up appointment */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  /** Set to false to skip auto-booking a follow-up appointment for this recall. Defaults to true. */
  @IsOptional()
  @IsBoolean()
  createAppointment?: boolean;
}

export class UpdateRecallDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RecallType)
  recallType?: RecallType;

  @IsOptional()
  @IsEnum(RecallStatus)
  status?: RecallStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}

export class BulkCreateRecallDto {
  @IsUUID()
  patientId: string;

  /** How many days/weeks/months from today until due */
  @IsInt()
  @Min(1)
  amount: number;

  /** Unit that `amount` is measured in. Defaults to 'months' if omitted. */
  @IsOptional()
  @IsEnum(RecallDueUnit)
  unit?: RecallDueUnit;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RecallType)
  recallType?: RecallType;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Nepal-local time-of-day ("HH:mm") to use for the auto-booked follow-up
   *  appointment. Combined with the computed due date. Defaults to "10:00". */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'dueTime must be in HH:mm format' })
  dueTime?: string;

  @IsOptional()
  @IsUUID()
  dentistId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  createAppointment?: boolean;
}