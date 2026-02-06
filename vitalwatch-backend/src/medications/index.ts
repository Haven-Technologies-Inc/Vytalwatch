/**
 * Medications Module - Public API
 *
 * This file exports all public interfaces, types, and services
 * from the Medications module for use by other modules.
 */

// Module
export { MedicationsModule } from './medications.module';

// Service
export { MedicationsService } from './medications.service';

// Controller
export { MedicationsController } from './medications.controller';

// Entities
export {
  Medication,
  MedicationSchedule,
  MedicationAdherence,
  MedicationType,
  Route,
  Frequency,
  AdherenceStatus,
} from './entities/medication.entity';

// DTOs
export {
  CreateMedicationDto,
  UpdateMedicationDto,
  DiscontinueMedicationDto,
  RecordDoseDto,
  MedicationQueryDto,
  AdherenceQueryDto,
  CreateScheduleDto,
} from './dto/medication.dto';
