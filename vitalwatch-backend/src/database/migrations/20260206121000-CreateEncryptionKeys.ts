import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Encryption Keys Table
 *
 * Creates the encryption_keys table for managing encryption keys used throughout the system.
 * Supports key rotation, versioning, and audit tracking for HIPAA compliance.
 * Keys are stored encrypted and never exposed in plain text.
 */
export class CreateEncryptionKeys20260206121000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'encryption_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'keyId',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
            comment: 'Unique identifier for the key',
          },
          {
            name: 'keyType',
            type: 'enum',
            enum: ['master', 'data', 'messaging', 'file', 'call', 'database'],
            isNullable: false,
            comment: 'Type of encryption key',
          },
          {
            name: 'algorithm',
            type: 'varchar',
            length: '100',
            isNullable: false,
            default: "'AES-256-GCM'",
            comment: 'Encryption algorithm used',
          },
          // Encrypted key material (never store plain text keys)
          {
            name: 'encryptedKey',
            type: 'text',
            isNullable: false,
            comment: 'The key material, encrypted with master key',
          },
          {
            name: 'iv',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Initialization vector used to encrypt the key',
          },
          {
            name: 'authTag',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Authentication tag for GCM mode',
          },
          // Key metadata
          {
            name: 'version',
            type: 'int',
            default: 1,
            comment: 'Key version for rotation tracking',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'rotating', 'deprecated', 'revoked', 'compromised'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'purpose',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Specific purpose or module this key is used for',
          },
          // Key lifecycle
          {
            name: 'activatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'When this key should be rotated',
          },
          {
            name: 'rotatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'revokedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'revocationReason',
            type: 'text',
            isNullable: true,
          },
          // Key relationships (for rotation)
          {
            name: 'previousKeyId',
            type: 'uuid',
            isNullable: true,
            comment: 'Reference to previous key version',
          },
          {
            name: 'nextKeyId',
            type: 'uuid',
            isNullable: true,
            comment: 'Reference to next key version',
          },
          // Usage tracking
          {
            name: 'usageCount',
            type: 'bigint',
            default: 0,
            comment: 'Number of times this key has been used',
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Key derivation info (if applicable)
          {
            name: 'derivationInfo',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores salt, iterations, hash function for derived keys',
          },
          // External key management
          {
            name: 'externalKeyId',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Reference to key in external KMS (AWS KMS, Azure Key Vault, etc.)',
          },
          {
            name: 'kmsProvider',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'aws-kms, azure-keyvault, gcp-kms, hashicorp-vault',
          },
          {
            name: 'kmsRegion',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          // Compliance and audit
          {
            name: 'isHIPAACompliant',
            type: 'boolean',
            default: true,
          },
          {
            name: 'auditLog',
            type: 'jsonb',
            array: true,
            isNullable: true,
            comment: 'Array of audit entries: {timestamp, action, userId, details}',
          },
          // Access control
          {
            name: 'allowedServices',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of services allowed to use this key',
          },
          {
            name: 'allowedRoles',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of user roles allowed to use this key',
          },
          // Backup and recovery
          {
            name: 'hasBackup',
            type: 'boolean',
            default: false,
          },
          {
            name: 'backupLocation',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Secure backup location reference',
          },
          {
            name: 'lastBackupAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Additional metadata for the key',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          // Audit fields
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lastModifiedBy',
            type: 'uuid',
            isNullable: true,
          },
          // Timestamps
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'Soft delete timestamp',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_keyId',
        columnNames: ['keyId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_keyType',
        columnNames: ['keyType'],
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_version',
        columnNames: ['version'],
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_activatedAt',
        columnNames: ['activatedAt'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_keyType_status',
        columnNames: ['keyType', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_status_version',
        columnNames: ['status', 'version'],
      }),
    );

    await queryRunner.createIndex(
      'encryption_keys',
      new TableIndex({
        name: 'IDX_encryption_keys_externalKeyId',
        columnNames: ['externalKeyId'],
      }),
    );

    // Note: We intentionally do NOT create foreign keys to users table
    // to prevent cascading deletes that could compromise key management
    // The createdBy and lastModifiedBy fields are maintained for audit purposes only
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('encryption_keys');
  }
}
