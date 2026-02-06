/**
 * Constants for the encryption system
 */

/**
 * Encryption algorithm constants
 */
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const KEY_LENGTH = 32; // 256 bits
export const IV_LENGTH = 16; // 128 bits for GCM
export const AUTH_TAG_LENGTH = 16; // 128 bits
export const SALT_LENGTH = 32; // 256 bits

/**
 * Key derivation constants (PBKDF2)
 */
export const PBKDF2_ITERATIONS = 100000; // NIST recommendation
export const PBKDF2_DIGEST = 'sha512';
export const PBKDF2_KEY_LENGTH = 32; // 256 bits

/**
 * Key rotation defaults
 */
export const DEFAULT_ROTATION_INTERVAL_DAYS = 90; // Rotate every 90 days
export const DEFAULT_GRACE_PERIOD_DAYS = 30; // Keep old keys for 30 days
export const DEFAULT_NOTIFY_BEFORE_DAYS = 7; // Notify 7 days before expiration

/**
 * Encryption metadata version
 */
export const ENCRYPTION_METADATA_VERSION = 1;

/**
 * Batch operation defaults
 */
export const DEFAULT_BATCH_SIZE = 100;
export const DEFAULT_MAX_PARALLEL = 5;

/**
 * Key version prefix for storage
 */
export const KEY_VERSION_PREFIX = 'encryption_key_v';

/**
 * Environment variable names
 */
export const ENV_MASTER_KEY = 'ENCRYPTION_MASTER_KEY';
export const ENV_AWS_KMS_KEY_ID = 'AWS_KMS_KEY_ID';
export const ENV_AZURE_KEY_VAULT_URL = 'AZURE_KEY_VAULT_URL';
export const ENV_KEY_ROTATION_ENABLED = 'KEY_ROTATION_ENABLED';
export const ENV_KEY_ROTATION_INTERVAL_DAYS = 'KEY_ROTATION_INTERVAL_DAYS';

/**
 * Audit log event types
 */
export const AUDIT_EVENT_ENCRYPT = 'encrypt';
export const AUDIT_EVENT_DECRYPT = 'decrypt';
export const AUDIT_EVENT_KEY_ROTATION = 'key_rotation';
export const AUDIT_EVENT_KEY_ACCESS = 'key_access';
export const AUDIT_EVENT_KEY_CREATED = 'key_created';
export const AUDIT_EVENT_KEY_DEACTIVATED = 'key_deactivated';

/**
 * Error messages
 */
export const ERROR_NO_MASTER_KEY = 'Master encryption key not configured. Set ENCRYPTION_MASTER_KEY environment variable.';
export const ERROR_INVALID_KEY_VERSION = 'Invalid or inactive key version';
export const ERROR_DECRYPTION_FAILED = 'Failed to decrypt data. Data may be corrupted or key is incorrect.';
export const ERROR_ENCRYPTION_FAILED = 'Failed to encrypt data';
export const ERROR_KEY_NOT_FOUND = 'Encryption key not found';
export const ERROR_INVALID_DATA_TYPE = 'Invalid data type for encryption';

/**
 * Cache TTL (in seconds)
 */
export const KEY_CACHE_TTL = 3600; // 1 hour
export const DERIVED_KEY_CACHE_TTL = 86400; // 24 hours

/**
 * Timing attack prevention - constant time comparison
 */
export const TIMING_SAFE_EQUAL_LENGTH = 32;

/**
 * Maximum encrypted data age (for validation)
 */
export const MAX_ENCRYPTED_DATA_AGE_DAYS = 365; // 1 year

/**
 * Supported key storage providers
 */
export enum KeyStorageProvider {
  ENV_VARIABLE = 'env',
  AWS_KMS = 'aws_kms',
  AZURE_KEY_VAULT = 'azure_key_vault',
  HASHICORP_VAULT = 'hashicorp_vault',
  DATABASE = 'database', // Not recommended for production
}

/**
 * PHI field identifiers for automated encryption detection
 */
export const PHI_FIELD_PATTERNS = [
  /ssn/i,
  /social.?security/i,
  /date.?of.?birth/i,
  /dob/i,
  /phone/i,
  /email/i,
  /address/i,
  /license/i,
  /medical.?record/i,
  /mrn/i,
  /diagnosis/i,
  /prescription/i,
  /treatment/i,
];
