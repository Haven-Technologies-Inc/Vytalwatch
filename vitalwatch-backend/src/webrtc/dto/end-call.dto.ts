import { IsString, IsOptional } from 'class-validator';

export class EndCallDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
