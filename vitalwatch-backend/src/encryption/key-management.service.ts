import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  EncryptionKey,
  KeyRotationConfig,
  EncryptionAuditLog,
  IKeyStorageProvider,
  KeyDerivationOptions,
} from './types';
import {
  KEY_LENGTH,
  SALT_LENGTH,
  PBKDF2_ITERATIONS,
  PBKDF2_DIGEST,
  PBKDF2_KEY_LENGTH,
  DEFAULT_ROTATION_INTERVAL_DAYS,
  DEFAULT_GRACE_PERIOD_DAYS,
  DEFAULT_NOTIFY_BEFORE_DAYS,
  KEY_VERSION_PREFIX,
  ENV_MASTER_KEY,
  ENV_KEY_ROTATION_ENABLED,
  ENV_KEY_ROTATION_INTERVAL_DAYS,
  ERROR_NO_MASTER_KEY,
  ERROR_KEY_NOT_FOUND,
  ERROR_INVALID_KEY_VERSION,
  AUDIT_EVENT_KEY_ROTATION,
  AUDIT_EVENT_KEY_ACCESS,
  AUDIT_EVENT_KEY_CREATED,
  KEY_CACHE_TTL,
  ENCRYPTION_ALGORITHM,
} from './constants';

/**
 * Key Management Service
 *
 * Handles:
 * - Master key storage and retrieval
 * - Key derivation using PBKDF2
 * - Key versioning
 * - Automatic key rotation
 * - Key expiration
 * - Audit logging of key access
 *
 * Security Features:
 * - Keys are never stored in plaintext in the database
 * - Master key is stored in environment variable or external KMS
 * - Key derivation with PBKDF2 (100,000 iterations)
 * - Automatic rotation with grace period
 * - Comprehensive audit logging
 */
@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagementService.name);
  private readonly keyCache: Map<number, { key: Buffer; expiresAt: number }> = new Map();
  private currentKeyVersion: number = 1;
  private masterKey: Buffer;
  private rotationConfig: KeyRotationConfig;
  private keys: Map<number, EncryptionKey> = new Map();
  private auditLogs: EncryptionAuditLog[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initializeRotationConfig();
  }

  /**
   * Initialize the service
   */
  async onModuleInit() {
    try {
      await this.initializeMasterKey();
      await this.initializeKeys();
      await this.checkKeyRotation();

      this.logger.log('Key management service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize key management: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get encryption key by version
   *
   * @param version - Key version
   * @returns Encryption key as Buffer
   */
  async getKey(version: number): Promise<Buffer> {
    // Check cache first
    const cached = this.keyCache.get(version);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    // Get key from storage
    const keyData = this.keys.get(version);
    if (!keyData) {
      this.logAudit({
        operation: 'key_access',
        keyVersion: version,
        success: false,
        errorMessage: ERROR_KEY_NOT_FOUND,
      });
      throw new Error(`${ERROR_KEY_NOT_FOUND} for version ${version}`);
    }

    if (!keyData.isActive) {
      this.logAudit({
        operation: 'key_access',
        keyVersion: version,
        success: false,
        errorMessage: ERROR_INVALID_KEY_VERSION,
      });
      throw new Error(`${ERROR_INVALID_KEY_VERSION}: ${version}`);
    }

    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      this.logger.warn(`Key version ${version} has expired`);
      // Still allow for decryption during grace period
    }

    // Cache the key
    this.keyCache.set(version, {
      key: keyData.key,
      expiresAt: Date.now() + KEY_CACHE_TTL * 1000,
    });

    // Log key access
    this.logAudit({
      operation: 'key_access',
      keyVersion: version,
      success: true,
    });

    return keyData.key;
  }

  /**
   * Get current active key version
   */
  async getCurrentKeyVersion(): Promise<number> {
    return this.currentKeyVersion;
  }

  /**
   * Rotate encryption keys
   *
   * @returns New key version
   */
  async rotateKeys(): Promise<number> {
    this.logger.log('Starting key rotation...');

    try {
      // Create new key version
      const newVersion = this.currentKeyVersion + 1;
      const newKey = await this.deriveKey(newVersion);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.rotationConfig.rotationIntervalDays);

      // Store new key
      const keyData: EncryptionKey = {
        version: newVersion,
        key: newKey,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
        algorithm: ENCRYPTION_ALGORITHM,
      };

      this.keys.set(newVersion, keyData);
      this.currentKeyVersion = newVersion;

      // Deactivate old keys outside grace period
      await this.deactivateExpiredKeys();

      // Clear cache
      this.keyCache.clear();

      // Log rotation
      this.logAudit({
        operation: 'key_rotation',
        keyVersion: newVersion,
        success: true,
        metadata: {
          previousVersion: newVersion - 1,
          expiresAt: expiresAt.toISOString(),
        },
      });

      this.logger.log(`Key rotation completed. New version: ${newVersion}`);

      return newVersion;
    } catch (error) {
      this.logger.error(`Key rotation failed: ${error.message}`, error.stack);
      this.logAudit({
        operation: 'key_rotation',
        keyVersion: this.currentKeyVersion,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if key rotation is needed and perform if necessary
   */
  async checkKeyRotation(): Promise<void> {
    if (!this.rotationConfig.autoRotate) {
      return;
    }

    const currentKey = this.keys.get(this.currentKeyVersion);
    if (!currentKey) {
      this.logger.warn('No current key found, creating initial key...');
      await this.rotateKeys();
      return;
    }

    if (!currentKey.expiresAt) {
      return;
    }

    // Check if rotation is needed
    const now = new Date();
    const daysUntilExpiration = Math.floor(
      (currentKey.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiration <= 0) {
      this.logger.warn('Current key has expired. Rotating immediately.');
      await this.rotateKeys();
    } else if (daysUntilExpiration <= this.rotationConfig.notifyBeforeDays) {
      this.logger.warn(
        `Current key expires in ${daysUntilExpiration} days. Consider rotating soon.`,
      );
    }
  }

  /**
   * Get all active keys
   */
  async getActiveKeys(): Promise<EncryptionKey[]> {
    return Array.from(this.keys.values()).filter(key => key.isActive);
  }

  /**
   * Get key rotation status
   */
  async getRotationStatus(): Promise<{
    currentVersion: number;
    expiresAt?: Date;
    daysUntilExpiration?: number;
    autoRotateEnabled: boolean;
    gracePeriodDays: number;
  }> {
    const currentKey = this.keys.get(this.currentKeyVersion);

    let daysUntilExpiration: number | undefined;
    if (currentKey?.expiresAt) {
      daysUntilExpiration = Math.floor(
        (currentKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
    }

    return {
      currentVersion: this.currentKeyVersion,
      expiresAt: currentKey?.expiresAt,
      daysUntilExpiration,
      autoRotateEnabled: this.rotationConfig.autoRotate,
      gracePeriodDays: this.rotationConfig.gracePeriodDays,
    };
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit: number = 100): EncryptionAuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  /**
   * Initialize master key from environment or KMS
   */
  private async initializeMasterKey(): Promise<void> {
    const masterKeyHex = this.configService.get<string>(ENV_MASTER_KEY);

    if (!masterKeyHex) {
      throw new Error(ERROR_NO_MASTER_KEY);
    }

    // Validate master key length
    this.masterKey = Buffer.from(masterKeyHex, 'hex');

    if (this.masterKey.length !== KEY_LENGTH) {
      throw new Error(
        `Invalid master key length. Expected ${KEY_LENGTH} bytes, got ${this.masterKey.length} bytes.`,
      );
    }

    this.logger.log('Master key loaded successfully');
  }

  /**
   * Initialize encryption keys
   */
  private async initializeKeys(): Promise<void> {
    // Check if we have existing keys (in production, load from secure storage)
    // For now, we'll create the initial key

    const initialKey = await this.deriveKey(1);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.rotationConfig.rotationIntervalDays);

    const keyData: EncryptionKey = {
      version: 1,
      key: initialKey,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      algorithm: ENCRYPTION_ALGORITHM,
    };

    this.keys.set(1, keyData);
    this.currentKeyVersion = 1;

    this.logAudit({
      operation: 'key_created',
      keyVersion: 1,
      success: true,
      metadata: {
        expiresAt: expiresAt.toISOString(),
      },
    });

    this.logger.log('Initial encryption key created');
  }

  /**
   * Derive encryption key from master key using PBKDF2
   *
   * @param version - Key version (used as part of salt)
   * @param options - Key derivation options
   * @returns Derived key
   */
  private async deriveKey(
    version: number,
    options: KeyDerivationOptions = {},
  ): Promise<Buffer> {
    // Generate salt (or use provided)
    const salt = options.salt || this.generateSalt(version);
    const iterations = options.iterations || PBKDF2_ITERATIONS;
    const keyLength = options.keyLength || PBKDF2_KEY_LENGTH;
    const digest = options.digest || PBKDF2_DIGEST;

    return new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        this.masterKey,
        salt,
        iterations,
        keyLength,
        digest,
        (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            resolve(derivedKey);
          }
        },
      );
    });
  }

  /**
   * Generate deterministic salt for key version
   * This ensures the same key version always derives the same key
   */
  private generateSalt(version: number): Buffer {
    const versionBuffer = Buffer.alloc(4);
    versionBuffer.writeUInt32BE(version, 0);

    // Create deterministic salt from master key and version
    const hash = crypto.createHash('sha256');
    hash.update(this.masterKey);
    hash.update(versionBuffer);
    hash.update(Buffer.from(KEY_VERSION_PREFIX));

    return hash.digest();
  }

  /**
   * Deactivate expired keys outside grace period
   */
  private async deactivateExpiredKeys(): Promise<void> {
    const now = new Date();
    const gracePeriodMs = this.rotationConfig.gracePeriodDays * 24 * 60 * 60 * 1000;

    for (const [version, key] of this.keys.entries()) {
      if (!key.expiresAt) {
        continue;
      }

      const timeSinceExpiration = now.getTime() - key.expiresAt.getTime();

      if (timeSinceExpiration > gracePeriodMs && key.isActive) {
        key.isActive = false;
        this.logger.log(`Deactivated key version ${version} (expired beyond grace period)`);

        this.logAudit({
          operation: 'key_access',
          keyVersion: version,
          success: true,
          metadata: {
            reason: 'expired_beyond_grace_period',
            expiredAt: key.expiresAt.toISOString(),
          },
        });
      }
    }
  }

  /**
   * Initialize rotation configuration
   */
  private initializeRotationConfig(): void {
    this.rotationConfig = {
      rotationIntervalDays:
        parseInt(this.configService.get<string>(ENV_KEY_ROTATION_INTERVAL_DAYS), 10) ||
        DEFAULT_ROTATION_INTERVAL_DAYS,
      gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
      autoRotate: this.configService.get<string>(ENV_KEY_ROTATION_ENABLED) === 'true',
      notifyBeforeDays: DEFAULT_NOTIFY_BEFORE_DAYS,
    };
  }

  /**
   * Log audit event
   */
  private logAudit(
    partial: Omit<
      EncryptionAuditLog,
      'id' | 'timestamp' | 'entityType' | 'entityId' | 'fieldName'
    >,
  ): void {
    const auditLog: EncryptionAuditLog = {
      id: crypto.randomUUID(),
      entityType: 'encryption_key',
      entityId: `key_v${partial.keyVersion}`,
      fieldName: 'n/a',
      timestamp: new Date(),
      ...partial,
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // In production, write to persistent audit log storage
    if (partial.success === false || partial.operation === AUDIT_EVENT_KEY_ROTATION) {
      this.logger.log(`Audit: ${JSON.stringify(auditLog)}`);
    }
  }

  /**
   * Generate a new master key (for initial setup)
   * WARNING: Only use this for initial setup, not in production
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }
}
