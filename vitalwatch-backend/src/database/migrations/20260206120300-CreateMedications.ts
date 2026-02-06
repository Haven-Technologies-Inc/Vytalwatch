import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Medications Tables
 *
 * Creates three tables:
 * 1. medications - prescription and medication details
 * 2. medication_schedules - specific scheduled times for doses
 * 3. medication_adherence - tracking of actual medication taking behavior
 */
export class CreateMedications20260206120300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. CREATE MEDICATIONS TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'medications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          // Medication identification
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'genericName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'brandName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'ndcCode',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'National Drug Code',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'tablet',
              'capsule',
              'liquid',
              'injection',
              'inhaler',
              'topical',
              'patch',
              'drops',
              'suppository',
              'other',
            ],
            default: "'tablet'",
          },
          // Dosage information
          {
            name: 'dosage',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'e.g., "10mg", "5ml"',
          },
          {
            name: 'strength',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'e.g., "10mg"',
          },
          {
            name: 'route',
            type: 'enum',
            enum: [
              'oral',
              'sublingual',
              'intravenous',
              'intramuscular',
              'subcutaneous',
              'topical',
              'transdermal',
              'inhalation',
              'nasal',
              'ophthalmic',
              'otic',
              'rectal',
              'vaginal',
            ],
            default: "'oral'",
          },
          {
            name: 'frequency',
            type: 'enum',
            enum: [
              'once_daily',
              'twice_daily',
              'three_times_daily',
              'four_times_daily',
              'every_4_hours',
              'every_6_hours',
              'every_8_hours',
              'every_12_hours',
              'as_needed',
              'weekly',
              'every_other_day',
              'bedtime',
              'morning',
              'custom',
            ],
            isNullable: false,
          },
          {
            name: 'frequencyDetails',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Additional details for custom frequency',
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
            comment: 'Detailed instructions for taking the medication',
          },
          {
            name: 'purpose',
            type: 'text',
            isNullable: true,
            comment: 'Why the medication is prescribed',
          },
          // Patient and provider
          {
            name: 'patientId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'prescribedBy',
            type: 'uuid',
            isNullable: false,
          },
          // Schedule
          {
            name: 'startDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'endDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
            comment: 'active, discontinued, completed, on_hold',
          },
          {
            name: 'discontinuedDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'discontinuedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'discontinuedReason',
            type: 'text',
            isNullable: true,
          },
          // Prescription details
          {
            name: 'prescriptionNumber',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'pharmacy',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'pharmacyPhone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'refillsAuthorized',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'refillsUsed',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastRefillDate',
            type: 'timestamp',
            isNullable: true,
          },
          // Safety information
          {
            name: 'sideEffects',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list',
          },
          {
            name: 'contraindications',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list',
          },
          {
            name: 'interactions',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated IDs of medications that interact',
          },
          {
            name: 'warnings',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'precautions',
            type: 'text',
            isNullable: true,
          },
          // Monitoring
          {
            name: 'requiresMonitoring',
            type: 'boolean',
            default: false,
          },
          {
            name: 'monitoringParameters',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list e.g., blood_pressure, heart_rate',
          },
          // Reminders and adherence
          {
            name: 'reminderEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'reminderMinutesBefore',
            type: 'int',
            isNullable: true,
            comment: 'Minutes before scheduled time to send reminder',
          },
          {
            name: 'trackAdherence',
            type: 'boolean',
            default: true,
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
          {
            name: 'attachments',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated URLs to prescription images',
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

    // Medications indexes
    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_prescribedBy',
        columnNames: ['prescribedBy'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_startDate',
        columnNames: ['startDate'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_endDate',
        columnNames: ['endDate'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_patientId_status',
        columnNames: ['patientId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_prescribedBy_status',
        columnNames: ['prescribedBy', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'medications',
      new TableIndex({
        name: 'IDX_medications_startDate_endDate',
        columnNames: ['startDate', 'endDate'],
      }),
    );

    // Medications foreign keys
    await queryRunner.createForeignKey(
      'medications',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_medications_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'medications',
      new TableForeignKey({
        columnNames: ['prescribedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_medications_prescribedBy',
      }),
    );

    // ========================================
    // 2. CREATE MEDICATION_SCHEDULES TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'medication_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'medicationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'patientId',
            type: 'uuid',
            isNullable: false,
          },
          // Schedule details
          {
            name: 'scheduledTime',
            type: 'timestamp',
            isNullable: false,
            comment: 'Specific date and time for this dose',
          },
          {
            name: 'scheduledDosage',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Can override default dosage for this specific dose',
          },
          {
            name: 'specialInstructions',
            type: 'text',
            isNullable: true,
          },
          // Status
          {
            name: 'isCompleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reminderSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reminderSentAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Recurrence (for generating future schedules)
          {
            name: 'isRecurring',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recurrenceRule',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores pattern, interval, daysOfWeek, timeOfDay, endDate',
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

    // Medication schedules indexes
    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_medicationId',
        columnNames: ['medicationId'],
      }),
    );

    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_scheduledTime',
        columnNames: ['scheduledTime'],
      }),
    );

    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_medicationId_scheduledTime',
        columnNames: ['medicationId', 'scheduledTime'],
      }),
    );

    await queryRunner.createIndex(
      'medication_schedules',
      new TableIndex({
        name: 'IDX_medication_schedules_patientId_scheduledTime',
        columnNames: ['patientId', 'scheduledTime'],
      }),
    );

    // Medication schedules foreign keys
    await queryRunner.createForeignKey(
      'medication_schedules',
      new TableForeignKey({
        columnNames: ['medicationId'],
        referencedTableName: 'medications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_medication_schedules_medicationId',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_schedules',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_medication_schedules_patientId',
      }),
    );

    // ========================================
    // 3. CREATE MEDICATION_ADHERENCE TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'medication_adherence',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'medicationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'patientId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'scheduleId',
            type: 'uuid',
            isNullable: true,
            comment: 'Link to specific schedule if applicable',
          },
          // Adherence details
          {
            name: 'status',
            type: 'enum',
            enum: ['taken', 'missed', 'skipped', 'pending', 'late'],
            isNullable: false,
          },
          {
            name: 'recordedAt',
            type: 'timestamp',
            isNullable: false,
            comment: 'When the adherence was recorded',
          },
          {
            name: 'scheduledTime',
            type: 'timestamp',
            isNullable: true,
            comment: 'Original scheduled time for this dose',
          },
          {
            name: 'takenAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'Actual time medication was taken',
          },
          {
            name: 'dosageTaken',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Actual dosage taken (may differ from prescribed)',
          },
          // Recording method
          {
            name: 'recordMethod',
            type: 'varchar',
            length: '50',
            default: "'manual'",
            comment: 'manual, automatic, device, caregiver',
          },
          {
            name: 'recordedBy',
            type: 'uuid',
            isNullable: true,
            comment: 'User who recorded this (patient or caregiver)',
          },
          // Additional context
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
            comment: 'Reason for missing/skipping',
          },
          {
            name: 'hadSideEffects',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reportedSideEffects',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list',
          },
          // Location data (if recorded via mobile app)
          {
            name: 'location',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores latitude, longitude, address',
          },
          {
            name: 'metadata',
            type: 'jsonb',
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

    // Medication adherence indexes
    await queryRunner.createIndex(
      'medication_adherence',
      new TableIndex({
        name: 'IDX_medication_adherence_medicationId',
        columnNames: ['medicationId'],
      }),
    );

    await queryRunner.createIndex(
      'medication_adherence',
      new TableIndex({
        name: 'IDX_medication_adherence_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'medication_adherence',
      new TableIndex({
        name: 'IDX_medication_adherence_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'medication_adherence',
      new TableIndex({
        name: 'IDX_medication_adherence_recordedAt',
        columnNames: ['recordedAt'],
      }),
    );

    await queryRunner.createIndex(
      'medication_adherence',
      new TableIndex({
        name: 'IDX_medication_adherence_medicationId_recordedAt',
        columnNames: ['medicationId', 'recordedAt'],
      }),
    );

    await queryRunner.createIndex(
      'medication_adherence',
      new TableIndex({
        name: 'IDX_medication_adherence_patientId_recordedAt',
        columnNames: ['patientId', 'recordedAt'],
      }),
    );

    // Medication adherence foreign keys
    await queryRunner.createForeignKey(
      'medication_adherence',
      new TableForeignKey({
        columnNames: ['medicationId'],
        referencedTableName: 'medications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_medication_adherence_medicationId',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_adherence',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_medication_adherence_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_adherence',
      new TableForeignKey({
        columnNames: ['scheduleId'],
        referencedTableName: 'medication_schedules',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_medication_adherence_scheduleId',
      }),
    );

    await queryRunner.createForeignKey(
      'medication_adherence',
      new TableForeignKey({
        columnNames: ['recordedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_medication_adherence_recordedBy',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop medication adherence table
    await queryRunner.dropForeignKey('medication_adherence', 'FK_medication_adherence_recordedBy');
    await queryRunner.dropForeignKey('medication_adherence', 'FK_medication_adherence_scheduleId');
    await queryRunner.dropForeignKey('medication_adherence', 'FK_medication_adherence_patientId');
    await queryRunner.dropForeignKey('medication_adherence', 'FK_medication_adherence_medicationId');
    await queryRunner.dropTable('medication_adherence');

    // Drop medication schedules table
    await queryRunner.dropForeignKey('medication_schedules', 'FK_medication_schedules_patientId');
    await queryRunner.dropForeignKey('medication_schedules', 'FK_medication_schedules_medicationId');
    await queryRunner.dropTable('medication_schedules');

    // Drop medications table
    await queryRunner.dropForeignKey('medications', 'FK_medications_prescribedBy');
    await queryRunner.dropForeignKey('medications', 'FK_medications_patientId');
    await queryRunner.dropTable('medications');
  }
}
