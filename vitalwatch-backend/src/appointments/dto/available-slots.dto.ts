import { IsUUID, IsDate, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAvailableSlotsDto {
  @IsUUID()
  providerId: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  duration?: number = 30;

  @IsOptional()
  timezone?: string = 'UTC';
}
