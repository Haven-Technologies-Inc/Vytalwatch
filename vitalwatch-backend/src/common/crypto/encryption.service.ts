/**
 * VitalWatch Encryption Service
 * HIPAA-compliant PHI encryption at rest using AES-256-GCM
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { initializeEncryptionKey } from './encrypted-column.transformer';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly saltLength = 32;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key || key.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be set and at least 32 characters for HIPAA compliance',
      );
    }
    // Derive a 256-bit key using PBKDF2
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      'vitalwatch-phi-salt',
      100000,
      32,
      'sha256',
    );
    // Initialize the column transformer encryption key
    initializeEncryptionKey(key);
  }

  /**
   * Encrypt PHI data using AES-256-GCM
   * Returns base64 encoded string: iv:authTag:encryptedData
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv, {
      authTagLength: this.authTagLength,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt PHI data
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
        { authTagLength: this.authTagLength },
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If decryption fails, return original (may be unencrypted legacy data)
      console.warn('Decryption failed, returning original data');
      return encryptedData;
    }
  }

  /**
   * Hash sensitive data (one-way, for SSN storage)
   */
  hash(data: string): string {
    if (!data) return data;
    return crypto
      .createHmac('sha256', this.encryptionKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Encrypt an object's PHI fields
   */
  encryptPHI<T extends Record<string, any>>(
    data: T,
    phiFields: (keyof T)[],
  ): T {
    const encrypted = { ...data };
    for (const field of phiFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field] as string) as T[keyof T];
      }
    }
    return encrypted;
  }

  /**
   * Decrypt an object's PHI fields
   */
  decryptPHI<T extends Record<string, any>>(
    data: T,
    phiFields: (keyof T)[],
  ): T {
    const decrypted = { ...data };
    for (const field of phiFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        decrypted[field] = this.decrypt(decrypted[field] as string) as T[keyof T];
      }
    }
    return decrypted;
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure password hash with salt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.saltLength);
    const hash = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    const saltBuffer = Buffer.from(salt, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, saltBuffer, 100000, 64, 'sha512', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    return crypto.timingSafeEqual(hashBuffer, derivedKey);
  }
}

// PHI fields that require encryption
export const PHI_FIELDS = {
  USER: ['phone', 'emergencyContactPhone'],
  PATIENT: [
    'dateOfBirth',
    'ssn',
    'insurancePolicyNumber',
    'insuranceGroupNumber',
    'emergencyContactName',
    'emergencyContactPhone',
  ],
  MEDICATION: ['notes'],
  BILLING: ['insuranceClaimId'],
} as const;
