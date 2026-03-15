import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VitalType, VitalStatus } from '../entities/vital-reading.entity';

export class UpdateVitalDto {
  @ApiPropertyOptional({ description: 'Type of vital reading', enum: VitalType })
  @IsOptional()
  @IsEnum(VitalType)
  type?: VitalType;

  @ApiPropertyOptional({ description: 'Vital reading value', example: 72 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: 'bpm' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Systolic blood pressure value', example: 120 })
  @IsOptional()
  @IsNumber()
  systolic?: number;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure value', example: 80 })
  @IsOptional()
  @IsNumber()
  diastolic?: number;

  @ApiPropertyOptional({ description: 'Vital status override', enum: VitalStatus })
  @IsOptional()
  @IsEnum(VitalStatus)
  status?: VitalStatus;

  @ApiPropertyOptional({ description: 'Meal context', example: 'fasting' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mealContext?: string;

  @ApiPropertyOptional({ description: 'Notes about the reading', example: 'Taken after exercise' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata as key-value pairs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Timestamp when the vital was recorded (ISO 8601)',
    example: '2026-03-01T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  recordedAt?: Date;
}
