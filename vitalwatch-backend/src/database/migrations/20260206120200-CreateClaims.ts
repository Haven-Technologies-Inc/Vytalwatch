import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Claims Table
 *
 * Creates the claims table for insurance billing and reimbursement tracking.
 * Supports multiple claim types (RPM, telehealth, office visits, procedures, diagnostics).
 * Includes CPT codes, ICD-10 codes, financial tracking, and appeal management.
 */
export class CreateClaims20260206120200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'claims',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'claimNumber',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
            comment: 'Auto-generated unique claim number',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['rpm', 'telehealth', 'office_visit', 'procedure', 'diagnostic'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'draft',
              'pending',
              'submitted',
              'accepted',
              'partially_paid',
              'paid',
              'denied',
              'appealed',
              'cancelled',
            ],
            default: "'draft'",
            isNullable: false,
          },
          // Patient and Provider
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
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          // Service details
          {
            name: 'serviceDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'serviceEndDate',
            type: 'date',
            isNullable: true,
          },
          // CPT codes (stored as JSONB array)
          {
            name: 'cptCodes',
            type: 'jsonb',
            isNullable: false,
            comment: 'Array of {code, description, units, charge, modifiers}',
          },
          // ICD-10 diagnosis codes
          {
            name: 'diagnosisCodes',
            type: 'jsonb',
            isNullable: false,
            comment: 'Array of {code, description, isPrimary}',
          },
          // Financial
          {
            name: 'totalCharge',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'paidAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'adjustedAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            comment: 'Write-offs, contractual adjustments',
          },
          {
            name: 'patientResponsibility',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            comment: 'Copay, coinsurance, deductible',
          },
          // Insurance information
          {
            name: 'primaryInsuranceName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'primaryInsuranceId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'primaryGroupNumber',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'secondaryInsuranceName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'secondaryInsuranceId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          // Submission
          {
            name: 'submittedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'submittedBy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'submissionMethod',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'electronic, paper, clearinghouse',
          },
          {
            name: 'clearinghouseId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          // Response
          {
            name: 'responseReceivedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'paymentReceivedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'denialReason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'denialDetails',
            type: 'text',
            isNullable: true,
          },
          // Supporting documentation
          {
            name: 'supportingDocuments',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of {type, name, url, uploadedAt}',
          },
          // Link to billing records and clinical data
          {
            name: 'billingRecordIds',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of billing record IDs',
          },
          {
            name: 'vitalReadingIds',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of vital reading IDs',
          },
          {
            name: 'alertIds',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of alert IDs',
          },
          {
            name: 'clinicalNoteIds',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of clinical note IDs',
          },
          // Appeal information
          {
            name: 'appealedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'appealReason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'appealResolutionDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'appealOutcome',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'approved, denied, partially_approved',
          },
          // Additional metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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
      'claims',
      new TableIndex({
        name: 'IDX_claims_claimNumber',
        columnNames: ['claimNumber'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'claims',
      new TableIndex({
        name: 'IDX_claims_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'claims',
      new TableIndex({
        name: 'IDX_claims_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'claims',
      new TableIndex({
        name: 'IDX_claims_providerId',
        columnNames: ['providerId'],
      }),
    );

    await queryRunner.createIndex(
      'claims',
      new TableIndex({
        name: 'IDX_claims_serviceDate',
        columnNames: ['serviceDate'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'claims',
      new TableIndex({
        name: 'IDX_claims_patientId_status',
        columnNames: ['patientId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'claims',
      new TableIndex({
        name: 'IDX_claims_providerId_status',
        columnNames: ['providerId', 'status'],
      }),
    );

    // Foreign key constraints
    await queryRunner.createForeignKey(
      'claims',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_claims_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'claims',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_claims_providerId',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('claims', 'FK_claims_providerId');
    await queryRunner.dropForeignKey('claims', 'FK_claims_patientId');
    await queryRunner.dropTable('claims');
  }
}
