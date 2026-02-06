import { IsString, IsUUID, IsEnum, IsOptional, IsDate, IsInt, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType, AppointmentStatus, ReminderType } from '../entities/appointment.entity';

export class UpdateAppointmentDto {
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @IsUUID()
  @IsOptional()
  providerId?: string;

  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  scheduledAt?: Date;

  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  duration?: number;

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

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
