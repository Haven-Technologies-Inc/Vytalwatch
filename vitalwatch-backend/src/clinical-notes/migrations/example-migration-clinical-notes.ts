/**
 * Example TypeORM Migration for Clinical Notes
 *
 * To create a new migration:
 * npm run migration:generate -- -n CreateClinicalNotesTable
 *
 * To run migrations:
 * npm run migration:run
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateClinicalNotesTable1707200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create clinical_notes table
    await queryRunner.createTable(
      new Table({
        name: 'clinical_notes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'patientId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'providerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'noteType',
            type: 'enum',
            enum: [
              'soap',
              'progress',
              'consultation',
              'discharge',
              'assessment',
              'rpm_review',
              'initial_assessment',
              'follow_up',
              'referral',
              'procedure',
            ],
            isNullable: false,
          },
          {
            name: 'encounterType',
            type: 'enum',
            enum: [
              'telehealth',
              'in_person',
              'phone',
              'async',
              'emergency',
              'rpm_monitoring',
            ],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'draft',
              'in_progress',
              'pending_signature',
              'signed',
              'locked',
              'amended',
              'deleted',
            ],
            default: "'draft'",
          },
          {
            name: 'encounterDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'encounterDuration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'encounterLocation',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'structuredData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'templateId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'templateName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'vitalReadingIds',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'alertIds',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'medicationIds',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'appointmentIds',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'deviceIds',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'billingClaimId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isSigned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'signature',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'signedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isLocked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lockedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lockedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isAmended',
            type: 'boolean',
            default: false,
          },
          {
            name: 'amendments',
            type: 'jsonb',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'originalNoteId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'supersededBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'aiGenerated',
            type: 'boolean',
            default: false,
          },
          {
            name: 'aiAssisted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'aiMetadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'icdCodes',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'cptCodes',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'billingNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'billingSubmitted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'addendum',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'addendumAddedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'addendumAddedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'requiresCoSignature',
            type: 'boolean',
            default: false,
          },
          {
            name: 'coSignedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'coSignedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'coSignatureNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isConfidential',
            type: 'boolean',
            default: false,
          },
          {
            name: 'accessibleTo',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'previousVersionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'lastEditedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'lastEditedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deletedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deletionReason',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for common queries
    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_patient_type_date',
        columnNames: ['patientId', 'noteType', 'encounterDate'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_provider_status_date',
        columnNames: ['providerId', 'status', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_patient_status',
        columnNames: ['patientId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_encounter_date',
        columnNames: ['encounterDate'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_patient_id',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_provider_id',
        columnNames: ['providerId'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_note_type',
        columnNames: ['noteType'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'clinical_notes',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'clinical_notes',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create full-text search index for content (PostgreSQL specific)
    await queryRunner.query(`
      CREATE INDEX IDX_clinical_notes_content_search
      ON clinical_notes
      USING GIN (to_tsvector('english', title || ' ' || content))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop full-text search index
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_clinical_notes_content_search`);

    // Drop foreign keys
    const table = await queryRunner.getTable('clinical_notes');
    const foreignKeys = table?.foreignKeys || [];
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('clinical_notes', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_patient_type_date');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_provider_status_date');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_patient_status');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_encounter_date');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_patient_id');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_provider_id');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_status');
    await queryRunner.dropIndex('clinical_notes', 'IDX_clinical_notes_note_type');

    // Drop table
    await queryRunner.dropTable('clinical_notes');
  }
}
