import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AppointmentType {
  TELEHEALTH = 'telehealth',
  IN_PERSON = 'in_person',
  PHONE = 'phone',
  FOLLOW_UP = 'follow_up',
  INITIAL_CONSULT = 'initial_consult',
  EMERGENCY = 'emergency',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum RecurrencePattern {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export enum ReminderType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

@Entity('appointments')
@Index(['patientId', 'scheduledAt'])
@Index(['providerId', 'scheduledAt'])
@Index(['status', 'scheduledAt'])
@Index(['scheduledAt'])
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Patient this appointment is for
  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  // Provider conducting the appointment
  @Column('uuid')
  @Index()
  providerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider: User;

  // Organization (if multi-tenant)
  @Column('uuid', { nullable: true })
  organizationId: string;

  // Appointment details
  @Column({
    type: 'enum',
    enum: AppointmentType,
  })
  type: AppointmentType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  @Index()
  status: AppointmentStatus;

  @Column()
  @Index()
  scheduledAt: Date;

  @Column({ type: 'int', default: 30 }) // Duration in minutes
  duration: number;

  @Column({ nullable: true })
  endTime: Date;

  // Location/meeting details
  @Column({ nullable: true })
  location: string; // Physical address for in-person

  @Column({ nullable: true })
  meetingUrl: string; // For telehealth appointments

  @Column({ nullable: true })
  meetingId: string;

  @Column({ nullable: true })
  meetingPassword: string;

  @Column({ nullable: true })
  roomNumber: string; // For in-person appointments

  // Appointment content
  @Column({ nullable: true })
  title: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column('text', { nullable: true })
  chiefComplaint: string;

  @Column('text', { nullable: true })
  reasonForVisit: string;

  // Clinical documentation
  @Column('text', { nullable: true })
  clinicalNotes: string;

  @Column('text', { nullable: true })
  diagnosis: string;

  @Column('text', { nullable: true })
  treatmentPlan: string;

  @Column('jsonb', { nullable: true })
  prescriptions: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];

  @Column('text', { nullable: true })
  followUpInstructions: string;

  // Completion tracking
  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column('uuid', { nullable: true })
  completedBy: string;

  // Cancellation
  @Column({ nullable: true })
  cancelledAt: Date;

  @Column('uuid', { nullable: true })
  cancelledBy: string;

  @Column('text', { nullable: true })
  cancellationReason: string;

  // Confirmation
  @Column({ default: false })
  isConfirmed: boolean;

  @Column({ nullable: true })
  confirmedAt: Date;

  @Column('uuid', { nullable: true })
  confirmedBy: string;

  // Reminders
  @Column({ default: false })
  reminder24HourSent: boolean;

  @Column({ nullable: true })
  reminder24HourSentAt: Date;

  @Column({ default: false })
  reminder1HourSent: boolean;

  @Column({ nullable: true })
  reminder1HourSentAt: Date;

  @Column('simple-array', { nullable: true })
  reminderTypes: ReminderType[];

  // Recurrence
  @Column({ default: false })
  isRecurring: boolean;

  @Column({
    type: 'enum',
    enum: RecurrencePattern,
    default: RecurrencePattern.NONE,
  })
  recurrencePattern: RecurrencePattern;

  @Column({ type: 'int', nullable: true })
  recurrenceInterval: number; // Every N days/weeks/months

  @Column('simple-array', { nullable: true })
  recurrenceDaysOfWeek: number[]; // 0-6 for weekly recurrence

  @Column({ nullable: true })
  recurrenceEndDate: Date;

  @Column('uuid', { nullable: true })
  parentAppointmentId: string; // For recurring appointments

  @Column({ default: false })
  isRecurrenceException: boolean; // Modified instance of recurring series

  // Related resources
  @Column('uuid', { nullable: true })
  vitalReadingId: string;

  @Column('uuid', { nullable: true })
  alertId: string;

  @Column('uuid', { nullable: true })
  taskId: string;

  // Billing
  @Column({ default: false })
  isBillable: boolean;

  @Column('uuid', { nullable: true })
  claimId: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  actualCost: number;

  // Timezone handling
  @Column({ default: 'UTC' })
  timezone: string;

  // Additional metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  // User who created the appointment
  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  // Last modified by
  @Column('uuid', { nullable: true })
  lastModifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
