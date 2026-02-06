import { IsDate, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RescheduleAppointmentDto {
  @Type(() => Date)
  @IsDate()
  newScheduledAt: Date;

  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  newDuration?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  meetingUrl?: string;
}
