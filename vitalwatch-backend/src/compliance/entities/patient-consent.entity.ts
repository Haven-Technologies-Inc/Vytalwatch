import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ConsentType {
  RPM_MONITORING = 'rpm_monitoring',
  DATA_SHARING = 'data_sharing',
  TELEHEALTH = 'telehealth',
  MARKETING = 'marketing',
  RESEARCH = 'research',
  BILLING_AUTH = 'billing_auth',
  HIPAA_NOTICE = 'hipaa_notice',
  TREATMENT = 'treatment',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('patient_consents')
@Index(['patientId', 'consentType'])
@Index(['status', 'expiresAt'])
export class PatientConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column({ type: 'enum', enum: ConsentType })
  consentType: ConsentType;

  @Column({ type: 'enum', enum: ConsentStatus, default: ConsentStatus.PENDING })
  status: ConsentStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  consentText: string;

  @Column({ nullable: true })
  documentVersion: string;

  @Column({ type: 'timestamp', nullable: true })
  grantedAt: Date;

  @Column({ nullable: true })
  grantedBy: string;

  @Column({ nullable: true })
  grantMethod: string;

  @Column({ nullable: true })
  signatureData: string;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedBy: string;

  @Column({ nullable: true })
  revocationReason: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
