import { IsString, IsOptional } from 'class-validator';

export class CancelAppointmentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
