/**
 * TypeORM Column Transformer for HIPAA-compliant PHI Encryption
 * Automatically encrypts data on write and decrypts on read
 */

import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

let encryptionKey: Buffer | null = null;
const algorithm = 'aes-256-gcm';
const ivLength = 16;
const authTagLength = 16;

export function initializeEncryptionKey(key: string): void {
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters for HIPAA compliance');
  }
  encryptionKey = crypto.pbkdf2Sync(key, 'vitalwatch-phi-salt', 100000, 32, 'sha256');
}

function encrypt(plaintext: string): string {
  if (!plaintext || !encryptionKey) return plaintext;

  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv, {
    authTagLength,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `ENC:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  if (!encryptedData || !encryptionKey) return encryptedData;
  if (!encryptedData.startsWith('ENC:')) return encryptedData;

  try {
    const parts = encryptedData.slice(4).split(':');
    if (parts.length !== 3) return encryptedData;

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv, {
      authTagLength,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return encryptedData;
  }
}

/**
 * Transformer for encrypting string columns
 */
export const EncryptedColumnTransformer: ValueTransformer = {
  to: (value: string | null): string | null => {
    if (value === null || value === undefined) return value;
    return encrypt(String(value));
  },
  from: (value: string | null): string | null => {
    if (value === null || value === undefined) return value;
    return decrypt(value);
  },
};

/**
 * Transformer for encrypting JSON columns
 */
export const EncryptedJsonTransformer: ValueTransformer = {
  to: (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const json = JSON.stringify(value);
    return encrypt(json);
  },
  from: (value: string | null): unknown => {
    if (value === null || value === undefined) return value;
    const decrypted = decrypt(value);
    try {
      return JSON.parse(decrypted);
    } catch {
      return value;
    }
  },
};

/**
 * Transformer for encrypting date columns (stored as ISO string)
 */
export const EncryptedDateTransformer: ValueTransformer = {
  to: (value: Date | string | null): string | null => {
    if (value === null || value === undefined) return null;
    const dateStr = value instanceof Date ? value.toISOString() : String(value);
    return encrypt(dateStr);
  },
  from: (value: string | null): Date | null => {
    if (value === null || value === undefined) return null;
    const decrypted = decrypt(value);
    try {
      return new Date(decrypted);
    } catch {
      return null;
    }
  },
};

/**
 * Transformer for encrypting numeric values
 */
export const EncryptedNumberTransformer: ValueTransformer = {
  to: (value: number | null): string | null => {
    if (value === null || value === undefined) return null;
    return encrypt(String(value));
  },
  from: (value: string | null): number | null => {
    if (value === null || value === undefined) return null;
    const decrypted = decrypt(value);
    const num = parseFloat(decrypted);
    return isNaN(num) ? null : num;
  },
};

/**
 * Hash transformer for one-way hashing (SSN lookup)
 */
export const HashedColumnTransformer: ValueTransformer = {
  to: (value: string | null): string | null => {
    if (value === null || value === undefined || !encryptionKey) return value;
    return crypto.createHmac('sha256', encryptionKey).update(value).digest('hex');
  },
  from: (value: string | null): string | null => {
    return value;
  },
};
