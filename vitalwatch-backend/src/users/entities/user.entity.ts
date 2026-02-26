import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  EncryptedColumnTransformer,
  EncryptedDateTransformer,
} from '../../common/crypto/encrypted-column.transformer';

export enum UserRole {
  PATIENT = 'patient',
  PROVIDER = 'provider',
  NURSE = 'nurse',
  CLINICAL_STAFF = 'clinical_staff',
  BILLING_STAFF = 'billing_staff',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
  COMPLIANCE_AUDITOR = 'compliance_auditor',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum OnboardingStep {
  REGISTERED = 'registered',
  EMAIL_VERIFIED = 'email_verified',
  PROFILE_COMPLETED = 'profile_completed',
  DEVICE_ASSIGNED = 'device_assigned',
  FIRST_READING = 'first_reading',
  COMPLETED = 'completed',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true, transformer: EncryptedColumnTransformer })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true, transformer: EncryptedColumnTransformer })
  mfaSecret: string;

  @Column({ nullable: true })
  organizationId: string;

  // Provider-specific fields
  @Column({ nullable: true })
  npi: string;

  @Column({ nullable: true })
  specialty: string;

  @Column('simple-array', { nullable: true })
  credentials: string[];

  @Column('simple-array', { nullable: true })
  licenseStates: string[];

  @Column({ nullable: true })
  licenseType: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  credentialingStatus: string;

  // Patient-specific fields (PHI - encrypted)
  @Column({ type: 'varchar', nullable: true, transformer: EncryptedDateTransformer })
  dateOfBirth: Date;

  @Column('simple-array', { nullable: true })
  conditions: string[];

  @Column({ nullable: true })
  providerId: string;

  // OAuth
  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  microsoftId: string;

  @Column({ nullable: true })
  appleId: string;

  // Session management
  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ nullable: true })
  passwordChangedAt: Date;

  // Token fields
  @Column({ nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  resetToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiresAt: Date;

  // Patient assignment (for providers)
  @Column({ nullable: true })
  assignedProviderId: string;

  // Onboarding tracking (for patients)
  @Column({
    type: 'enum',
    enum: OnboardingStep,
    nullable: true,
  })
  onboardingStep: OnboardingStep;

  @Column({ type: 'simple-json', nullable: true })
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    alertTypes: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual field
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
