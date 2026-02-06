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

export enum ConsentType {
  TREATMENT = 'treatment',
  DATA_COLLECTION = 'data_collection',
  DATA_SHARING = 'data_sharing',
  TELEHEALTH = 'telehealth',
  RESEARCH = 'research',
  MARKETING = 'marketing',
  DEVICE_MONITORING = 'device_monitoring',
  AI_ANALYSIS = 'ai_analysis',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  EMERGENCY_CONTACT = 'emergency_contact',
  NOTICE_OF_PRIVACY_PRACTICES = 'notice_of_privacy_practices',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('consents')
@Index(['userId', 'type', 'status'])
@Index(['userId', 'status'])
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ConsentType,
  })
  @Index()
  type: ConsentType;

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    default: ConsentStatus.PENDING,
  })
  @Index()
  status: ConsentStatus;

  @Column()
  version: string; // Version of consent form (e.g., "1.0", "2.1")

  @Column('text')
  consentText: string; // Full text of what user consented to

  @Column({ nullable: true })
  consentUrl: string; // URL to full consent document

  // Signature information
  @Column({ nullable: true })
  signatureMethod: string; // electronic, verbal, written, click_through

  @Column({ nullable: true })
  signatureData: string; // Base64 encoded signature image or confirmation text

  @Column({ nullable: true })
  signedAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  location: string; // Geolocation if available

  // Witness information (for critical consents)
  @Column('uuid', { nullable: true })
  witnessedBy: string;

  @Column({ nullable: true })
  witnessName: string;

  @Column({ nullable: true })
  witnessedAt: Date;

  // Expiration
  @Column({ nullable: true })
  expiresAt: Date;

  // Revocation
  @Column({ nullable: true })
  revokedAt: Date;

  @Column('uuid', { nullable: true })
  revokedBy: string;

  @Column('text', { nullable: true })
  revocationReason: string;

  // Additional metadata
  @Column('jsonb', { nullable: true })
  metadata: {
    organizationId?: string;
    providerId?: string;
    programId?: string;
    relatedConsents?: string[]; // IDs of related consents
    customFields?: Record<string, any>;
  };

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
