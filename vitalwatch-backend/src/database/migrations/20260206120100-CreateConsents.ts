import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Consents Table
 *
 * Creates the consents table for tracking patient consent records.
 * Supports various consent types including treatment, data sharing, telehealth, etc.
 * Includes digital signature capabilities and compliance tracking.
 */
export class CreateConsents20260206120100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'consents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'treatment',
              'data_collection',
              'data_sharing',
              'telehealth',
              'research',
              'marketing',
              'device_monitoring',
              'ai_analysis',
              'third_party_sharing',
              'emergency_contact',
              'notice_of_privacy_practices',
            ],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'granted', 'revoked', 'expired'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: 'Version of consent form (e.g., "1.0", "2.1")',
          },
          {
            name: 'consentText',
            type: 'text',
            isNullable: false,
            comment: 'Full text of what user consented to',
          },
          {
            name: 'consentUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'URL to full consent document',
          },
          // Signature information
          {
            name: 'signatureMethod',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'electronic, verbal, written, click_through',
          },
          {
            name: 'signatureData',
            type: 'text',
            isNullable: true,
            comment: 'Base64 encoded signature image or confirmation text',
          },
          {
            name: 'signedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Geolocation if available',
          },
          // Witness information (for critical consents)
          {
            name: 'witnessedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'witnessName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'witnessedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Expiration
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Revocation
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
          // Additional metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores organizationId, providerId, programId, relatedConsents, etc.',
          },
          {
            name: 'notes',
            type: 'text',
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
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'IDX_consents_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'IDX_consents_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'IDX_consents_status',
        columnNames: ['status'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'IDX_consents_userId_type_status',
        columnNames: ['userId', 'type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'IDX_consents_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'consents',
      new TableIndex({
        name: 'IDX_consents_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );

    // Foreign key constraints
    await queryRunner.createForeignKey(
      'consents',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_consents_userId',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('consents', 'FK_consents_userId');
    await queryRunner.dropTable('consents');
  }
}
