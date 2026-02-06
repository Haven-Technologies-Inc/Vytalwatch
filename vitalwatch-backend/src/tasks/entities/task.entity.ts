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

export enum TaskType {
  VITALS_CHECK = 'vitals_check',
  MEDICATION_REMINDER = 'medication_reminder',
  APPOINTMENT = 'appointment',
  FOLLOW_UP_CALL = 'follow_up_call',
  DEVICE_SETUP = 'device_setup',
  PROVIDER_REVIEW = 'provider_review',
  CLINICAL_ASSESSMENT = 'clinical_assessment',
  PATIENT_EDUCATION = 'patient_education',
  CARE_PLAN_UPDATE = 'care_plan_update',
  CUSTOM = 'custom',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
@Index(['patientId', 'status'])
@Index(['assignedTo', 'status'])
@Index(['dueDate', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TaskType,
  })
  type: TaskType;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  @Index()
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  // Patient this task is for
  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  // User assigned to complete this task
  @Column('uuid')
  @Index()
  assignedTo: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignee: User;

  // User who created the task
  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: true })
  @Index()
  dueDate: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column('uuid', { nullable: true })
  completedBy: string;

  @Column('text', { nullable: true })
  completionNotes: string;

  // Related resources
  @Column('uuid', { nullable: true })
  vitalReadingId: string;

  @Column('uuid', { nullable: true })
  alertId: string;

  @Column('uuid', { nullable: true })
  appointmentId: string;

  @Column('uuid', { nullable: true })
  medicationId: string;

  // Recurrence
  @Column({ default: false })
  isRecurring: boolean;

  @Column({ nullable: true })
  recurrencePattern: string; // daily, weekly, monthly

  @Column({ type: 'int', nullable: true })
  recurrenceInterval: number; // every N days/weeks/months

  @Column({ nullable: true })
  recurrenceEndDate: Date;

  // Reminders
  @Column({ default: false })
  reminderSent: boolean;

  @Column({ nullable: true })
  reminderSentAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
