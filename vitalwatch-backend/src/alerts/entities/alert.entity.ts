import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum AlertType {
  VITAL_THRESHOLD = 'vital_threshold',
  VITAL_TREND = 'vital_trend',
  DEVICE_OFFLINE = 'device_offline',
  MEDICATION_MISSED = 'medication_missed',
  NO_READING = 'no_reading',
  AI_PREDICTION = 'ai_prediction',
  WEIGHT_CHANGE = 'weight_change',
  CUSTOM = 'custom',
}

@Entity('alerts')
@Index(['patientId', 'status'])
@Index(['providerId', 'status'])
@Index(['severity', 'status'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  patientId: string;

  @Column('uuid')
  @Index()
  providerId: string;

  @Column('uuid', { nullable: true })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARNING,
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column('uuid', { nullable: true })
  vitalReadingId: string;

  @Column('jsonb', { nullable: true })
  triggerData: {
    vitalType?: string;
    value?: number;
    threshold?: number;
    trend?: string;
    prediction?: {
      risk: number;
      condition: string;
      timeframe: string;
    };
  };

  // AI recommendation
  @Column('text', { nullable: true })
  aiRecommendation: string;

  @Column({ type: 'float', nullable: true })
  aiConfidence: number;

  // Acknowledgment
  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column('uuid', { nullable: true })
  acknowledgedBy: string;

  // Resolution
  @Column({ nullable: true })
  resolvedAt: Date;

  @Column('uuid', { nullable: true })
  resolvedBy: string;

  @Column('text', { nullable: true })
  resolution: string;

  @Column('text', { nullable: true })
  notes: string;

  // Notification tracking
  @Column({ default: false })
  pushSent: boolean;

  @Column({ default: false })
  smsSent: boolean;

  @Column({ default: false })
  emailSent: boolean;

  @Column({ nullable: true })
  lastNotificationAt: Date;

  @Column({ default: 0 })
  escalationLevel: number;

  @Column({ nullable: true })
  nextEscalationAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
