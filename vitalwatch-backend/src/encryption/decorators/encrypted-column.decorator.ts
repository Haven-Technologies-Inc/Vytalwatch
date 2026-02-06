import { Column, ColumnOptions } from 'typeorm';
import { EncryptionService } from '../encryption.service';

/**
 * Metadata key for encrypted columns
 */
const ENCRYPTED_COLUMNS_KEY = Symbol('encryptedColumns');

/**
 * Store encrypted column metadata on the entity
 */
function storeEncryptedColumnMetadata(
  target: any,
  propertyKey: string,
  options?: EncryptedColumnOptions,
): void {
  const existingColumns = Reflect.getMetadata(ENCRYPTED_COLUMNS_KEY, target) || [];
  existingColumns.push({ propertyKey, options });
  Reflect.defineMetadata(ENCRYPTED_COLUMNS_KEY, existingColumns, target);
}

/**
 * Get encrypted column metadata from entity
 */
export function getEncryptedColumns(target: any): Array<{ propertyKey: string; options?: EncryptedColumnOptions }> {
  return Reflect.getMetadata(ENCRYPTED_COLUMNS_KEY, target) || [];
}

/**
 * Options for encrypted column
 */
export interface EncryptedColumnOptions {
  /**
   * TypeORM column options
   */
  columnOptions?: ColumnOptions;

  /**
   * Whether to encrypt null values (default: false)
   */
  encryptNull?: boolean;

  /**
   * Custom field name for storing encrypted data (default: same as property)
   */
  encryptedFieldName?: string;

  /**
   * Whether to store original field as well (for migration) (default: false)
   */
  keepOriginal?: boolean;

  /**
   * Additional authenticated data for GCM mode
   */
  aad?: string | ((entity: any) => string);
}

/**
 * @EncryptedColumn() decorator
 *
 * Automatically encrypts field before save and decrypts after load
 *
 * Usage:
 * ```typescript
 * @Entity()
 * class User {
 *   @EncryptedColumn()
 *   ssn: string;
 *
 *   @EncryptedColumn({ columnOptions: { nullable: true } })
 *   dateOfBirth: Date;
 *
 *   @EncryptedColumn({ columnOptions: { type: 'jsonb' } })
 *   medicalHistory: object;
 * }
 * ```
 *
 * Features:
 * - Transparent encryption/decryption
 * - Supports all data types (string, number, Date, object)
 * - Works with TypeORM lifecycle hooks
 * - Type-safe
 * - Nullable support
 *
 * @param options - Encryption options
 */
export function EncryptedColumn(options: EncryptedColumnOptions = {}): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const propertyKeyString = String(propertyKey);

    // Store metadata for later processing
    storeEncryptedColumnMetadata(target, propertyKeyString, options);

    // Determine column name (encrypted field name)
    const encryptedFieldName = options.encryptedFieldName || `${propertyKeyString}_encrypted`;

    // Create the encrypted column in database
    const columnOptions: ColumnOptions = {
      type: 'text',
      nullable: true,
      ...options.columnOptions,
    };

    // Apply TypeORM Column decorator to the encrypted field
    Column(columnOptions)(target, encryptedFieldName);

    // If keepOriginal is true, also keep the original column
    if (options.keepOriginal) {
      Column({ ...options.columnOptions, select: false })(target, propertyKeyString);
    }

    // Create a property descriptor for transparent access
    const encryptedValueKey = Symbol(`encrypted_${propertyKeyString}`);
    const decryptedValueKey = Symbol(`decrypted_${propertyKeyString}`);
    const isDirtyKey = Symbol(`dirty_${propertyKeyString}`);

    Object.defineProperty(target, propertyKey, {
      get() {
        // Return decrypted value if available
        if (this[decryptedValueKey] !== undefined) {
          return this[decryptedValueKey];
        }

        // If no decrypted value and no encrypted value, return undefined
        if (this[encryptedFieldName] === undefined || this[encryptedFieldName] === null) {
          return undefined;
        }

        // Encrypted value exists but not decrypted yet
        // This shouldn't happen if AfterLoad hook is working
        return undefined;
      },
      set(value: any) {
        // Store the plaintext value
        this[decryptedValueKey] = value;
        // Mark as dirty for encryption before save
        this[isDirtyKey] = true;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Transformer functions for TypeORM
 * These handle the encryption/decryption at the database boundary
 */
export class EncryptionTransformer {
  private static encryptionService: EncryptionService;

  /**
   * Set the encryption service instance
   * This should be called from the module initialization
   */
  static setEncryptionService(service: EncryptionService): void {
    EncryptionTransformer.encryptionService = service;
  }

  /**
   * Get the encryption service instance
   */
  private static getEncryptionService(): EncryptionService {
    if (!EncryptionTransformer.encryptionService) {
      throw new Error('EncryptionService not initialized. Call EncryptionTransformer.setEncryptionService() first.');
    }
    return EncryptionTransformer.encryptionService;
  }

  /**
   * Encrypt value before storing in database
   */
  static async encrypt(value: any, options: EncryptedColumnOptions = {}): Promise<string | null> {
    if (value === null || value === undefined) {
      return options.encryptNull ? await this.getEncryptionService().encrypt(null) : null;
    }

    return await this.getEncryptionService().encrypt(value);
  }

  /**
   * Decrypt value after loading from database
   */
  static async decrypt(encryptedValue: string | null): Promise<any> {
    if (encryptedValue === null || encryptedValue === undefined) {
      return null;
    }

    return await this.getEncryptionService().decrypt(encryptedValue);
  }
}

/**
 * Entity subscriber base class for handling encryption
 * Extend this class in your entity to enable automatic encryption/decryption
 *
 * Usage:
 * ```typescript
 * import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent, LoadEvent } from 'typeorm';
 * import { EncryptedEntitySubscriber } from './encryption/decorators/encrypted-column.decorator';
 *
 * @EventSubscriber()
 * export class UserSubscriber extends EncryptedEntitySubscriber {
 *   listenTo() {
 *     return User;
 *   }
 * }
 * ```
 */
export abstract class EncryptedEntitySubscriber<T = any> {
  /**
   * Specify which entity this subscriber is for
   */
  abstract listenTo(): Function;

  /**
   * Before insert - encrypt all encrypted columns
   */
  async beforeInsert(event: any): Promise<void> {
    await this.encryptEntity(event.entity);
  }

  /**
   * Before update - encrypt all encrypted columns
   */
  async beforeUpdate(event: any): Promise<void> {
    if (event.entity) {
      await this.encryptEntity(event.entity);
    }
  }

  /**
   * After load - decrypt all encrypted columns
   */
  async afterLoad(entity: any): Promise<void> {
    await this.decryptEntity(entity);
  }

  /**
   * Encrypt all encrypted columns in entity
   */
  private async encryptEntity(entity: T): Promise<void> {
    const encryptedColumns = getEncryptedColumns(Object.getPrototypeOf(entity));

    for (const { propertyKey, options } of encryptedColumns) {
      const encryptedFieldName = options?.encryptedFieldName || `${propertyKey}_encrypted`;
      const decryptedValueKey = Symbol.for(`decrypted_${propertyKey}`);
      const isDirtyKey = Symbol.for(`dirty_${propertyKey}`);

      // Only encrypt if value was modified
      if (entity[isDirtyKey] !== true) {
        continue;
      }

      const value = entity[decryptedValueKey];
      const encrypted = await EncryptionTransformer.encrypt(value, options);

      // Store encrypted value in the database column
      entity[encryptedFieldName] = encrypted;

      // Clear dirty flag
      entity[isDirtyKey] = false;
    }
  }

  /**
   * Decrypt all encrypted columns in entity
   */
  private async decryptEntity(entity: T): Promise<void> {
    const encryptedColumns = getEncryptedColumns(Object.getPrototypeOf(entity));

    for (const { propertyKey, options } of encryptedColumns) {
      const encryptedFieldName = options?.encryptedFieldName || `${propertyKey}_encrypted`;
      const decryptedValueKey = Symbol.for(`decrypted_${propertyKey}`);

      const encryptedValue = entity[encryptedFieldName];

      if (encryptedValue !== null && encryptedValue !== undefined) {
        try {
          const decrypted = await EncryptionTransformer.decrypt(encryptedValue);
          entity[decryptedValueKey] = decrypted;
        } catch (error) {
          // Log error but don't fail the entire load
          console.error(`Failed to decrypt ${propertyKey}:`, error.message);
          entity[decryptedValueKey] = null;
        }
      } else {
        entity[decryptedValueKey] = null;
      }
    }
  }
}

/**
 * Helper function to manually encrypt an entity
 * Useful for testing or manual migrations
 */
export async function encryptEntityFields<T>(
  entity: T,
  encryptionService: EncryptionService,
): Promise<void> {
  const encryptedColumns = getEncryptedColumns(Object.getPrototypeOf(entity));

  for (const { propertyKey, options } of encryptedColumns) {
    const encryptedFieldName = options?.encryptedFieldName || `${propertyKey}_encrypted`;
    const value = entity[propertyKey];

    if (value !== null && value !== undefined) {
      const encrypted = await encryptionService.encrypt(value);
      entity[encryptedFieldName] = encrypted;
    }
  }
}

/**
 * Helper function to manually decrypt an entity
 * Useful for testing or manual migrations
 */
export async function decryptEntityFields<T>(
  entity: T,
  encryptionService: EncryptionService,
): Promise<void> {
  const encryptedColumns = getEncryptedColumns(Object.getPrototypeOf(entity));

  for (const { propertyKey, options } of encryptedColumns) {
    const encryptedFieldName = options?.encryptedFieldName || `${propertyKey}_encrypted`;
    const encryptedValue = entity[encryptedFieldName];

    if (encryptedValue !== null && encryptedValue !== undefined) {
      const decrypted = await encryptionService.decrypt(encryptedValue);
      entity[propertyKey] = decrypted;
    }
  }
}
