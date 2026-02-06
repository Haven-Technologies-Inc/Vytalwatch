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

export enum ClaimStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  ACCEPTED = 'accepted',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  DENIED = 'denied',
  APPEALED = 'appealed',
  CANCELLED = 'cancelled',
}

export enum ClaimType {
  RPM = 'rpm',
  TELEHEALTH = 'telehealth',
  OFFICE_VISIT = 'office_visit',
  PROCEDURE = 'procedure',
  DIAGNOSTIC = 'diagnostic',
}

@Entity('claims')
@Index(['patientId', 'status'])
@Index(['providerId', 'status'])
@Index(['serviceDate'])
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  claimNumber: string; // Auto-generated unique claim number

  @Column({
    type: 'enum',
    enum: ClaimType,
  })
  type: ClaimType;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.DRAFT,
  })
  @Index()
  status: ClaimStatus;

  // Patient information
  @Column('uuid')
  @Index()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  // Provider information
  @Column('uuid')
  @Index()
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column('uuid', { nullable: true })
  organizationId: string;

  // Service details
  @Column({ type: 'date' })
  @Index()
  serviceDate: Date;

  @Column({ type: 'date', nullable: true })
  serviceEndDate: Date;

  // CPT codes
  @Column('jsonb')
  cptCodes: Array<{
    code: string;
    description: string;
    units: number;
    charge: number;
    modifiers?: string[];
  }>;

  // ICD-10 diagnosis codes
  @Column('jsonb')
  diagnosisCodes: Array<{
    code: string;
    description: string;
    isPrimary: boolean;
  }>;

  // Financial
  @Column('decimal', { precision: 10, scale: 2 })
  totalCharge: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  adjustedAmount: number; // Write-offs, contractual adjustments

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  patientResponsibility: number; // Copay, coinsurance, deductible

  // Insurance information
  @Column({ nullable: true })
  primaryInsuranceName: string;

  @Column({ nullable: true })
  primaryInsuranceId: string;

  @Column({ nullable: true })
  primaryGroupNumber: string;

  @Column({ nullable: true })
  secondaryInsuranceName: string;

  @Column({ nullable: true })
  secondaryInsuranceId: string;

  // Submission
  @Column({ nullable: true })
  submittedAt: Date;

  @Column({ nullable: true })
  submittedBy: string;

  @Column({ nullable: true })
  submissionMethod: string; // electronic, paper, clearinghouse

  @Column({ nullable: true })
  clearinghouseId: string;

  // Response
  @Column({ nullable: true })
  responseReceivedAt: Date;

  @Column({ nullable: true })
  paymentReceivedAt: Date;

  @Column({ nullable: true })
  denialReason: string;

  @Column('text', { nullable: true })
  denialDetails: string;

  // Supporting documentation
  @Column('jsonb', { nullable: true })
  supportingDocuments: Array<{
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;

  // Link to billing records and clinical data
  @Column('simple-array', { nullable: true })
  billingRecordIds: string[];

  @Column('simple-array', { nullable: true })
  vitalReadingIds: string[];

  @Column('simple-array', { nullable: true })
  alertIds: string[];

  @Column('simple-array', { nullable: true })
  clinicalNoteIds: string[];

  // Appeal information
  @Column({ nullable: true })
  appealedAt: Date;

  @Column({ nullable: true })
  appealReason: string;

  @Column({ nullable: true })
  appealResolutionDate: Date;

  @Column({ nullable: true })
  appealOutcome: string; // approved, denied, partially_approved

  // Additional metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
