import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EncryptedColumn } from '../decorators/encrypted-column.decorator';

/**
 * Example: User entity with field-level encryption
 *
 * This is an example of how to update the User entity to use @EncryptedColumn()
 * for PHI fields that require encryption.
 *
 * Encrypted fields:
 * - ssn: Social Security Number (highly sensitive)
 * - dateOfBirth: Date of birth (PHI)
 * - phone: Phone number (PII/PHI)
 * - email: Email address (PII)
 * - address: Physical address (PHI)
 * - mfaSecret: MFA secret (sensitive credential)
 *
 * Steps to implement:
 * 1. Add encrypted columns to database (run migration)
 * 2. Encrypt existing data (run migration helper)
 * 3. Replace @Column() with @EncryptedColumn() for sensitive fields
 * 4. Test thoroughly
 * 5. Drop plaintext columns (optional)
 */

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

  // ========== ENCRYPTED FIELDS (PHI/PII) ==========

  /**
   * Email - Encrypted
   * Note: Search/indexing on encrypted fields requires special handling
   * Consider maintaining a hashed version for lookups if needed
   */
  @EncryptedColumn({
    columnOptions: { unique: false }, // Cannot enforce uniqueness on encrypted field
  })
  email: string;

  /**
   * Phone - Encrypted
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  phone: string;

  /**
   * Date of Birth - Encrypted
   * Supports Date objects - will be serialized/deserialized automatically
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  dateOfBirth: Date;

  /**
   * Address - Encrypted
   * Can encrypt complex objects (will be stored as JSON)
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  address: string;

  /**
   * SSN - Encrypted (if you decide to add this field)
   * Highly sensitive - should always be encrypted
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  ssn: string;

  /**
   * MFA Secret - Encrypted
   * Security credential that must be encrypted
   */
  @EncryptedColumn({ columnOptions: { nullable: true } })
  mfaSecret: string;

  // ========== HASHED FIELDS (for lookup/search) ==========
  // For fields that need to be searchable, store a hash alongside encrypted version

  /**
   * Email hash for lookup/uniqueness
   * This is a one-way hash used for finding users by email
   * The actual email is stored encrypted above
   */
  @Column({ unique: true })
  emailHash: string; // SHA-256 hash of email for lookups

  /**
   * Phone hash for lookup (optional)
   */
  @Column({ nullable: true })
  phoneHash: string; // SHA-256 hash of phone for lookups

  // ========== UNENCRYPTED FIELDS ==========
  // These fields don't contain sensitive PHI/PII

  @Column({ nullable: true })
  passwordHash: string; // Already hashed, no need to encrypt

  @Column()
  firstName: string; // Not considered PHI in most contexts

  @Column()
  lastName: string; // Not considered PHI in most contexts

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

  /**
   * Helper method: Set email (encrypts and creates hash)
   * Use this instead of directly setting email property
   */
  setEmail(email: string): void {
    this.email = email;
    this.emailHash = this.hashValue(email);
  }

  /**
   * Helper method: Set phone (encrypts and creates hash)
   */
  setPhone(phone: string): void {
    this.phone = phone;
    this.phoneHash = phone ? this.hashValue(phone) : null;
  }

  /**
   * Create SHA-256 hash for lookup
   */
  private hashValue(value: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex');
  }
}

/**
 * MIGRATION NOTES:
 *
 * 1. Add encrypted columns:
 *    ALTER TABLE users ADD COLUMN email_encrypted TEXT;
 *    ALTER TABLE users ADD COLUMN phone_encrypted TEXT;
 *    ALTER TABLE users ADD COLUMN dateOfBirth_encrypted TEXT;
 *    ALTER TABLE users ADD COLUMN address_encrypted TEXT;
 *    ALTER TABLE users ADD COLUMN ssn_encrypted TEXT;
 *    ALTER TABLE users ADD COLUMN mfaSecret_encrypted TEXT;
 *    ALTER TABLE users ADD COLUMN emailHash VARCHAR(64);
 *    ALTER TABLE users ADD COLUMN phoneHash VARCHAR(64);
 *    CREATE UNIQUE INDEX idx_users_email_hash ON users(emailHash);
 *
 * 2. Encrypt existing data:
 *    - Run UserEncryptionMigrationService.encryptUserData()
 *    - This will encrypt all existing plaintext data
 *
 * 3. Create hashes for existing data:
 *    UPDATE users SET emailHash = encode(digest(lower(email), 'sha256'), 'hex');
 *    UPDATE users SET phoneHash = encode(digest(lower(phone), 'sha256'), 'hex') WHERE phone IS NOT NULL;
 *
 * 4. Verify encryption:
 *    - Run UserEncryptionMigrationService.verifyUserEncryption()
 *
 * 5. Update entity (replace this file with src/users/entities/user.entity.ts)
 *
 * 6. Update services to use setEmail() and setPhone() methods
 *
 * 7. Test thoroughly
 *
 * 8. (Optional) Drop plaintext columns:
 *    ALTER TABLE users DROP COLUMN email;
 *    ALTER TABLE users DROP COLUMN phone;
 *    ALTER TABLE users DROP COLUMN dateOfBirth;
 *    ALTER TABLE users DROP COLUMN address;
 *    ALTER TABLE users DROP COLUMN ssn;
 *    ALTER TABLE users DROP COLUMN mfaSecret;
 */
