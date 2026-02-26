import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  EncryptedJsonTransformer,
  EncryptedColumnTransformer,
} from '../../common/crypto/encrypted-column.transformer';

export enum VitalType {
  BLOOD_PRESSURE = 'blood_pressure',
  BLOOD_GLUCOSE = 'blood_glucose',
  GLUCOSE = 'glucose',
  SPO2 = 'spo2',
  WEIGHT = 'weight',
  HEART_RATE = 'heart_rate',
  TEMPERATURE = 'temperature',
  RESPIRATORY_RATE = 'respiratory_rate',
  ECG = 'ecg',
}

export enum VitalStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('vital_readings')
@Index(['patientId', 'type', 'recordedAt'])
@Index(['patientId', 'recordedAt'])
export class VitalReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  patientId: string;

  @Column('uuid', { nullable: true })
  deviceId: string;

  @Column('uuid', { nullable: true })
  providerId: string;

  @Column({
    type: 'enum',
    enum: VitalType,
  })
  type: VitalType;

  @Column({ type: 'text', transformer: EncryptedJsonTransformer })
  values: Record<string, number>;

  @Column({ type: 'float', nullable: true })
  value: number;

  @Column({ type: 'float', nullable: true })
  systolic: number;

  @Column({ type: 'float', nullable: true })
  diastolic: number;

  @Column()
  unit: string;

  @Column({
    type: 'enum',
    enum: VitalStatus,
    default: VitalStatus.NORMAL,
  })
  status: VitalStatus;

  @Column({ type: 'timestamp' })
  @Index()
  recordedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  timestampDevice: Date;

  @Column({ type: 'timestamp', nullable: true })
  timestampReceived: Date;

  @Column({ default: true })
  isValid: boolean;

  @Column({ default: false })
  isOutlier: boolean;

  @Column({ type: 'int', nullable: true })
  qualityScore: number;

  @Column({ nullable: true })
  mealContext: string; // fasting, before_meal, after_meal, bedtime

  @Column({ nullable: true, transformer: EncryptedColumnTransformer })
  notes: string;

  // Device metadata
  @Column({ nullable: true })
  deviceSerial: string;

  @Column({ nullable: true })
  deviceModel: string;

  @Column({ nullable: true })
  firmwareVersion: string;

  @Column({ nullable: true })
  batteryLevel: number;

  // Processing metadata
  @Column({ default: false })
  aiProcessed: boolean;

  @Column('jsonb', { nullable: true })
  aiAnalysis: {
    trend?: string;
    anomaly?: boolean;
    riskContribution?: number;
    recommendations?: string[];
  };

  @Column({ default: false })
  alertGenerated: boolean;

  @Column('uuid', { nullable: true })
  alertId: string;

  // Raw data from device (PHI - encrypted)
  @Column({ type: 'text', nullable: true, transformer: EncryptedJsonTransformer })
  rawData: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
