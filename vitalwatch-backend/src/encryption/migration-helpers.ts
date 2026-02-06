import { Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { MigrationOptions } from './types';
import { DEFAULT_BATCH_SIZE } from './constants';

/**
 * Migration helpers for encrypting existing data and key rotation
 */

const logger = new Logger('EncryptionMigration');

/**
 * Encrypt existing plaintext data in a table
 *
 * @param dataSource - TypeORM DataSource
 * @param encryptionService - Encryption service instance
 * @param options - Migration options
 * @returns Number of records encrypted
 *
 * Usage:
 * ```typescript
 * const encrypted = await encryptExistingData(
 *   dataSource,
 *   encryptionService,
 *   {
 *     tableName: 'users',
 *     fields: ['ssn', 'dateOfBirth', 'phone'],
 *     batchSize: 100,
 *     onProgress: (processed, total) => {
 *       console.log(`Progress: ${processed}/${total}`);
 *     }
 *   }
 * );
 * ```
 */
export async function encryptExistingData(
  dataSource: DataSource,
  encryptionService: EncryptionService,
  options: MigrationOptions,
): Promise<number> {
  const {
    tableName,
    fields,
    batchSize = DEFAULT_BATCH_SIZE,
    dryRun = false,
    onProgress,
  } = options;

  logger.log(`Starting encryption migration for table: ${tableName}`);
  logger.log(`Fields to encrypt: ${fields.join(', ')}`);
  logger.log(`Batch size: ${batchSize}`);
  logger.log(`Dry run: ${dryRun}`);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Get total count
    const countResult = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "${tableName}"`,
    );
    const totalRecords = parseInt(countResult[0].count, 10);

    logger.log(`Total records to process: ${totalRecords}`);

    if (totalRecords === 0) {
      logger.log('No records to encrypt');
      return 0;
    }

    let processed = 0;
    let offset = 0;

    // Start transaction if not dry run
    if (!dryRun) {
      await queryRunner.startTransaction();
    }

    while (offset < totalRecords) {
      // Fetch batch
      const records = await queryRunner.query(
        `SELECT id, ${fields.join(', ')} FROM "${tableName}" ORDER BY id LIMIT $1 OFFSET $2`,
        [batchSize, offset],
      );

      if (records.length === 0) {
        break;
      }

      // Process batch
      for (const record of records) {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const field of fields) {
          const plainValue = record[field];

          // Skip if already encrypted or null
          if (!plainValue) {
            continue;
          }

          // Check if already encrypted
          if (encryptionService.isEncrypted(plainValue)) {
            logger.debug(`Field ${field} in record ${record.id} is already encrypted, skipping`);
            continue;
          }

          // Encrypt the value
          const encrypted = await encryptionService.encrypt(plainValue);

          // Add to update query
          updates.push(`${field}_encrypted = $${paramIndex}`);
          values.push(encrypted);
          paramIndex++;

          // Optionally clear the plaintext field
          // updates.push(`${field} = NULL`);
        }

        if (updates.length > 0 && !dryRun) {
          // Update the record
          values.push(record.id);
          await queryRunner.query(
            `UPDATE "${tableName}" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values,
          );
        }

        processed++;

        // Progress callback
        if (onProgress && processed % 10 === 0) {
          onProgress(processed, totalRecords);
        }
      }

      offset += batchSize;

      logger.log(`Processed ${processed}/${totalRecords} records`);
    }

    // Commit transaction if not dry run
    if (!dryRun) {
      await queryRunner.commitTransaction();
      logger.log('Transaction committed successfully');
    } else {
      logger.log('Dry run completed - no changes made');
    }

    logger.log(`Encryption migration completed. Processed ${processed} records.`);

    return processed;
  } catch (error) {
    // Rollback on error
    if (!dryRun) {
      await queryRunner.rollbackTransaction();
      logger.error('Transaction rolled back due to error');
    }

    logger.error(`Encryption migration failed: ${error.message}`, error.stack);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Re-encrypt data with a new key version (for key rotation)
 *
 * @param dataSource - TypeORM DataSource
 * @param encryptionService - Encryption service instance
 * @param keyManagement - Key management service instance
 * @param options - Migration options
 * @returns Number of records re-encrypted
 *
 * Usage:
 * ```typescript
 * const reencrypted = await migrateToNewKey(
 *   dataSource,
 *   encryptionService,
 *   keyManagement,
 *   {
 *     tableName: 'users',
 *     fields: ['ssn', 'dateOfBirth'],
 *     batchSize: 50,
 *   }
 * );
 * ```
 */
export async function migrateToNewKey(
  dataSource: DataSource,
  encryptionService: EncryptionService,
  keyManagement: KeyManagementService,
  options: MigrationOptions,
): Promise<number> {
  const {
    tableName,
    fields,
    batchSize = DEFAULT_BATCH_SIZE,
    dryRun = false,
    onProgress,
  } = options;

  logger.log(`Starting key migration for table: ${tableName}`);

  // Get current key version
  const newKeyVersion = await keyManagement.getCurrentKeyVersion();
  logger.log(`New key version: ${newKeyVersion}`);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Get total count
    const encryptedFields = fields.map(f => `${f}_encrypted`).join(', ');
    const countResult = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "${tableName}" WHERE ${encryptedFields.split(', ')[0]} IS NOT NULL`,
    );
    const totalRecords = parseInt(countResult[0].count, 10);

    logger.log(`Total records to re-encrypt: ${totalRecords}`);

    if (totalRecords === 0) {
      logger.log('No records to re-encrypt');
      return 0;
    }

    let processed = 0;
    let offset = 0;

    // Start transaction if not dry run
    if (!dryRun) {
      await queryRunner.startTransaction();
    }

    while (offset < totalRecords) {
      // Fetch batch
      const selectFields = fields.map(f => `${f}_encrypted`).join(', ');
      const records = await queryRunner.query(
        `SELECT id, ${selectFields} FROM "${tableName}" ORDER BY id LIMIT $1 OFFSET $2`,
        [batchSize, offset],
      );

      if (records.length === 0) {
        break;
      }

      // Process batch
      for (const record of records) {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const field of fields) {
          const encryptedField = `${field}_encrypted`;
          const encryptedValue = record[encryptedField];

          if (!encryptedValue) {
            continue;
          }

          // Check current key version
          const metadata = encryptionService.getMetadata(encryptedValue);
          if (metadata && metadata.version === newKeyVersion) {
            logger.debug(`Field ${field} in record ${record.id} already using new key version, skipping`);
            continue;
          }

          // Re-encrypt with new key
          const reencrypted = await encryptionService.reencrypt(encryptedValue, newKeyVersion);

          // Add to update query
          updates.push(`${encryptedField} = $${paramIndex}`);
          values.push(reencrypted);
          paramIndex++;
        }

        if (updates.length > 0 && !dryRun) {
          // Update the record
          values.push(record.id);
          await queryRunner.query(
            `UPDATE "${tableName}" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values,
          );
        }

        processed++;

        // Progress callback
        if (onProgress && processed % 10 === 0) {
          onProgress(processed, totalRecords);
        }
      }

      offset += batchSize;

      logger.log(`Re-encrypted ${processed}/${totalRecords} records`);
    }

    // Commit transaction if not dry run
    if (!dryRun) {
      await queryRunner.commitTransaction();
      logger.log('Transaction committed successfully');
    } else {
      logger.log('Dry run completed - no changes made');
    }

    logger.log(`Key migration completed. Re-encrypted ${processed} records.`);

    return processed;
  } catch (error) {
    // Rollback on error
    if (!dryRun) {
      await queryRunner.rollbackTransaction();
      logger.error('Transaction rolled back due to error');
    }

    logger.error(`Key migration failed: ${error.message}`, error.stack);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Generate SQL migration script for adding encrypted columns
 *
 * @param tableName - Table name
 * @param fields - Fields to add encrypted columns for
 * @returns SQL script
 *
 * Usage:
 * ```typescript
 * const sql = generateAddEncryptedColumnsMigration('users', ['ssn', 'dateOfBirth', 'phone']);
 * console.log(sql);
 * ```
 */
export function generateAddEncryptedColumnsMigration(
  tableName: string,
  fields: string[],
): string {
  const upStatements: string[] = [];
  const downStatements: string[] = [];

  for (const field of fields) {
    const encryptedField = `${field}_encrypted`;

    upStatements.push(
      `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${encryptedField}" TEXT;`,
    );

    downStatements.push(
      `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${encryptedField}";`,
    );
  }

  return `
-- Migration: Add encrypted columns to ${tableName}
-- Generated: ${new Date().toISOString()}

-- Up Migration
${upStatements.join('\n')}

-- Add indexes for encrypted columns if needed
-- CREATE INDEX IF NOT EXISTS idx_${tableName}_encrypted ON "${tableName}" USING gin (${fields.map(f => `${f}_encrypted`).join(', ')});

-- Down Migration (rollback)
-- ${downStatements.join('\n-- ')}
`.trim();
}

/**
 * Verify encryption integrity for a table
 * Checks that all encrypted fields can be decrypted successfully
 *
 * @param dataSource - TypeORM DataSource
 * @param encryptionService - Encryption service instance
 * @param tableName - Table name
 * @param fields - Encrypted fields to verify
 * @returns Verification results
 */
export async function verifyEncryptionIntegrity(
  dataSource: DataSource,
  encryptionService: EncryptionService,
  tableName: string,
  fields: string[],
): Promise<{
  totalRecords: number;
  verified: number;
  failed: number;
  errors: Array<{ id: string; field: string; error: string }>;
}> {
  logger.log(`Verifying encryption integrity for table: ${tableName}`);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  const results = {
    totalRecords: 0,
    verified: 0,
    failed: 0,
    errors: [] as Array<{ id: string; field: string; error: string }>,
  };

  try {
    const encryptedFields = fields.map(f => `${f}_encrypted`).join(', ');
    const records = await queryRunner.query(
      `SELECT id, ${encryptedFields} FROM "${tableName}"`,
    );

    results.totalRecords = records.length;

    for (const record of records) {
      for (const field of fields) {
        const encryptedField = `${field}_encrypted`;
        const encryptedValue = record[encryptedField];

        if (!encryptedValue) {
          continue;
        }

        try {
          // Try to decrypt
          await encryptionService.decrypt(encryptedValue);
          results.verified++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: record.id,
            field,
            error: error.message,
          });
        }
      }
    }

    logger.log(`Verification complete: ${results.verified} verified, ${results.failed} failed`);

    return results;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Get encryption statistics for a table
 *
 * @param dataSource - TypeORM DataSource
 * @param tableName - Table name
 * @param fields - Fields to check
 * @returns Encryption statistics
 */
export async function getEncryptionStats(
  dataSource: DataSource,
  tableName: string,
  fields: string[],
): Promise<{
  totalRecords: number;
  fieldStats: Record<string, { encrypted: number; plaintext: number; null: number }>;
}> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const countResult = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "${tableName}"`,
    );
    const totalRecords = parseInt(countResult[0].count, 10);

    const fieldStats: Record<string, { encrypted: number; plaintext: number; null: number }> = {};

    for (const field of fields) {
      const encryptedField = `${field}_encrypted`;

      const encryptedCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${encryptedField}" IS NOT NULL`,
      );

      const plaintextCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${field}" IS NOT NULL AND "${encryptedField}" IS NULL`,
      );

      const nullCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${field}" IS NULL AND "${encryptedField}" IS NULL`,
      );

      fieldStats[field] = {
        encrypted: parseInt(encryptedCount[0]?.count || '0', 10),
        plaintext: parseInt(plaintextCount[0]?.count || '0', 10),
        null: parseInt(nullCount[0]?.count || '0', 10),
      };
    }

    return {
      totalRecords,
      fieldStats,
    };
  } finally {
    await queryRunner.release();
  }
}
