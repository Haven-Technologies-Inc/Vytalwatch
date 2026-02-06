/**
 * Field-level PHI Encryption Module
 *
 * Provides HIPAA-compliant field-level encryption for VytalWatch RPM
 *
 * @module encryption
 */

// Services
export { EncryptionService } from './encryption.service';
export { KeyManagementService } from './key-management.service';
export { EncryptionHealthService } from './encryption-health.service';

// Decorators
export {
  EncryptedColumn,
  EncryptionTransformer,
  EncryptedEntitySubscriber,
  getEncryptedColumns,
  encryptEntityFields,
  decryptEntityFields,
} from './decorators/encrypted-column.decorator';
export type { EncryptedColumnOptions } from './decorators/encrypted-column.decorator';

// Migration helpers
export {
  encryptExistingData,
  migrateToNewKey,
  generateAddEncryptedColumnsMigration,
  verifyEncryptionIntegrity,
  getEncryptionStats,
} from './migration-helpers';

// Types
export type {
  EncryptedFieldMetadata,
  EncryptionKey,
  KeyRotationConfig,
  EncryptionAuditLog,
  IKeyStorageProvider,
  EncryptionOptions,
  DecryptionOptions,
  BatchEncryptOptions,
  EncryptedData,
  EncryptableType,
  KeyDerivationOptions,
  MigrationOptions,
  EncryptionHealthCheck,
} from './types';

// Constants
export {
  ENCRYPTION_ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  SALT_LENGTH,
  PBKDF2_ITERATIONS,
  PBKDF2_DIGEST,
  DEFAULT_BATCH_SIZE,
  KeyStorageProvider,
} from './constants';

// Module
export { EncryptionModule } from './encryption.module';
