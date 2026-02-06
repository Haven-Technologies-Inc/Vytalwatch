import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Device Tokens Table
 *
 * Creates the device_tokens table for managing push notification tokens.
 * Supports iOS (APNS), Android (FCM), and Web Push notifications.
 * Includes user preferences, quiet hours, and failure tracking.
 */
export class CreateDeviceTokens20260206120800 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
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
            name: 'token',
            type: 'varchar',
            length: '500',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'platform',
            type: 'enum',
            enum: ['ios', 'android', 'web'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'invalid', 'disabled'],
            default: "'active'",
          },
          // Device information
          {
            name: 'deviceInfo',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores deviceId, deviceName, model, osVersion, appVersion, manufacturer, locale, timezone',
          },
          // Token status
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Failure tracking
          {
            name: 'failureCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastFailureAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastErrorMessage',
            type: 'text',
            isNullable: true,
          },
          // Badge count for iOS
          {
            name: 'badgeCount',
            type: 'int',
            default: 0,
          },
          // User preferences for this device
          {
            name: 'preferences',
            type: 'jsonb',
            default: "'{}'",
            comment: 'Stores soundEnabled, vibrationEnabled, mutedCategories, quietHoursStart, quietHoursEnd, quietHoursTimezone',
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
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_platform',
        columnNames: ['platform'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_enabled',
        columnNames: ['enabled'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );

    // Composite indexes for common query patterns
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_userId_enabled',
        columnNames: ['userId', 'enabled'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_platform_enabled',
        columnNames: ['platform', 'enabled'],
      }),
    );

    // Foreign key constraints
    await queryRunner.createForeignKey(
      'device_tokens',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_device_tokens_userId',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('device_tokens', 'FK_device_tokens_userId');
    await queryRunner.dropTable('device_tokens');
  }
}
