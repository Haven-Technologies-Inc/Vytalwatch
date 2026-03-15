import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';
import { MedicationFrequency, MedicationStatus } from '../entities/medication.entity';

export class CreateMedicationDto {
  @IsUUID()
  patientId: string;

  @IsString()
  name: string;

  @IsString()
  dosage: string;

  @IsEnum(MedicationFrequency)
  frequency: MedicationFrequency;

  @IsOptional()
  @IsArray()
  schedule?: { time: string }[];

  @IsOptional()
  @IsUUID()
  prescribedBy?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  refillDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  refillsRemaining?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  pharmacy?: string;

  @IsOptional()
  @IsString()
  rxNumber?: string;
}

export class UpdateMedicationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsEnum(MedicationFrequency)
  frequency?: MedicationFrequency;

  @IsOptional()
  @IsArray()
  schedule?: { time: string }[];

  @IsOptional()
  @IsEnum(MedicationStatus)
  status?: MedicationStatus;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  refillDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  refillsRemaining?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkTakenDto {
  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefillRequestDto {
  @IsOptional()
  @IsString()
  pharmacy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MedicationQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(MedicationStatus)
  status?: MedicationStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
