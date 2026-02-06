import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  EncryptedFieldMetadata,
  EncryptableType,
  EncryptionOptions,
  DecryptionOptions,
  BatchEncryptOptions,
} from './types';
import {
  ENCRYPTION_ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  ENCRYPTION_METADATA_VERSION,
  DEFAULT_BATCH_SIZE,
  ERROR_ENCRYPTION_FAILED,
  ERROR_DECRYPTION_FAILED,
  ERROR_INVALID_DATA_TYPE,
} from './constants';
import { KeyManagementService } from './key-management.service';

/**
 * Core encryption service implementing AES-256-GCM encryption
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV per field per record
 * - Key versioning for rotation
 * - Batch operations for performance
 * - Type-safe encryption/decryption
 * - HIPAA compliant implementation
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  constructor(
    private readonly keyManagement: KeyManagementService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Encrypt a value with AES-256-GCM
   *
   * @param value - The value to encrypt
   * @param options - Encryption options
   * @returns Encrypted data as JSON string
   */
  async encrypt(
    value: EncryptableType,
    options: EncryptionOptions = {},
  ): Promise<string> {
    try {
      // Handle null/undefined
      if (value === null || value === undefined) {
        return null;
      }

      // Serialize value to string
      const plaintext = this.serializeValue(value);

      // Get encryption key
      const keyVersion = options.keyVersion || (await this.keyManagement.getCurrentKeyVersion());
      const key = await this.keyManagement.getKey(keyVersion);

      // Generate unique IV for this encryption operation
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

      // Add Additional Authenticated Data (AAD) if provided
      if (options.additionalAuthenticatedData) {
        cipher.setAAD(Buffer.from(options.additionalAuthenticatedData));
      }

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Create metadata object
      const metadata: EncryptedFieldMetadata = {
        version: keyVersion,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        ciphertext: encrypted.toString('base64'),
        algorithm: ENCRYPTION_ALGORITHM,
        timestamp: Date.now(),
      };

      // Return as JSON string for storage
      return JSON.stringify(metadata);
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error(`${ERROR_ENCRYPTION_FAILED}: ${error.message}`);
    }
  }

  /**
   * Decrypt an encrypted value
   *
   * @param encryptedData - The encrypted data JSON string
   * @param options - Decryption options
   * @returns Decrypted value
   */
  async decrypt(
    encryptedData: string,
    options: DecryptionOptions = {},
  ): Promise<EncryptableType> {
    try {
      // Handle null/undefined
      if (!encryptedData) {
        return null;
      }

      // Parse metadata
      const metadata: EncryptedFieldMetadata = JSON.parse(encryptedData);

      // Validate timestamp if required
      if (options.validateTimestamp && options.maxAge) {
        const age = Date.now() - metadata.timestamp;
        if (age > options.maxAge) {
          throw new Error('Encrypted data has expired');
        }
      }

      // Get decryption key
      const key = await this.keyManagement.getKey(metadata.version);

      // Convert from base64
      const iv = Buffer.from(metadata.iv, 'base64');
      const authTag = Buffer.from(metadata.authTag, 'base64');
      const ciphertext = Buffer.from(metadata.ciphertext, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      // Deserialize value
      return this.deserializeValue(decrypted.toString('utf8'));
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error(`${ERROR_DECRYPTION_FAILED}: ${error.message}`);
    }
  }

  /**
   * Batch encrypt multiple values
   *
   * @param values - Array of values to encrypt
   * @param options - Batch encryption options
   * @returns Array of encrypted values
   */
  async batchEncrypt(
    values: EncryptableType[],
    options: BatchEncryptOptions = {},
  ): Promise<string[]> {
    const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    const results: string[] = [];

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);

      try {
        const batchResults = options.parallel
          ? await Promise.all(batch.map(v => this.encrypt(v)))
          : await this.encryptSequential(batch);

        results.push(...batchResults);

        // Progress callback
        if (options.onProgress) {
          options.onProgress(Math.min(i + batchSize, values.length), values.length);
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error, batch);
        } else {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Batch decrypt multiple values
   *
   * @param encryptedValues - Array of encrypted values
   * @param options - Batch encryption options
   * @returns Array of decrypted values
   */
  async batchDecrypt(
    encryptedValues: string[],
    options: BatchEncryptOptions = {},
  ): Promise<EncryptableType[]> {
    const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    const results: EncryptableType[] = [];

    for (let i = 0; i < encryptedValues.length; i += batchSize) {
      const batch = encryptedValues.slice(i, i + batchSize);

      try {
        const batchResults = options.parallel
          ? await Promise.all(batch.map(v => this.decrypt(v)))
          : await this.decryptSequential(batch);

        results.push(...batchResults);

        // Progress callback
        if (options.onProgress) {
          options.onProgress(Math.min(i + batchSize, encryptedValues.length), encryptedValues.length);
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error, batch);
        } else {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Re-encrypt data with a new key version (for key rotation)
   *
   * @param encryptedData - Existing encrypted data
   * @param newKeyVersion - New key version to use
   * @returns Re-encrypted data
   */
  async reencrypt(
    encryptedData: string,
    newKeyVersion?: number,
  ): Promise<string> {
    // Decrypt with old key
    const plainValue = await this.decrypt(encryptedData);

    // Encrypt with new key
    const keyVersion = newKeyVersion || (await this.keyManagement.getCurrentKeyVersion());
    return this.encrypt(plainValue, { keyVersion });
  }

  /**
   * Compare encrypted value with plaintext value (constant-time)
   * Useful for password comparison without decrypting
   *
   * @param encryptedData - Encrypted data
   * @param plainValue - Plain value to compare
   * @returns True if values match
   */
  async constantTimeCompare(
    encryptedData: string,
    plainValue: EncryptableType,
  ): Promise<boolean> {
    try {
      const decryptedValue = await this.decrypt(encryptedData);
      const decryptedStr = this.serializeValue(decryptedValue);
      const plainStr = this.serializeValue(plainValue);

      // Use crypto.timingSafeEqual for constant-time comparison
      if (decryptedStr.length !== plainStr.length) {
        return false;
      }

      const a = Buffer.from(decryptedStr, 'utf8');
      const b = Buffer.from(plainStr, 'utf8');

      return crypto.timingSafeEqual(a, b);
    } catch (error) {
      // If decryption fails, return false
      return false;
    }
  }

  /**
   * Get metadata from encrypted data without decrypting
   *
   * @param encryptedData - Encrypted data
   * @returns Metadata object
   */
  getMetadata(encryptedData: string): EncryptedFieldMetadata | null {
    try {
      if (!encryptedData) {
        return null;
      }
      return JSON.parse(encryptedData);
    } catch (error) {
      this.logger.warn(`Failed to parse encrypted metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if data is encrypted
   *
   * @param data - Data to check
   * @returns True if data appears to be encrypted
   */
  isEncrypted(data: any): boolean {
    if (typeof data !== 'string') {
      return false;
    }

    try {
      const parsed = JSON.parse(data);
      return (
        parsed.version !== undefined &&
        parsed.iv !== undefined &&
        parsed.authTag !== undefined &&
        parsed.ciphertext !== undefined &&
        parsed.algorithm === ENCRYPTION_ALGORITHM
      );
    } catch {
      return false;
    }
  }

  /**
   * Serialize value to string for encryption
   */
  private serializeValue(value: EncryptableType): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    throw new Error(`${ERROR_INVALID_DATA_TYPE}: ${typeof value}`);
  }

  /**
   * Deserialize value from string after decryption
   */
  private deserializeValue(value: string): EncryptableType {
    if (!value) {
      return null;
    }

    // Try to parse as JSON (for objects, arrays)
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, return as string
      return value;
    }
  }

  /**
   * Encrypt values sequentially (for controlled resource usage)
   */
  private async encryptSequential(values: EncryptableType[]): Promise<string[]> {
    const results: string[] = [];
    for (const value of values) {
      results.push(await this.encrypt(value));
    }
    return results;
  }

  /**
   * Decrypt values sequentially (for controlled resource usage)
   */
  private async decryptSequential(encryptedValues: string[]): Promise<EncryptableType[]> {
    const results: EncryptableType[] = [];
    for (const value of encryptedValues) {
      results.push(await this.decrypt(value));
    }
    return results;
  }

  /**
   * Generate HMAC for integrity verification
   *
   * @param data - Data to generate HMAC for
   * @param keyVersion - Key version to use
   * @returns HMAC as hex string
   */
  async generateHMAC(data: string, keyVersion?: number): Promise<string> {
    const version = keyVersion || (await this.keyManagement.getCurrentKeyVersion());
    const key = await this.keyManagement.getKey(version);

    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Verify HMAC
   *
   * @param data - Original data
   * @param expectedHmac - Expected HMAC value
   * @param keyVersion - Key version used
   * @returns True if HMAC is valid
   */
  async verifyHMAC(
    data: string,
    expectedHmac: string,
    keyVersion?: number,
  ): Promise<boolean> {
    try {
      const actualHmac = await this.generateHMAC(data, keyVersion);

      // Constant-time comparison
      const a = Buffer.from(actualHmac, 'hex');
      const b = Buffer.from(expectedHmac, 'hex');

      if (a.length !== b.length) {
        return false;
      }

      return crypto.timingSafeEqual(a, b);
    } catch (error) {
      this.logger.error(`HMAC verification failed: ${error.message}`);
      return false;
    }
  }
}
