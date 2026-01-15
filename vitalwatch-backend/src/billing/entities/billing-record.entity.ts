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

export enum CPTCode {
  INITIAL_SETUP = '99453',      // Initial setup and patient education (once)
  DEVICE_SUPPLY = '99454',       // Device supply with daily recordings (monthly)
  CLINICAL_REVIEW_20 = '99457',  // First 20 minutes of clinical staff time (monthly)
  CLINICAL_REVIEW_ADDITIONAL = '99458', // Additional 20 minutes (monthly, up to 2x)
}

export enum BillingStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  DENIED = 'denied',
  PAID = 'paid',
}

@Entity('billing_records')
@Index(['patientId', 'serviceDate'])
@Index(['providerId', 'status'])
@Index(['cptCode', 'serviceDate'])
export class BillingRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'enum', enum: CPTCode })
  cptCode: CPTCode;

  @Column({ type: 'enum', enum: BillingStatus, default: BillingStatus.PENDING })
  status: BillingStatus;

  @Column({ type: 'date' })
  serviceDate: Date;

  @Column({ type: 'date' })
  billingPeriodStart: Date;

  @Column({ type: 'date' })
  billingPeriodEnd: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 0 })
  minutesSpent: number;

  @Column({ default: 0 })
  daysWithReadings: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  supportingData: {
    vitalReadingIds?: string[];
    alertIds?: string[];
    interactionNotes?: string[];
    deviceTransmissions?: number;
  };

  @Column({ nullable: true })
  claimNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
