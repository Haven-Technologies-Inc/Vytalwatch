import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EncryptedColumn } from '../decorators/encrypted-column.decorator';

/**
 * Example: VitalReading entity with field-level encryption
 *
 * Encrypted fields:
 * - values: Actual vital sign measurements (PHI)
 * - notes: Patient notes about the reading (PHI)
 * - rawData: Raw device data (PHI)
 * - aiAnalysis: AI analysis results (PHI)
 *
 * Non-encrypted fields:
 * - type, status, timestamp: Metadata for filtering/querying
 * - patientId, deviceId: References (can be indexed)
 */

export enum VitalType {
  BLOOD_PRESSURE = 'blood_pressure',
  GLUCOSE = 'glucose',
  SPO2 = 'spo2',
  WEIGHT = 'weight',
  HEART_RATE = 'heart_rate',
  TEMPERATURE = 'temperature',
  ECG = 'ecg',
  RESPIRATORY_RATE = 'respiratory_rate',
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

  // ========== ENCRYPTED FIELDS ==========

  /**
   * Vital sign values - Encrypted as JSONB
   * For BP: { systolic: 120, diastolic: 80, heartRate: 72 }
   * For Glucose: { glucose: 105 }
   * For SpO2: { spo2: 98, heartRate: 70 }
   * For Weight: { weight: 168 }
   */
  @EncryptedColumn({
    columnOptions: { type: 'text' }, // Store encrypted JSON as text
  })
  values: Record<string, number>;

  /**
   * Patient notes - Encrypted
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  notes: string;

  /**
   * Raw device data - Encrypted
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  rawData: Record<string, unknown>;

  /**
   * AI analysis results - Encrypted
   */
  @EncryptedColumn({
    columnOptions: { type: 'text', nullable: true },
  })
  aiAnalysis: {
    trend?: string;
    anomaly?: boolean;
    riskContribution?: number;
    recommendations?: string[];
  };

  // ========== UNENCRYPTED FIELDS (for querying/filtering) ==========

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

  // Device metadata (not PHI)
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

  @Column({ default: false })
  alertGenerated: boolean;

  @Column('uuid', { nullable: true })
  alertId: string;

  @CreateDateColumn()
  createdAt: Date;
}

/**
 * MIGRATION NOTES:
 *
 * 1. Add encrypted columns:
 *    ALTER TABLE vital_readings ADD COLUMN values_encrypted TEXT;
 *    ALTER TABLE vital_readings ADD COLUMN notes_encrypted TEXT;
 *    ALTER TABLE vital_readings ADD COLUMN rawData_encrypted TEXT;
 *    ALTER TABLE vital_readings ADD COLUMN aiAnalysis_encrypted TEXT;
 *
 * 2. Encrypt existing data:
 *    Use migration helper:
 *    await encryptExistingData(dataSource, encryptionService, {
 *      tableName: 'vital_readings',
 *      fields: ['values', 'notes', 'rawData', 'aiAnalysis'],
 *      batchSize: 500, // Larger batch for vitals
 *    });
 *
 * 3. Verify encryption
 *
 * 4. Update entity (replace src/vitals/entities/vital-reading.entity.ts)
 *
 * 5. Test querying and filtering still works
 *
 * 6. (Optional) Drop plaintext columns
 */
