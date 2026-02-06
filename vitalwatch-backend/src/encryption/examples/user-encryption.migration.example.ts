import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EncryptionService } from '../encryption.service';
import { KeyManagementService } from '../key-management.service';
import {
  encryptExistingData,
  migrateToNewKey,
  verifyEncryptionIntegrity,
  getEncryptionStats,
  generateAddEncryptedColumnsMigration,
} from '../migration-helpers';

/**
 * Example migration service for encrypting user PHI fields
 *
 * Usage:
 * 1. Run the migration to add encrypted columns
 * 2. Encrypt existing data
 * 3. Verify encryption integrity
 * 4. Update entities to use @EncryptedColumn()
 * 5. Drop plaintext columns (optional)
 */
@Injectable()
export class UserEncryptionMigrationService {
  private readonly logger = new Logger(UserEncryptionMigrationService.name);

  // Fields to encrypt in User entity
  private readonly fieldsToEncrypt = [
    'ssn',
    'dateOfBirth',
    'phone',
    'email',
    'address',
    'mfaSecret',
  ];

  constructor(
    private readonly dataSource: DataSource,
    private readonly encryptionService: EncryptionService,
    private readonly keyManagement: KeyManagementService,
  ) {}

  /**
   * Step 1: Generate SQL migration script
   */
  generateMigrationSQL(): string {
    this.logger.log('Generating migration SQL...');

    const sql = generateAddEncryptedColumnsMigration('users', this.fieldsToEncrypt);

    this.logger.log('Migration SQL generated:');
    console.log(sql);

    return sql;
  }

  /**
   * Step 2: Encrypt existing user data
   */
  async encryptUserData(dryRun = false): Promise<number> {
    this.logger.log(`Starting user data encryption (dry run: ${dryRun})...`);

    const count = await encryptExistingData(
      this.dataSource,
      this.encryptionService,
      {
        tableName: 'users',
        fields: this.fieldsToEncrypt,
        batchSize: 100,
        dryRun,
        onProgress: (processed, total) => {
          this.logger.log(`Progress: ${processed}/${total} users encrypted`);
        },
      },
    );

    this.logger.log(`User data encryption complete. Encrypted ${count} records.`);

    return count;
  }

  /**
   * Step 3: Verify encryption integrity
   */
  async verifyUserEncryption(): Promise<void> {
    this.logger.log('Verifying user encryption integrity...');

    const results = await verifyEncryptionIntegrity(
      this.dataSource,
      this.encryptionService,
      'users',
      this.fieldsToEncrypt,
    );

    this.logger.log(`Verification complete:`);
    this.logger.log(`  Total records: ${results.totalRecords}`);
    this.logger.log(`  Verified: ${results.verified}`);
    this.logger.log(`  Failed: ${results.failed}`);

    if (results.failed > 0) {
      this.logger.error(`Encryption verification failed for ${results.failed} fields`);
      this.logger.error('Errors:', results.errors);
    } else {
      this.logger.log('All encrypted data verified successfully!');
    }
  }

  /**
   * Step 4: Get encryption statistics
   */
  async getUserEncryptionStats(): Promise<void> {
    this.logger.log('Getting user encryption statistics...');

    const stats = await getEncryptionStats(
      this.dataSource,
      'users',
      this.fieldsToEncrypt,
    );

    this.logger.log(`Total users: ${stats.totalRecords}`);

    for (const [field, fieldStats] of Object.entries(stats.fieldStats)) {
      this.logger.log(`  ${field}:`);
      this.logger.log(`    Encrypted: ${fieldStats.encrypted}`);
      this.logger.log(`    Plaintext: ${fieldStats.plaintext}`);
      this.logger.log(`    Null: ${fieldStats.null}`);
    }
  }

  /**
   * Step 5: Rotate keys and re-encrypt user data
   */
  async rotateUserEncryptionKeys(): Promise<void> {
    this.logger.log('Starting key rotation for user data...');

    // Rotate keys
    const newVersion = await this.keyManagement.rotateKeys();
    this.logger.log(`Rotated to key version: ${newVersion}`);

    // Re-encrypt user data with new key
    const count = await migrateToNewKey(
      this.dataSource,
      this.encryptionService,
      this.keyManagement,
      {
        tableName: 'users',
        fields: this.fieldsToEncrypt,
        batchSize: 50,
        onProgress: (processed, total) => {
          this.logger.log(`Progress: ${processed}/${total} users re-encrypted`);
        },
      },
    );

    this.logger.log(`Key rotation complete. Re-encrypted ${count} records.`);
  }

  /**
   * Complete migration workflow (all steps)
   */
  async runCompleteMigration(): Promise<void> {
    this.logger.log('===== Starting complete user encryption migration =====');

    try {
      // Step 1: Show migration SQL (run manually first)
      this.logger.log('\nStep 1: Migration SQL');
      this.generateMigrationSQL();
      this.logger.log('\n⚠️  Run this SQL migration first before continuing!');
      this.logger.log('Press Enter to continue after running migration...\n');

      // Step 2: Encrypt existing data (dry run first)
      this.logger.log('\nStep 2: Dry run encryption');
      await this.encryptUserData(true);

      this.logger.log('\n⚠️  Dry run successful. Ready to encrypt actual data.');
      this.logger.log('Press Enter to continue...\n');

      // Step 3: Actual encryption
      this.logger.log('\nStep 3: Encrypting user data');
      await this.encryptUserData(false);

      // Step 4: Verify encryption
      this.logger.log('\nStep 4: Verifying encryption');
      await this.verifyUserEncryption();

      // Step 5: Show statistics
      this.logger.log('\nStep 5: Encryption statistics');
      await this.getUserEncryptionStats();

      this.logger.log('\n===== User encryption migration complete! =====');
      this.logger.log('\nNext steps:');
      this.logger.log('1. Update User entity to use @EncryptedColumn() decorator');
      this.logger.log('2. Test application functionality');
      this.logger.log('3. Drop plaintext columns (optional)');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }
}
