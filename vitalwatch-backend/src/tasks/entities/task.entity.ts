import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TaskType {
  REVIEW = 'review',
  OUTREACH = 'outreach',
  ESCALATION = 'escalation',
  SETUP = 'setup',
  BILLING_REVIEW = 'billing_review',
  COMPLIANCE_CHECK = 'compliance_check',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('tasks')
@Index(['patientId', 'status'])
@Index(['assignedToUserId', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid', { nullable: true })
  alertId: string;

  @Column('uuid', { nullable: true })
  enrollmentId: string;

  @Column('uuid', { nullable: true })
  clinicId: string;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  dueAt: Date;

  @Column('uuid', { nullable: true })
  assignedToUserId: string;

  @Column()
  createdBy: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column('uuid', { nullable: true })
  completedBy: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
