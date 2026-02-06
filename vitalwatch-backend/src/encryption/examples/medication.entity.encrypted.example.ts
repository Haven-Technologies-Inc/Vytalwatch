import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EncryptedColumn } from '../decorators/encrypted-column.decorator';

/**
 * Example: Medication entity with field-level encryption
 *
 * Encrypted fields:
 * - instructions: Detailed dosage instructions (PHI)
 * - purpose: Medical condition/reason (PHI)
 * - prescriptionNumber: Prescription identifier (PHI)
 * - pharmacy: Pharmacy information (PHI)
 * - discontinuedReason: Medical reasoning (PHI)
 * - sideEffects: Patient-specific side effects (PHI)
 * - notes: Additional clinical notes (PHI)
 *
 * Non-encrypted fields:
 * - name, dosage, frequency: Drug information (can be indexed)
 * - patientId, prescribedBy: References for queries
 * - status, dates: Metadata for filtering
 */

export enum MedicationType {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  LIQUID = 'liquid',
  INJECTION = 'injection',
  INHALER = 'inhaler',
  TOPICAL = 'topical',
  PATCH = 'patch',
  DROPS = 'drops',
  SUPPOSITORY = 'suppository',
  OTHER = 'other',
}

export enum Route {
  ORAL = 'oral',
  SUBLINGUAL = 'sublingual',
  INTRAVENOUS = 'intravenous',
  INTRAMUSCULAR = 'intramuscular',
  SUBCUTANEOUS = 'subcutaneous',
  TOPICAL = 'topical',
  TRANSDERMAL = 'transdermal',
  INHALATION = 'inhalation',
  NASAL = 'nasal',
  OPHTHALMIC = 'ophthalmic',
  OTIC = 'otic',
  RECTAL = 'rectal',
  VAGINAL = 'vaginal',
}

export enum Frequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  EVERY_4_HOURS = 'every_4_hours',
  EVERY_6_HOURS = 'every_6_hours',
  EVERY_8_HOURS = 'every_8_hours',
  EVERY_12_HOURS = 'every_12_hours',
  AS_NEEDED = 'as_needed',
  WEEKLY = 'weekly',
  EVERY_OTHER_DAY = 'every_other_day',
  BEDTIME = 'bedtime',
  MORNING = 'morning',
  CUSTOM = 'custom',
}

@Entity('medications')
@Index(['patientId', 'status'])
@Index(['prescribedBy', 'status'])
@Index(['startDate', 'endDate'])
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========== UNENCRYPTED FIELDS (for searching/filtering) ==========

  @Column()
  name: string; // Generic drug name - searchable

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  brandName: string;

  @Column({ nullable: true })
  ndcCode: string; // National Drug Code

  @Column({
    type: 'enum',
    enum: MedicationType,
    default: MedicationType.TABLET,
  })
  type: MedicationType;

  @Column()
  dosage: string; // e.g., "10mg", "5ml" - standardized

  @Column()
  strength: string; // e.g., "10mg"

  @Column({
    type: 'enum',
    enum: Route,
    default: Route.ORAL,
  })
  route: Route;

  @Column({
    type: 'enum',
    enum: Frequency,
  })
  frequency: Frequency;

  @Column({ nullable: true })
  frequencyDetails: string;

  // References
  @Column('uuid')
  @Index()
  patientId: string;

  @Column('uuid')
  @Index()
  prescribedBy: string;

  // Schedule
  @Column()
  @Index()
  startDate: Date;

  @Column({ nullable: true })
  @Index()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'active' })
  @Index()
  status: string;

  @Column({ nullable: true })
  discontinuedDate: Date;

  @Column('uuid', { nullable: true })
  discontinuedBy: string;

  // Refills
  @Column('int', { nullable: true })
  refillsAuthorized: number;

  @Column('int', { default: 0 })
  refillsUsed: number;

  @Column({ nullable: true })
  lastRefillDate: Date;

  // Monitoring
  @Column({ default: false })
  requiresMonitoring: boolean;

  @Column('simple-array', { nullable: true })
  monitoringParameters: string[];

  // Reminders
  @Column({ default: true })
  reminderEnabled: boolean;

  @Column('int', { nullable: true })
  reminderMinutesBefore: number;

  @Column({ default: true })
  trackAdherence: boolean;

  // ========== ENCRYPTED FIELDS (PHI) ==========

  /**
   * Detailed instructions - Encrypted
   * Contains patient-specific dosing instructions
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  instructions: string;

  /**
   * Purpose/indication - Encrypted
   * Contains medical condition being treated
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  purpose: string;

  /**
   * Prescription number - Encrypted
   * Contains prescription identifier
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  prescriptionNumber: string;

  /**
   * Pharmacy information - Encrypted
   * Contains pharmacy name and contact
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  pharmacy: string;

  /**
   * Pharmacy phone - Encrypted
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  pharmacyPhone: string;

  /**
   * Discontinuation reason - Encrypted
   * Contains clinical reasoning for stopping medication
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  discontinuedReason: string;

  /**
   * Side effects - Encrypted
   * Patient-specific side effects experienced
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  sideEffects: string[];

  /**
   * Contraindications - Encrypted
   * Patient-specific contraindications
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  contraindications: string[];

  /**
   * Drug interactions - Encrypted
   * List of interacting medications
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  interactions: string[];

  /**
   * Warnings - Encrypted
   * Patient-specific warnings
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  warnings: string;

  /**
   * Precautions - Encrypted
   * Special precautions for this patient
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  precautions: string;

  /**
   * Clinical notes - Encrypted
   * Additional notes about the prescription
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  notes: string;

  /**
   * Metadata - Encrypted
   * May contain patient-specific information
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  metadata: Record<string, any>;

  /**
   * Attachments (URLs to prescription images) - Encrypted
   * Contains URLs to scanned prescriptions, etc.
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  attachments: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * MIGRATION NOTES:
 *
 * 1. Add encrypted columns:
 *    ALTER TABLE medications ADD COLUMN instructions_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN purpose_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN prescriptionNumber_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN pharmacy_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN pharmacyPhone_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN discontinuedReason_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN sideEffects_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN contraindications_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN interactions_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN warnings_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN precautions_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN notes_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN metadata_encrypted TEXT;
 *    ALTER TABLE medications ADD COLUMN attachments_encrypted TEXT;
 *
 * 2. Encrypt existing data:
 *    await encryptExistingData(dataSource, encryptionService, {
 *      tableName: 'medications',
 *      fields: [
 *        'instructions', 'purpose', 'prescriptionNumber', 'pharmacy',
 *        'pharmacyPhone', 'discontinuedReason', 'sideEffects',
 *        'contraindications', 'interactions', 'warnings', 'precautions',
 *        'notes', 'metadata', 'attachments'
 *      ],
 *      batchSize: 200,
 *    });
 *
 * 3. Verify encryption
 *
 * 4. Update entity
 *
 * 5. Test medication CRUD operations
 *
 * 6. (Optional) Drop plaintext columns
 */
