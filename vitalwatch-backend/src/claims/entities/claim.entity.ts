import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  EncryptedColumnTransformer,
  EncryptedJsonTransformer,
} from '../../common/crypto/encrypted-column.transformer';

export enum ClaimStatus {
  DRAFT = 'draft',
  READY = 'ready',
  SUBMITTED = 'submitted',
  PAID = 'paid',
  DENIED = 'denied',
  VOID = 'void',
}

@Entity('claims')
@Index(['patientId', 'status'])
@Index(['enrollmentId'])
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column({ nullable: true, transformer: EncryptedColumnTransformer })
  patientName: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid', { nullable: true })
  clinicId: string;

  @Column({ nullable: true })
  providerName: string;

  @Column({ nullable: true })
  providerNpi: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column()
  programType: string;

  @Column({ type: 'text', transformer: EncryptedJsonTransformer })
  codes: Array<{
    cpt: string;
    code?: string;
    units: number;
    charge?: number;
    modifiers?: string[];
    dxCodes: string[];
  }>;

  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.DRAFT })
  status: ClaimStatus;

  @Column({ type: 'text', transformer: EncryptedJsonTransformer })
  readinessChecks: {
    deviceTransmission: boolean;
    readingDaysThreshold: boolean;
    readingDaysCount: number;
    interactiveTimeMinutes: number;
    interactiveTimeThreshold: boolean;
    notesSigned: boolean;
    medicalNecessity: boolean;
  };

  @Column('uuid', { nullable: true })
  supportingBundleId: string;

  @Column({ nullable: true })
  supportingBundleHash: string;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deniedAt: Date;

  @Column({ type: 'text', nullable: true, transformer: EncryptedColumnTransformer })
  denialReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paidAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
