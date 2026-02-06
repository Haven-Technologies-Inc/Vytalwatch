import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Messaging Tables
 *
 * Creates two tables:
 * 1. conversations - patient-provider conversation threads
 * 2. messages - individual encrypted messages within conversations
 *
 * Supports end-to-end encryption, file attachments, read receipts, and compliance tracking.
 */
export class CreateMessaging20260206120500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. CREATE CONVERSATIONS TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
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
            name: 'lastMessageId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'lastMessagePreview',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'lastMessageAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Unread counts
          {
            name: 'patientUnreadCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'providerUnreadCount',
            type: 'int',
            default: 0,
          },
          // Archive and mute settings (per user)
          {
            name: 'patientArchived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'providerArchived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'patientMuted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'providerMuted',
            type: 'boolean',
            default: false,
          },
          // Encryption
          {
            name: 'encryptionKeyId',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Reference to key in encryption_keys table',
          },
          // Metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores patientTyping, providerTyping, tags, priority, subject',
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
          },
        ],
      }),
      true,
    );

    // Conversations indexes
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_patientId_providerId',
        columnNames: ['patientId', 'providerId'],
      }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_updatedAt',
        columnNames: ['updatedAt'],
      }),
    );

    // Conversations foreign keys
    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_conversations_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_conversations_providerId',
      }),
    );

    // ========================================
    // 2. CREATE MESSAGES TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'conversationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['text', 'image', 'file', 'system'],
            default: "'text'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['sent', 'delivered', 'read'],
            default: "'sent'",
          },
          // Encrypted content (AES-256-GCM)
          {
            name: 'encryptedContent',
            type: 'text',
            isNullable: false,
          },
          // Encryption parameters
          {
            name: 'iv',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Initialization vector for encryption',
          },
          {
            name: 'authTag',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Authentication tag for encryption',
          },
          // Plain text content for system messages (not encrypted)
          {
            name: 'plainContent',
            type: 'text',
            isNullable: true,
          },
          // File attachments
          {
            name: 'attachments',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of {id, fileName, fileSize, mimeType, encryptedUrl, thumbnailUrl, scannedForVirus, etc.}',
          },
          // Reply to another message
          {
            name: 'replyToMessageId',
            type: 'uuid',
            isNullable: true,
          },
          // Message metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores edited, editedAt, deleted, deletedAt, reactions, mentions, priority, expiresAt',
          },
          // Read receipts
          {
            name: 'deliveredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Audit trail
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
          },
        ],
      }),
      true,
    );

    // Messages indexes
    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_conversationId',
        columnNames: ['conversationId'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_senderId',
        columnNames: ['senderId'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_conversationId_createdAt',
        columnNames: ['conversationId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_senderId_createdAt',
        columnNames: ['senderId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_status_createdAt',
        columnNames: ['status', 'createdAt'],
      }),
    );

    // Messages foreign keys
    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['conversationId'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_messages_conversationId',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['senderId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_messages_senderId',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['replyToMessageId'],
        referencedTableName: 'messages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_messages_replyToMessageId',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop messages table
    await queryRunner.dropForeignKey('messages', 'FK_messages_replyToMessageId');
    await queryRunner.dropForeignKey('messages', 'FK_messages_senderId');
    await queryRunner.dropForeignKey('messages', 'FK_messages_conversationId');
    await queryRunner.dropTable('messages');

    // Drop conversations table
    await queryRunner.dropForeignKey('conversations', 'FK_conversations_providerId');
    await queryRunner.dropForeignKey('conversations', 'FK_conversations_patientId');
    await queryRunner.dropTable('conversations');
  }
}
