import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VitalType } from '../entities/vital-reading.entity';

export class CreateVitalDto {
  @ApiProperty({ description: 'Patient ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Provider ID (UUID)' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Device ID (UUID)' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ description: 'Type of vital reading', enum: VitalType, example: VitalType.HEART_RATE })
  @IsEnum(VitalType)
  @IsNotEmpty()
  type: VitalType;

  @ApiProperty({ description: 'Vital reading value', example: 72 })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'bpm' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Systolic blood pressure value (for blood pressure readings)', example: 120 })
  @IsOptional()
  @IsNumber()
  systolic?: number;

  @ApiPropertyOptional({ description: 'Diastolic blood pressure value (for blood pressure readings)', example: 80 })
  @IsOptional()
  @IsNumber()
  diastolic?: number;

  @ApiPropertyOptional({ description: 'Additional metadata as key-value pairs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Timestamp when the vital was recorded (ISO 8601)', example: '2026-03-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: Date;
}
