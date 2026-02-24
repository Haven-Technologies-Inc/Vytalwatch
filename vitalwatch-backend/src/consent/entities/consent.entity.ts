import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ConsentType {
  RPM_ENROLLMENT = 'rpm_enrollment',
  TELEHEALTH = 'telehealth',
  DATA_SHARING = 'data_sharing',
  HIPAA = 'hipaa',
  TREATMENT = 'treatment',
  BILLING = 'billing',
  COMMUNICATION = 'communication',
  RESEARCH = 'research',
  GENERAL = 'general',
}

export enum ConsentStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('consent_templates')
@Index(['type'])
@Index(['organizationId'])
export class ConsentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ConsentType })
  type: ConsentType;

  @Column()
  version: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  requiresWitness: boolean;

  @Column({ default: false })
  requiresGuardian: boolean;

  @Column({ type: 'int', nullable: true })
  expirationDays: number;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  requiredFields: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('patient_consents')
@Index(['patientId', 'type'])
@Index(['patientId', 'status'])
@Index(['organizationId'])
export class PatientConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  templateId: string;

  @ManyToOne(() => ConsentTemplate)
  @JoinColumn({ name: 'templateId' })
  template: ConsentTemplate;

  @Column({ type: 'enum', enum: ConsentType })
  type: ConsentType;

  @Column({ type: 'enum', enum: ConsentStatus, default: ConsentStatus.PENDING })
  status: ConsentStatus;

  @Column()
  version: string;

  @Column({ type: 'text' })
  consentContent: string;

  @Column({ type: 'timestamp', nullable: true })
  signedAt: Date;

  @Column({ nullable: true })
  signatureData: string;

  @Column({ nullable: true })
  signatureIp: string;

  @Column({ nullable: true })
  signatureUserAgent: string;

  @Column({ nullable: true })
  witnessId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'witnessId' })
  witness: User;

  @Column({ type: 'timestamp', nullable: true })
  witnessSignedAt: Date;

  @Column({ nullable: true })
  guardianName: string;

  @Column({ nullable: true })
  guardianRelationship: string;

  @Column({ nullable: true })
  guardianSignature: string;

  @Column({ type: 'date', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedBy: string;

  @Column({ type: 'text', nullable: true })
  revocationReason: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastReminderSentAt: Date;

  @Column({ type: 'int', default: 0 })
  reminderCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
