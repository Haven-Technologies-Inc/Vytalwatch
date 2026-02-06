import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

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

export interface SOAPStructure {
  subjective: {
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    reviewOfSystems?: string;
    currentMedications?: string[];
    allergies?: string[];
    socialHistory?: string;
  };
  objective: {
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
      weight?: number;
      height?: number;
      bmi?: number;
    };
    physicalExam?: string;
    labResults?: string;
    diagnosticResults?: string;
    deviceData?: {
      deviceId?: string;
      readings?: any[];
      trends?: string;
    };
  };
  assessment: {
    diagnosis?: string[];
    differentialDiagnosis?: string[];
    problemList?: string[];
    riskAssessment?: string;
    progressNotes?: string;
  };
  plan: {
    treatments?: string[];
    medications?: {
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
    }[];
    orders?: string[];
    referrals?: string[];
    followUp?: {
      type: string;
      timeframe: string;
      instructions: string;
    };
    patientEducation?: string[];
    goals?: string[];
  };
}

export interface DigitalSignature {
  signedBy: string;
  signedAt: Date;
  signatureMethod: 'electronic' | 'biometric' | 'password' | 'mfa';
  signatureHash: string; // Hash of note content at time of signing
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  certificateId?: string; // For advanced digital signatures
}

export interface Amendment {
  id: string;
  amendedBy: string;
  amendedAt: Date;
  reason: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  addendum?: string; // Additional notes explaining the amendment
}

@Entity('clinical_notes')
@Index(['patientId', 'noteType', 'createdAt'])
@Index(['providerId', 'status', 'createdAt'])
@Index(['patientId', 'status'])
@Index(['encounterDate'])
export class ClinicalNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Patient and Provider Information
  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column('uuid')
  @Index()
  providerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider: User;

  // Note Type and Classification
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

  // Encounter Information
  @Column({ type: 'timestamp' })
  @Index()
  encounterDate: Date;

  @Column({ type: 'int', nullable: true })
  encounterDuration: number; // Duration in minutes

  @Column({ nullable: true })
  encounterLocation: string;

  // Note Content
  @Column()
  title: string;

  @Column('text')
  content: string; // Main narrative content

  // Structured Data (SOAP or other formats)
  @Column('jsonb', { nullable: true })
  structuredData: SOAPStructure | Record<string, any>;

  // Template Information
  @Column({ nullable: true })
  templateId: string;

  @Column({ nullable: true })
  templateName: string;

  // Related Resources
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

  // Digital Signature
  @Column({ default: false })
  isSigned: boolean;

  @Column('jsonb', { nullable: true })
  signature: DigitalSignature;

  @Column({ nullable: true })
  signedAt: Date;

  // Locking (prevent edits after signing)
  @Column({ default: false })
  isLocked: boolean;

  @Column({ nullable: true })
  lockedAt: Date;

  @Column('uuid', { nullable: true })
  lockedBy: string;

  // Amendment Tracking
  @Column({ default: false })
  isAmended: boolean;

  @Column('jsonb', { array: true, nullable: true })
  amendments: Amendment[];

  @Column({ nullable: true })
  originalNoteId: string; // If this is an amended version

  @Column({ nullable: true })
  supersededBy: string; // Note ID that supersedes this one

  // AI-Assisted Generation
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

  // Compliance and Billing
  @Column('simple-array', { nullable: true })
  icdCodes: string[]; // ICD-10 diagnosis codes

  @Column('simple-array', { nullable: true })
  cptCodes: string[]; // CPT procedure codes

  @Column({ nullable: true })
  billingNotes: string;

  @Column({ default: false })
  billingSubmitted: boolean;

  // Addendum (additional notes after signing)
  @Column('text', { nullable: true })
  addendum: string;

  @Column({ nullable: true })
  addendumAddedAt: Date;

  @Column('uuid', { nullable: true })
  addendumAddedBy: string;

  // Review and Attestation
  @Column({ default: false })
  requiresCoSignature: boolean;

  @Column('uuid', { nullable: true })
  coSignedBy: string;

  @Column({ nullable: true })
  coSignedAt: Date;

  @Column('text', { nullable: true })
  coSignatureNotes: string;

  // Confidentiality
  @Column({ default: false })
  isConfidential: boolean;

  @Column('simple-array', { nullable: true })
  accessibleTo: string[]; // User IDs who can access this note

  // Additional Metadata
  @Column('jsonb', { nullable: true })
  metadata: {
    organizationId?: string;
    departmentId?: string;
    locationId?: string;
    facilityId?: string;
    programId?: string;
    caseId?: string;
    episodeId?: string;
    customFields?: Record<string, any>;
  };

  // Version Control
  @VersionColumn()
  version: number;

  @Column({ nullable: true })
  previousVersionId: string;

  // Audit Fields
  @Column('uuid', { nullable: true })
  lastEditedBy: string;

  @Column({ nullable: true })
  lastEditedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date; // Soft delete

  @Column('uuid', { nullable: true })
  deletedBy: string;

  @Column('text', { nullable: true })
  deletionReason: string;
}
