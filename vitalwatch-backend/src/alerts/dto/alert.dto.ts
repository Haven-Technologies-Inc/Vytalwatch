import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '../entities/alert.entity';

export class CreateAlertDto {
  @ApiProperty({ description: 'Patient ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Provider ID (UUID)' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({ description: 'Alert type', enum: AlertType, example: AlertType.VITAL_ABNORMAL })
  @IsEnum(AlertType)
  @IsNotEmpty()
  type: AlertType;

  @ApiProperty({ description: 'Alert severity level', enum: AlertSeverity, example: AlertSeverity.HIGH })
  @IsEnum(AlertSeverity)
  @IsNotEmpty()
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert title', example: 'Critical Blood Pressure Reading' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Alert message with details', example: 'Blood pressure reading of 180/120 mmHg is outside normal range.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: 'Associated vital reading ID (UUID)' })
  @IsOptional()
  @IsUUID()
  vitalReadingId?: string;

  @ApiPropertyOptional({ description: 'Associated device ID (UUID)' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata as key-value pairs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
