import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Appointments Table
 *
 * Creates the appointments table for scheduling patient-provider encounters.
 * Supports telehealth, in-person, and phone appointments with recurrence patterns.
 * Includes reminders, confirmation tracking, and clinical documentation.
 */
export class CreateAppointments20260206120400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'appointments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          // Participants
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
          // Appointment details
          {
            name: 'type',
            type: 'enum',
            enum: ['telehealth', 'in_person', 'phone', 'follow_up', 'initial_consult', 'emergency'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
            default: "'scheduled'",
            isNullable: false,
          },
          {
            name: 'scheduledAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'int',
            default: 30,
            comment: 'Duration in minutes',
          },
          {
            name: 'endTime',
            type: 'timestamp',
            isNullable: true,
          },
          // Location/meeting details
          {
            name: 'location',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Physical address for in-person',
          },
          {
            name: 'meetingUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'For telehealth appointments',
          },
          {
            name: 'meetingId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'meetingPassword',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'roomNumber',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'For in-person appointments',
          },
          // Appointment content
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'chiefComplaint',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reasonForVisit',
            type: 'text',
            isNullable: true,
          },
          // Clinical documentation
          {
            name: 'clinicalNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'diagnosis',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'treatmentPlan',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'prescriptions',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of {medication, dosage, frequency, duration}',
          },
          {
            name: 'followUpInstructions',
            type: 'text',
            isNullable: true,
          },
          // Completion tracking
          {
            name: 'startedAt',
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
          // Cancellation
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelledBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cancellationReason',
            type: 'text',
            isNullable: true,
          },
          // Confirmation
          {
            name: 'isConfirmed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'confirmedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'confirmedBy',
            type: 'uuid',
            isNullable: true,
          },
          // Reminders
          {
            name: 'reminder24HourSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reminder24HourSentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reminder1HourSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reminder1HourSentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reminderTypes',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated: email, sms, push',
          },
          // Recurrence
          {
            name: 'isRecurring',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recurrencePattern',
            type: 'enum',
            enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly'],
            default: "'none'",
          },
          {
            name: 'recurrenceInterval',
            type: 'int',
            isNullable: true,
            comment: 'Every N days/weeks/months',
          },
          {
            name: 'recurrenceDaysOfWeek',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated 0-6 for weekly recurrence',
          },
          {
            name: 'recurrenceEndDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'parentAppointmentId',
            type: 'uuid',
            isNullable: true,
            comment: 'For recurring appointments',
          },
          {
            name: 'isRecurrenceException',
            type: 'boolean',
            default: false,
            comment: 'Modified instance of recurring series',
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
            name: 'taskId',
            type: 'uuid',
            isNullable: true,
          },
          // Billing
          {
            name: 'isBillable',
            type: 'boolean',
            default: false,
          },
          {
            name: 'claimId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'estimatedCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'actualCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          // Timezone handling
          {
            name: 'timezone',
            type: 'varchar',
            length: '100',
            default: "'UTC'",
          },
          // Additional metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          // Audit
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
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_providerId',
        columnNames: ['providerId'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_scheduledAt',
        columnNames: ['scheduledAt'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_patientId_scheduledAt',
        columnNames: ['patientId', 'scheduledAt'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_providerId_scheduledAt',
        columnNames: ['providerId', 'scheduledAt'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_status_scheduledAt',
        columnNames: ['status', 'scheduledAt'],
      }),
    );

    // Foreign key constraints
    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_appointments_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_appointments_providerId',
      }),
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_appointments_createdBy',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('appointments', 'FK_appointments_createdBy');
    await queryRunner.dropForeignKey('appointments', 'FK_appointments_providerId');
    await queryRunner.dropForeignKey('appointments', 'FK_appointments_patientId');
    await queryRunner.dropTable('appointments');
  }
}
