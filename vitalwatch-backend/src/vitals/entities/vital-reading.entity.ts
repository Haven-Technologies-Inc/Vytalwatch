import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum VitalType {
  BLOOD_PRESSURE = 'blood_pressure',
  GLUCOSE = 'glucose',
  SPO2 = 'spo2',
  WEIGHT = 'weight',
  HEART_RATE = 'heart_rate',
  TEMPERATURE = 'temperature',
  ECG = 'ecg',
}

export enum VitalStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('vital_readings')
@Index(['patientId', 'type', 'timestamp'])
@Index(['patientId', 'timestamp'])
export class VitalReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  patientId: string;

  @Column('uuid', { nullable: true })
  deviceId: string;

  @Column({
    type: 'enum',
    enum: VitalType,
  })
  type: VitalType;

  @Column('jsonb')
  values: Record<string, number>;
  // For BP: { systolic: 120, diastolic: 80, heartRate: 72 }
  // For Glucose: { glucose: 105 }
  // For SpO2: { spo2: 98, heartRate: 70 }
  // For Weight: { weight: 168 }

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
  timestamp: Date;

  @Column({ nullable: true })
  mealContext: string; // fasting, before_meal, after_meal, bedtime

  @Column({ nullable: true })
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

  // Raw data from device
  @Column('jsonb', { nullable: true })
  rawData: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
