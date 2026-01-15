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

export enum UserRole {
  PATIENT = 'patient',
  PROVIDER = 'provider',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
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

  @Column({ nullable: true })
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

  @Column({ nullable: true })
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

  // Patient-specific fields
  @Column({ type: 'date', nullable: true })
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
