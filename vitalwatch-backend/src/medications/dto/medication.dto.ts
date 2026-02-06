import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MedicationType,
  Route,
  Frequency,
  AdherenceStatus,
} from '../entities/medication.entity';

/**
 * DTO for creating a new medication prescription
 */
export class CreateMedicationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  ndcCode?: string;

  @IsEnum(MedicationType)
  type: MedicationType;

  @IsNotEmpty()
  @IsString()
  dosage: string;

  @IsNotEmpty()
  @IsString()
  strength: string;

  @IsEnum(Route)
  route: Route;

  @IsEnum(Frequency)
  frequency: Frequency;

  @IsOptional()
  @IsString()
  frequencyDetails?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsNotEmpty()
  @IsUUID()
  patientId: string;

  @IsNotEmpty()
  @IsUUID()
  prescribedBy: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  prescriptionNumber?: string;

  @IsOptional()
  @IsString()
  pharmacy?: string;

  @IsOptional()
  @IsString()
  pharmacyPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  refillsAuthorized?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sideEffects?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];

  @IsOptional()
  @IsString()
  warnings?: string;

  @IsOptional()
  @IsString()
  precautions?: string;

  @IsOptional()
  @IsBoolean()
  requiresMonitoring?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  monitoringParameters?: string[];

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutesBefore?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  scheduleTimesOfDay?: string[]; // ["08:00", "20:00"] for generating initial schedules
}

/**
 * DTO for updating a medication
 */
export class UpdateMedicationDto {
  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @IsOptional()
  @IsString()
  frequencyDetails?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  refillsAuthorized?: number;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutesBefore?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for discontinuing a medication
 */
export class DiscontinueMedicationDto {
  @IsNotEmpty()
  @IsUUID()
  discontinuedBy: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  discontinuedDate?: Date;
}

/**
 * DTO for recording a dose taken
 */
export class RecordDoseDto {
  @IsEnum(AdherenceStatus)
  status: AdherenceStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  takenAt?: Date;

  @IsOptional()
  @IsString()
  dosageTaken?: string;

  @IsOptional()
  @IsString()
  recordMethod?: string;

  @IsOptional()
  @IsUUID()
  recordedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reason?: string; // For missed/skipped doses

  @IsOptional()
  @IsBoolean()
  hadSideEffects?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportedSideEffects?: string[];

  @IsOptional()
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Query options for filtering medications
 */
export class MedicationQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  prescribedBy?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(MedicationType)
  type?: MedicationType;

  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @IsOptional()
  @IsString()
  search?: string; // Search by medication name

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * Query options for adherence records
 */
export class AdherenceQueryDto {
  @IsOptional()
  @IsUUID()
  medicationId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(AdherenceStatus)
  status?: AdherenceStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * DTO for creating medication schedules
 */
export class CreateScheduleDto {
  @IsNotEmpty()
  @IsUUID()
  medicationId: string;

  @IsNotEmpty()
  @IsUUID()
  patientId: string;

  @IsDate()
  @Type(() => Date)
  scheduledTime: Date;

  @IsOptional()
  @IsString()
  scheduledDosage?: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  recurrenceRule?: {
    pattern: Frequency;
    interval?: number;
    daysOfWeek?: number[];
    timeOfDay?: string[];
    endDate?: Date;
  };
}
