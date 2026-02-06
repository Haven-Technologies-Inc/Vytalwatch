import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Tasks Table
 *
 * Creates the tasks table with all necessary columns, indexes, and foreign key constraints.
 * Tasks are used for tracking various care-related activities and assignments.
 */
export class CreateTasks20260206120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tasks table
    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'vitals_check',
              'medication_reminder',
              'appointment',
              'follow_up_call',
              'device_setup',
              'provider_review',
              'clinical_assessment',
              'patient_education',
              'care_plan_update',
              'custom',
            ],
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'",
            isNullable: false,
          },
          {
            name: 'patientId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assignedTo',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dueDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'completionNotes',
            type: 'text',
            isNullable: true,
          },
          // Related resources
          {
            name: 'vitalReadingId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'alertId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'appointmentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'medicationId',
            type: 'uuid',
            isNullable: true,
          },
          // Recurrence fields
          {
            name: 'isRecurring',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recurrencePattern',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'daily, weekly, monthly',
          },
          {
            name: 'recurrenceInterval',
            type: 'int',
            isNullable: true,
            comment: 'every N days/weeks/months',
          },
          {
            name: 'recurrenceEndDate',
            type: 'timestamp',
            isNullable: true,
          },
          // Reminder fields
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
          // Metadata
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

    // Create indexes for performance optimization
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_assignedTo',
        columnNames: ['assignedTo'],
      }),
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_dueDate',
        columnNames: ['dueDate'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_patientId_status',
        columnNames: ['patientId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_assignedTo_status',
        columnNames: ['assignedTo', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_dueDate_status',
        columnNames: ['dueDate', 'status'],
      }),
    );

    // Foreign key constraints
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_tasks_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['assignedTo'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_tasks_assignedTo',
      }),
    );

    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_tasks_createdBy',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('tasks', 'FK_tasks_createdBy');
    await queryRunner.dropForeignKey('tasks', 'FK_tasks_assignedTo');
    await queryRunner.dropForeignKey('tasks', 'FK_tasks_patientId');

    // Drop table (indexes will be dropped automatically)
    await queryRunner.dropTable('tasks');
  }
}
