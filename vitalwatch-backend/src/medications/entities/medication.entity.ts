import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Enum representing types of medications
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

/**
 * Enum representing routes of administration
 */
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

/**
 * Enum representing medication frequency
 */
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

/**
 * Enum representing adherence status for a dose
 */
export enum AdherenceStatus {
  TAKEN = 'taken',
  MISSED = 'missed',
  SKIPPED = 'skipped',
  PENDING = 'pending',
  LATE = 'late',
}

/**
 * Medication entity - represents a prescribed medication
 */
@Entity('medications')
@Index(['patientId', 'status'])
@Index(['prescribedBy', 'status'])
@Index(['startDate', 'endDate'])
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Medication identification
  @Column()
  name: string;

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

  // Dosage information
  @Column()
  dosage: string; // e.g., "10mg", "5ml"

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
  frequencyDetails: string; // Additional details for custom frequency

  @Column('text', { nullable: true })
  instructions: string; // Detailed instructions for taking the medication

  @Column('text', { nullable: true })
  purpose: string; // Why the medication is prescribed

  // Patient and provider
  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column('uuid')
  @Index()
  prescribedBy: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'prescribedBy' })
  prescriber: User;

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
  status: string; // active, discontinued, completed, on_hold

  @Column({ nullable: true })
  discontinuedDate: Date;

  @Column('uuid', { nullable: true })
  discontinuedBy: string;

  @Column('text', { nullable: true })
  discontinuedReason: string;

  // Prescription details
  @Column({ nullable: true })
  prescriptionNumber: string;

  @Column({ nullable: true })
  pharmacy: string;

  @Column({ nullable: true })
  pharmacyPhone: string;

  @Column('int', { nullable: true })
  refillsAuthorized: number;

  @Column('int', { default: 0 })
  refillsUsed: number;

  @Column({ nullable: true })
  lastRefillDate: Date;

  // Safety information
  @Column('simple-array', { nullable: true })
  sideEffects: string[];

  @Column('simple-array', { nullable: true })
  contraindications: string[];

  @Column('simple-array', { nullable: true })
  interactions: string[]; // IDs of medications that interact

  @Column('text', { nullable: true })
  warnings: string;

  @Column('text', { nullable: true })
  precautions: string;

  // Monitoring
  @Column({ default: false })
  requiresMonitoring: boolean;

  @Column('simple-array', { nullable: true })
  monitoringParameters: string[]; // e.g., ["blood_pressure", "heart_rate", "blood_glucose"]

  // Reminders and adherence
  @Column({ default: true })
  reminderEnabled: boolean;

  @Column('int', { nullable: true })
  reminderMinutesBefore: number; // Minutes before scheduled time to send reminder

  @Column({ default: true })
  trackAdherence: boolean;

  // Additional metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  notes: string;

  // Image or document attachments
  @Column('simple-array', { nullable: true })
  attachments: string[]; // URLs to prescription images, etc.

  // Relationships
  @OneToMany(() => MedicationSchedule, schedule => schedule.medication, { cascade: true })
  schedules: MedicationSchedule[];

  @OneToMany(() => MedicationAdherence, adherence => adherence.medication, { cascade: true })
  adherenceRecords: MedicationAdherence[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * MedicationSchedule entity - represents specific scheduled times for medication
 */
@Entity('medication_schedules')
@Index(['medicationId', 'scheduledTime'])
@Index(['patientId', 'scheduledTime'])
export class MedicationSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  medicationId: string;

  @ManyToOne(() => Medication, medication => medication.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  // Schedule details
  @Column()
  @Index()
  scheduledTime: Date; // Specific date and time for this dose

  @Column({ nullable: true })
  scheduledDosage: string; // Can override default dosage for this specific dose

  @Column('text', { nullable: true })
  specialInstructions: string;

  // Status
  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ default: false })
  reminderSent: boolean;

  @Column({ nullable: true })
  reminderSentAt: Date;

  // Recurrence (for generating future schedules)
  @Column({ default: false })
  isRecurring: boolean;

  @Column('jsonb', { nullable: true })
  recurrenceRule: {
    pattern: Frequency;
    interval?: number;
    daysOfWeek?: number[]; // 0-6, Sunday is 0
    timeOfDay?: string[]; // ["08:00", "20:00"]
    endDate?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * MedicationAdherence entity - tracks actual medication taking behavior
 */
@Entity('medication_adherence')
@Index(['medicationId', 'recordedAt'])
@Index(['patientId', 'recordedAt'])
@Index(['status'])
export class MedicationAdherence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  medicationId: string;

  @ManyToOne(() => Medication, medication => medication.adherenceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column('uuid', { nullable: true })
  scheduleId: string; // Link to specific schedule if applicable

  @ManyToOne(() => MedicationSchedule, { nullable: true })
  @JoinColumn({ name: 'scheduleId' })
  schedule: MedicationSchedule;

  // Adherence details
  @Column({
    type: 'enum',
    enum: AdherenceStatus,
  })
  @Index()
  status: AdherenceStatus;

  @Column()
  @Index()
  recordedAt: Date; // When the adherence was recorded

  @Column({ nullable: true })
  scheduledTime: Date; // Original scheduled time for this dose

  @Column({ nullable: true })
  takenAt: Date; // Actual time medication was taken (if different from recordedAt)

  @Column({ nullable: true })
  dosageTaken: string; // Actual dosage taken (may differ from prescribed)

  // Recording method
  @Column({ default: 'manual' })
  recordMethod: string; // manual, automatic, device, caregiver

  @Column('uuid', { nullable: true })
  recordedBy: string; // User who recorded this (patient or caregiver)

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recordedBy' })
  recorder: User;

  // Additional context
  @Column('text', { nullable: true })
  notes: string;

  @Column('text', { nullable: true })
  reason: string; // Reason for missing/skipping

  @Column({ default: false })
  hadSideEffects: boolean;

  @Column('simple-array', { nullable: true })
  reportedSideEffects: string[];

  // Location data (if recorded via mobile app)
  @Column('jsonb', { nullable: true })
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
