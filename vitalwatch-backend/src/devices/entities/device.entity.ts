import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DeviceType {
  BLOOD_PRESSURE_MONITOR = 'blood_pressure_monitor',
  GLUCOSE_METER = 'glucose_meter',
  PULSE_OXIMETER = 'pulse_oximeter',
  WEIGHT_SCALE = 'weight_scale',
  THERMOMETER = 'thermometer',
  ECG_MONITOR = 'ecg_monitor',
  ACTIVITY_TRACKER = 'activity_tracker',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONNECTED = 'disconnected',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum DeviceVendor {
  TENOVI = 'tenovi',
  WITHINGS = 'withings',
  OMRON = 'omron',
  DEXCOM = 'dexcom',
  ABBOTT = 'abbott',
  OTHER = 'other',
}

@Entity('devices')
@Index(['patientId', 'status'])
@Index(['serialNumber'], { unique: true })
@Index(['tenoviDeviceId'])
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column({ type: 'enum', enum: DeviceType })
  type: DeviceType;

  @Column({ type: 'enum', enum: DeviceVendor, default: DeviceVendor.TENOVI })
  vendor: DeviceVendor;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.INACTIVE })
  status: DeviceStatus;

  @Column()
  name: string;

  @Column({ nullable: true })
  model: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column({ nullable: true })
  tenoviDeviceId: string;

  @Column({ nullable: true })
  firmwareVersion: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastReadingAt: Date;

  @Column({ default: 0 })
  totalReadings: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  batteryLevel: number;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
