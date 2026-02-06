import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsDate,
  IsBoolean,
  IsObject,
  IsArray,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CallType } from '../entities/call.entity';

export class InitiateCallDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  providerId: string;

  @IsEnum(CallType)
  type: CallType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  recordingConsentObtained?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recordingConsentedBy?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
