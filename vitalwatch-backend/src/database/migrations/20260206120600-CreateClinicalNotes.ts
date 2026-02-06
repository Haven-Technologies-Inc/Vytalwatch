import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Clinical Notes Table
 *
 * Creates the clinical_notes table for storing healthcare provider documentation.
 * Supports SOAP notes, progress notes, consultations, and other clinical documentation.
 * Includes digital signatures, version control, amendments, and AI-assisted generation tracking.
 */
export class CreateClinicalNotes20260206120600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
          // Patient and Provider Information
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
          // Note Type and Classification
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
            enum: ['telehealth', 'in_person', 'phone', 'async', 'emergency', 'rpm_monitoring'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'in_progress', 'pending_signature', 'signed', 'locked', 'amended', 'deleted'],
            default: "'draft'",
            isNullable: false,
          },
          // Encounter Information
          {
            name: 'encounterDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'encounterDuration',
            type: 'int',
            isNullable: true,
            comment: 'Duration in minutes',
          },
          {
            name: 'encounterLocation',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Note Content
          {
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
            comment: 'Main narrative content',
          },
          // Structured Data (SOAP or other formats)
          {
            name: 'structuredData',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores SOAP structure or other structured note data',
          },
          // Template Information
          {
            name: 'templateId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'templateName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Related Resources
          {
            name: 'vitalReadingIds',
            type: 'uuid',
            array: true,
            isNullable: true,
          },
          {
            name: 'alertIds',
            type: 'uuid',
            array: true,
            isNullable: true,
          },
          {
            name: 'medicationIds',
            type: 'uuid',
            array: true,
            isNullable: true,
          },
          {
            name: 'appointmentIds',
            type: 'uuid',
            array: true,
            isNullable: true,
          },
          {
            name: 'deviceIds',
            type: 'uuid',
            array: true,
            isNullable: true,
          },
          {
            name: 'billingClaimId',
            type: 'uuid',
            isNullable: true,
          },
          // Digital Signature
          {
            name: 'isSigned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'signature',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores digital signature details: signedBy, signedAt, signatureMethod, signatureHash, etc.',
          },
          {
            name: 'signedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Locking (prevent edits after signing)
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
          // Amendment Tracking
          {
            name: 'isAmended',
            type: 'boolean',
            default: false,
          },
          {
            name: 'amendments',
            type: 'jsonb',
            array: true,
            isNullable: true,
            comment: 'Array of amendment records',
          },
          {
            name: 'originalNoteId',
            type: 'uuid',
            isNullable: true,
            comment: 'If this is an amended version',
          },
          {
            name: 'supersededBy',
            type: 'uuid',
            isNullable: true,
            comment: 'Note ID that supersedes this one',
          },
          // AI-Assisted Generation
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
            comment: 'Stores model, generatedAt, confidence, humanEdited, editedFields',
          },
          // Compliance and Billing
          {
            name: 'icdCodes',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated ICD-10 diagnosis codes',
          },
          {
            name: 'cptCodes',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated CPT procedure codes',
          },
          {
            name: 'billingNotes',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'billingSubmitted',
            type: 'boolean',
            default: false,
          },
          // Addendum (additional notes after signing)
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
          // Review and Attestation
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
          // Confidentiality
          {
            name: 'isConfidential',
            type: 'boolean',
            default: false,
          },
          {
            name: 'accessibleTo',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated user IDs who can access this note',
          },
          // Additional Metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores organizationId, departmentId, locationId, facilityId, programId, etc.',
          },
          // Version Control
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
          // Audit Fields
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
          // Soft delete
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

    // Create indexes
    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_providerId',
        columnNames: ['providerId'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_noteType',
        columnNames: ['noteType'],
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
        name: 'IDX_clinical_notes_encounterDate',
        columnNames: ['encounterDate'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_patientId_noteType_createdAt',
        columnNames: ['patientId', 'noteType', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_providerId_status_createdAt',
        columnNames: ['providerId', 'status', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'clinical_notes',
      new TableIndex({
        name: 'IDX_clinical_notes_patientId_status',
        columnNames: ['patientId', 'status'],
      }),
    );

    // Foreign key constraints
    await queryRunner.createForeignKey(
      'clinical_notes',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_clinical_notes_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'clinical_notes',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_clinical_notes_providerId',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('clinical_notes', 'FK_clinical_notes_providerId');
    await queryRunner.dropForeignKey('clinical_notes', 'FK_clinical_notes_patientId');
    await queryRunner.dropTable('clinical_notes');
  }
}
