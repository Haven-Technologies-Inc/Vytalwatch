import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { EncryptedColumn } from '../decorators/encrypted-column.decorator';

/**
 * Example: ClinicalNote entity with field-level encryption
 *
 * Clinical notes contain highly sensitive PHI and must be encrypted:
 * - content: Main narrative content
 * - structuredData: SOAP notes, assessments, diagnoses
 * - addendum: Additional notes
 * - billingNotes: Billing-related notes
 *
 * This example shows comprehensive encryption for clinical documentation
 */

export enum NoteType {
  SOAP = 'soap',
  PROGRESS = 'progress',
  CONSULTATION = 'consultation',
  DISCHARGE = 'discharge',
  ASSESSMENT = 'assessment',
  RPM_REVIEW = 'rpm_review',
  INITIAL_ASSESSMENT = 'initial_assessment',
  FOLLOW_UP = 'follow_up',
  REFERRAL = 'referral',
  PROCEDURE = 'procedure',
}

export enum EncounterType {
  TELEHEALTH = 'telehealth',
  IN_PERSON = 'in_person',
  PHONE = 'phone',
  ASYNC = 'async',
  EMERGENCY = 'emergency',
  RPM_MONITORING = 'rpm_monitoring',
}

export enum NoteStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  PENDING_SIGNATURE = 'pending_signature',
  SIGNED = 'signed',
  LOCKED = 'locked',
  AMENDED = 'amended',
  DELETED = 'deleted',
}

@Entity('clinical_notes')
@Index(['patientId', 'noteType', 'createdAt'])
@Index(['providerId', 'status', 'createdAt'])
@Index(['patientId', 'status'])
@Index(['encounterDate'])
export class ClinicalNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // References (not encrypted - needed for queries)
  @Column('uuid')
  @Index()
  patientId: string;

  @Column('uuid')
  @Index()
  providerId: string;

  @Column({
    type: 'enum',
    enum: NoteType,
  })
  @Index()
  noteType: NoteType;

  @Column({
    type: 'enum',
    enum: EncounterType,
  })
  encounterType: EncounterType;

  @Column({
    type: 'enum',
    enum: NoteStatus,
    default: NoteStatus.DRAFT,
  })
  @Index()
  status: NoteStatus;

  // ========== ENCRYPTED FIELDS (PHI) ==========

  /**
   * Main narrative content - Encrypted
   * Contains clinical observations, assessments, plans
   */
  @EncryptedColumn({
    columnOptions: { type: 'text' },
  })
  content: string;

  /**
   * Structured data (SOAP notes, etc.) - Encrypted
   * Contains detailed patient information, diagnoses, treatments
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  structuredData: any; // SOAPStructure | Record<string, any>

  /**
   * Addendum - Encrypted
   * Additional notes added after signing
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  addendum: string;

  /**
   * Billing notes - Encrypted
   * May contain PHI
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  billingNotes: string;

  /**
   * Co-signature notes - Encrypted
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  coSignatureNotes: string;

  /**
   * Amendments - Encrypted
   * History of changes to the note
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  amendments: any[];

  /**
   * Digital signature - Encrypted
   * Contains signature metadata
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  signature: any;

  // ========== UNENCRYPTED FIELDS (metadata for queries) ==========

  @Column()
  title: string; // Keep unencrypted for listing/searching

  @Column({ type: 'timestamp' })
  @Index()
  encounterDate: Date;

  @Column({ type: 'int', nullable: true })
  encounterDuration: number;

  @Column({ nullable: true })
  encounterLocation: string;

  @Column({ nullable: true })
  templateId: string;

  @Column({ nullable: true })
  templateName: string;

  // Related resources (references)
  @Column('uuid', { array: true, nullable: true })
  vitalReadingIds: string[];

  @Column('uuid', { array: true, nullable: true })
  alertIds: string[];

  @Column('uuid', { array: true, nullable: true })
  medicationIds: string[];

  @Column('uuid', { array: true, nullable: true })
  appointmentIds: string[];

  @Column('uuid', { array: true, nullable: true })
  deviceIds: string[];

  @Column('uuid', { nullable: true })
  billingClaimId: string;

  // Signature status (metadata)
  @Column({ default: false })
  isSigned: boolean;

  @Column({ nullable: true })
  signedAt: Date;

  // Locking
  @Column({ default: false })
  isLocked: boolean;

  @Column({ nullable: true })
  lockedAt: Date;

  @Column('uuid', { nullable: true })
  lockedBy: string;

  // Amendment tracking
  @Column({ default: false })
  isAmended: boolean;

  @Column({ nullable: true })
  originalNoteId: string;

  @Column({ nullable: true })
  supersededBy: string;

  // AI metadata (not PHI)
  @Column({ default: false })
  aiGenerated: boolean;

  @Column({ default: false })
  aiAssisted: boolean;

  @Column('jsonb', { nullable: true })
  aiMetadata: {
    model?: string;
    generatedAt?: Date;
    confidence?: number;
    humanEdited?: boolean;
    editedFields?: string[];
  };

  // Compliance codes (not PHI, needed for billing queries)
  @Column('simple-array', { nullable: true })
  icdCodes: string[];

  @Column('simple-array', { nullable: true })
  cptCodes: string[];

  @Column({ default: false })
  billingSubmitted: boolean;

  @Column({ nullable: true })
  addendumAddedAt: Date;

  @Column('uuid', { nullable: true })
  addendumAddedBy: string;

  // Review
  @Column({ default: false })
  requiresCoSignature: boolean;

  @Column('uuid', { nullable: true })
  coSignedBy: string;

  @Column({ nullable: true })
  coSignedAt: Date;

  // Confidentiality
  @Column({ default: false })
  isConfidential: boolean;

  @Column('simple-array', { nullable: true })
  accessibleTo: string[];

  // Version control
  @VersionColumn()
  version: number;

  @Column({ nullable: true })
  previousVersionId: string;

  // Audit
  @Column('uuid', { nullable: true })
  lastEditedBy: string;

  @Column({ nullable: true })
  lastEditedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;

  @Column('uuid', { nullable: true })
  deletedBy: string;

  @Column('text', { nullable: true })
  deletionReason: string;
}

/**
 * MIGRATION NOTES:
 *
 * 1. Add encrypted columns:
 *    ALTER TABLE clinical_notes ADD COLUMN content_encrypted TEXT;
 *    ALTER TABLE clinical_notes ADD COLUMN structuredData_encrypted TEXT;
 *    ALTER TABLE clinical_notes ADD COLUMN addendum_encrypted TEXT;
 *    ALTER TABLE clinical_notes ADD COLUMN billingNotes_encrypted TEXT;
 *    ALTER TABLE clinical_notes ADD COLUMN coSignatureNotes_encrypted TEXT;
 *    ALTER TABLE clinical_notes ADD COLUMN amendments_encrypted TEXT;
 *    ALTER TABLE clinical_notes ADD COLUMN signature_encrypted TEXT;
 *
 * 2. Encrypt existing data (be careful - this is highly sensitive)
 *
 * 3. IMPORTANT: Ensure proper access controls are in place
 *
 * 4. Consider implementing field-level access control
 *    (e.g., only certain roles can decrypt certain fields)
 *
 * 5. Implement comprehensive audit logging for all access
 */
