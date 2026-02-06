import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create AI Conversations Tables
 *
 * Creates two tables for AI-powered chat:
 * 1. ai_conversations - conversation threads with AI assistant
 * 2. ai_messages - individual messages within conversations
 *
 * Supports multiple AI models, token tracking, cost calculation, and PHI compliance.
 */
export class CreateAIConversations20260206120900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. CREATE AI_CONVERSATIONS TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'ai_conversations',
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
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'general_chat',
              'vital_analysis',
              'patient_insight',
              'health_summary',
              'alert_recommendation',
              'clinical_decision',
            ],
            default: "'general_chat'",
          },
          {
            name: 'context',
            type: 'text',
            isNullable: true,
          },
          // Message tracking
          {
            name: 'messageCount',
            type: 'int',
            default: 0,
          },
          // Token and cost tracking
          {
            name: 'totalTokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalCost',
            type: 'decimal',
            precision: 10,
            scale: 6,
            default: 0,
          },
          // Last message info
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
          // Model configuration
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            default: "'gpt-4'",
          },
          {
            name: 'systemPrompt',
            type: 'text',
            isNullable: true,
            comment: 'System prompt used for this conversation',
          },
          // Conversation summary
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
            comment: 'Generated periodically for long conversations',
          },
          {
            name: 'summarizedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Tags for categorization
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated tags',
          },
          // Associated entities
          {
            name: 'patientId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'providerId',
            type: 'uuid',
            isNullable: true,
          },
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
          // Sharing settings
          {
            name: 'sharedWithProvider',
            type: 'boolean',
            default: false,
          },
          {
            name: 'sharedWithUserIds',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated user IDs',
          },
          // Privacy and compliance
          {
            name: 'containsPHI',
            type: 'boolean',
            default: false,
          },
          {
            name: 'hipaaCompliant',
            type: 'boolean',
            default: false,
          },
          {
            name: 'contentFiltered',
            type: 'boolean',
            default: false,
          },
          // Archival
          {
            name: 'archived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'pinned',
            type: 'boolean',
            default: false,
          },
          // Conversation settings
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores temperature, maxTokens, streamingEnabled, contextWindowSize',
          },
          // Metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores source, userAgent, ipAddress, exportedAt, rating, feedback',
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

    // AI Conversations indexes
    await queryRunner.createIndex(
      'ai_conversations',
      new TableIndex({
        name: 'IDX_ai_conversations_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'ai_conversations',
      new TableIndex({
        name: 'IDX_ai_conversations_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'ai_conversations',
      new TableIndex({
        name: 'IDX_ai_conversations_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_conversations',
      new TableIndex({
        name: 'IDX_ai_conversations_updatedAt',
        columnNames: ['updatedAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_conversations',
      new TableIndex({
        name: 'IDX_ai_conversations_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    // AI Conversations foreign keys
    await queryRunner.createForeignKey(
      'ai_conversations',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_ai_conversations_userId',
      }),
    );

    // ========================================
    // 2. CREATE AI_MESSAGES TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'ai_messages',
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
            name: 'role',
            type: 'enum',
            enum: ['user', 'assistant', 'system'],
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'streaming', 'completed', 'failed', 'stopped'],
            default: "'completed'",
          },
          // Token usage
          {
            name: 'promptTokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'completionTokens',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalTokens',
            type: 'int',
            default: 0,
          },
          // Cost
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 6,
            default: 0,
          },
          // Model used
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          // Streaming metadata
          {
            name: 'streamStartedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'streamCompletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'streamChunks',
            type: 'int',
            default: 0,
          },
          // Response time
          {
            name: 'responseTime',
            type: 'int',
            isNullable: true,
            comment: 'Response time in milliseconds',
          },
          // Content safety
          {
            name: 'contentFiltered',
            type: 'boolean',
            default: false,
          },
          {
            name: 'contentFilterFlags',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated flags',
          },
          {
            name: 'containsPHI',
            type: 'boolean',
            default: false,
          },
          // Function calling
          {
            name: 'functionCall',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores name, arguments for function calling',
          },
          {
            name: 'toolCalls',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of tool calls',
          },
          // Error tracking
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorCode',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          // Metadata
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores temperature, topP, penalties, stopReason, finishReason, citations, rating, feedback, etc.',
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
            isNullable: true,
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

    // AI Messages indexes
    await queryRunner.createIndex(
      'ai_messages',
      new TableIndex({
        name: 'IDX_ai_messages_conversationId',
        columnNames: ['conversationId'],
      }),
    );

    await queryRunner.createIndex(
      'ai_messages',
      new TableIndex({
        name: 'IDX_ai_messages_role',
        columnNames: ['role'],
      }),
    );

    await queryRunner.createIndex(
      'ai_messages',
      new TableIndex({
        name: 'IDX_ai_messages_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'ai_messages',
      new TableIndex({
        name: 'IDX_ai_messages_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_messages',
      new TableIndex({
        name: 'IDX_ai_messages_conversationId_createdAt',
        columnNames: ['conversationId', 'createdAt'],
      }),
    );

    // AI Messages foreign keys
    await queryRunner.createForeignKey(
      'ai_messages',
      new TableForeignKey({
        columnNames: ['conversationId'],
        referencedTableName: 'ai_conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_ai_messages_conversationId',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop ai_messages table
    await queryRunner.dropForeignKey('ai_messages', 'FK_ai_messages_conversationId');
    await queryRunner.dropTable('ai_messages');

    // Drop ai_conversations table
    await queryRunner.dropForeignKey('ai_conversations', 'FK_ai_conversations_userId');
    await queryRunner.dropTable('ai_conversations');
  }
}
