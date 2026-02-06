/**
 * Type definitions for the field-level encryption system
 */

/**
 * Encrypted field metadata
 */
export interface EncryptedFieldMetadata {
  version: number; // Key version used for encryption
  iv: string; // Initialization vector (base64)
  authTag: string; // Authentication tag for GCM (base64)
  ciphertext: string; // Encrypted data (base64)
  algorithm: string; // Encryption algorithm (e.g., 'aes-256-gcm')
  timestamp: number; // Encryption timestamp
}

/**
 * Encryption key with versioning
 */
export interface EncryptionKey {
  version: number;
  key: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  algorithm: string;
  keyDerivationParams?: {
    salt: string;
    iterations: number;
    keyLength: number;
    digest: string;
  };
}

/**
 * Key rotation configuration
 */
export interface KeyRotationConfig {
  rotationIntervalDays: number;
  gracePeriodDays: number; // Old keys remain valid for decryption
  autoRotate: boolean;
  notifyBeforeDays: number;
}

/**
 * Encryption audit log entry
 */
export interface EncryptionAuditLog {
  id: string;
  operation: 'encrypt' | 'decrypt' | 'key_rotation' | 'key_access';
  entityType: string;
  entityId: string;
  fieldName: string;
  keyVersion: number;
  userId?: string;
  ipAddress?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Batch encryption options
 */
export interface BatchEncryptOptions {
  batchSize?: number;
  parallel?: boolean;
  onProgress?: (current: number, total: number) => void;
  onError?: (error: Error, item: any) => void;
}

/**
 * Key storage provider interface
 */
export interface IKeyStorageProvider {
  /**
   * Store an encryption key
   */
  storeKey(keyId: string, key: EncryptionKey): Promise<void>;

  /**
   * Retrieve an encryption key
   */
  getKey(keyId: string): Promise<EncryptionKey | null>;

  /**
   * List all active keys
   */
  listActiveKeys(): Promise<EncryptionKey[]>;

  /**
   * Mark a key as inactive
   */
  deactivateKey(keyId: string): Promise<void>;

  /**
   * Get the current active key
   */
  getCurrentKey(): Promise<EncryptionKey>;
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
  keyVersion?: number; // Use specific key version
  additionalAuthenticatedData?: string; // AAD for GCM mode
}

/**
 * Decryption options
 */
export interface DecryptionOptions {
  validateTimestamp?: boolean;
  maxAge?: number; // Maximum age in milliseconds
}

/**
 * Encrypted data structure stored in database
 */
export type EncryptedData = string; // JSON string of EncryptedFieldMetadata

/**
 * Supported data types for encryption
 */
export type EncryptableType = string | number | boolean | object | Date | null;

/**
 * Key derivation options
 */
export interface KeyDerivationOptions {
  salt?: Buffer;
  iterations?: number;
  keyLength?: number;
  digest?: string;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  tableName: string;
  fields: string[];
  batchSize?: number;
  dryRun?: boolean;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Health check result for encryption system
 */
export interface EncryptionHealthCheck {
  healthy: boolean;
  keyAvailable: boolean;
  keyVersion: number;
  keyExpiresAt?: Date;
  daysUntilExpiration?: number;
  warnings: string[];
  errors: string[];
}
