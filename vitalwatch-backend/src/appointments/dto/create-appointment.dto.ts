import { IsString, IsUUID, IsEnum, IsOptional, IsDate, IsInt, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType, RecurrencePattern, ReminderType } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  providerId: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @IsInt()
  @Min(5)
  @Max(480) // Max 8 hours
  @IsOptional()
  duration?: number = 30;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  meetingUrl?: string;

  @IsString()
  @IsOptional()
  meetingId?: string;

  @IsString()
  @IsOptional()
  meetingPassword?: string;

  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  reasonForVisit?: string;

  @IsArray()
  @IsEnum(ReminderType, { each: true })
  @IsOptional()
  reminderTypes?: ReminderType[];

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean = false;

  @IsEnum(RecurrencePattern)
  @IsOptional()
  recurrencePattern?: RecurrencePattern;

  @IsInt()
  @IsOptional()
  recurrenceInterval?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  recurrenceDaysOfWeek?: number[];

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  recurrenceEndDate?: Date;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean = true;

  @IsString()
  @IsOptional()
  timezone?: string = 'UTC';

  @IsOptional()
  metadata?: Record<string, any>;
}
