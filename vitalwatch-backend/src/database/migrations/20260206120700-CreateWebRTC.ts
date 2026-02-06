import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create WebRTC Tables
 *
 * Creates three tables for video/audio calling:
 * 1. calls - main call records
 * 2. call_participants - participant tracking within calls
 * 3. call_recordings - recording management and storage
 *
 * Supports HIPAA-compliant video calling with encryption, recording, transcription, and quality metrics.
 */
export class CreateWebRTC20260206120700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. CREATE CALLS TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'calls',
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
          // Call details
          {
            name: 'type',
            type: 'enum',
            enum: ['video', 'audio', 'screen_share'],
            default: "'video'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['scheduled', 'ringing', 'in_progress', 'ended', 'cancelled', 'failed', 'missed'],
            default: "'scheduled'",
          },
          // Timing
          {
            name: 'scheduledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
            comment: 'Expected duration in seconds',
          },
          {
            name: 'actualDuration',
            type: 'int',
            isNullable: true,
            comment: 'Actual call duration in seconds',
          },
          // Room/session details
          {
            name: 'roomId',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Initiator
          {
            name: 'initiatedBy',
            type: 'uuid',
            isNullable: false,
          },
          // Related resources
          {
            name: 'appointmentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'clinicalNoteId',
            type: 'uuid',
            isNullable: true,
          },
          // Call quality metrics
          {
            name: 'qualityMetrics',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores averageBandwidth, averageLatency, packetLoss, jitter, videoResolution, audioQuality, connectionType',
          },
          // Connection info
          {
            name: 'stunServers',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list',
          },
          {
            name: 'turnServers',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list',
          },
          // End reason
          {
            name: 'endReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'endedBy',
            type: 'uuid',
            isNullable: true,
          },
          // Failure info
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorDetails',
            type: 'jsonb',
            isNullable: true,
          },
          // Recording
          {
            name: 'recordingEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recordingConsentObtained',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recordingConsentedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'recordingConsentedBy',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated user IDs who consented',
          },
          // HIPAA compliance
          {
            name: 'isEncrypted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isHIPAACompliant',
            type: 'boolean',
            default: false,
          },
          {
            name: 'encryptionKey',
            type: 'text',
            isNullable: true,
            comment: 'Encrypted storage of encryption key',
          },
          // Fallback handling
          {
            name: 'fellbackToAudio',
            type: 'boolean',
            default: false,
          },
          {
            name: 'fallbackReason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fallbackAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Reconnection tracking
          {
            name: 'reconnectionAttempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastReconnectionAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Metadata
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

    // Calls indexes
    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_roomId',
        columnNames: ['roomId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_patientId',
        columnNames: ['patientId'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_providerId',
        columnNames: ['providerId'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_scheduledAt',
        columnNames: ['scheduledAt'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_appointmentId',
        columnNames: ['appointmentId'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_patientId_createdAt',
        columnNames: ['patientId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_providerId_createdAt',
        columnNames: ['providerId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_calls_status_scheduledAt',
        columnNames: ['status', 'scheduledAt'],
      }),
    );

    // Calls foreign keys
    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_calls_patientId',
      }),
    );

    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        columnNames: ['providerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_calls_providerId',
      }),
    );

    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        columnNames: ['initiatedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_calls_initiatedBy',
      }),
    );

    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_calls_createdBy',
      }),
    );

    // ========================================
    // 2. CREATE CALL_PARTICIPANTS TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'call_participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'callId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['invited', 'joining', 'connected', 'disconnected', 'left'],
            default: "'invited'",
          },
          // Timing
          {
            name: 'invitedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'leftAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'participationDuration',
            type: 'int',
            isNullable: true,
            comment: 'Duration in seconds',
          },
          // Connection details
          {
            name: 'socketId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'peerId',
            type: 'varchar',
            length: '255',
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
          // Media streams
          {
            name: 'videoEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'audioEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'screenShareEnabled',
            type: 'boolean',
            default: false,
          },
          // Connection quality
          {
            name: 'connectionQuality',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores bandwidth, latency, packetLoss, jitter',
          },
          // Disconnection tracking
          {
            name: 'disconnectionCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastDisconnectedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'disconnectionReason',
            type: 'text',
            isNullable: true,
          },
          // Consent
          {
            name: 'consentedToRecording',
            type: 'boolean',
            default: false,
          },
          {
            name: 'consentedToRecordingAt',
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
        ],
      }),
      true,
    );

    // Call participants indexes
    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_call_participants_callId',
        columnNames: ['callId'],
      }),
    );

    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_call_participants_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_call_participants_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_call_participants_callId_userId',
        columnNames: ['callId', 'userId'],
      }),
    );

    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_call_participants_callId_status',
        columnNames: ['callId', 'status'],
      }),
    );

    // Call participants foreign keys
    await queryRunner.createForeignKey(
      'call_participants',
      new TableForeignKey({
        columnNames: ['callId'],
        referencedTableName: 'calls',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_call_participants_callId',
      }),
    );

    await queryRunner.createForeignKey(
      'call_participants',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_call_participants_userId',
      }),
    );

    // ========================================
    // 3. CREATE CALL_RECORDINGS TABLE
    // ========================================
    await queryRunner.createTable(
      new Table({
        name: 'call_recordings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'callId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'recording', 'processing', 'completed', 'failed'],
            default: "'pending'",
          },
          // File details
          {
            name: 'fileName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'filePath',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'fileUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Presigned URL or CDN URL',
          },
          {
            name: 'fileSize',
            type: 'bigint',
            isNullable: true,
            comment: 'Size in bytes',
          },
          {
            name: 'mimeType',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
            comment: 'Duration in seconds',
          },
          // Recording details
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'stoppedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'startedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'stoppedBy',
            type: 'uuid',
            isNullable: true,
          },
          // Consent tracking
          {
            name: 'consentObtained',
            type: 'boolean',
            default: false,
          },
          {
            name: 'consentedParticipants',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated user IDs',
          },
          {
            name: 'consentObtainedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'consentDetails',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores method, timestamp, participantIds, ipAddresses',
          },
          // HIPAA compliance
          {
            name: 'isEncrypted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isHIPAACompliant',
            type: 'boolean',
            default: false,
          },
          {
            name: 'encryptionAlgorithm',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'encryptionKeyId',
            type: 'text',
            isNullable: true,
            comment: 'Reference to key in key management system',
          },
          {
            name: 'encryptedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Storage details
          {
            name: 'storageProvider',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'aws-s3, azure-blob, gcp-storage',
          },
          {
            name: 'storageBucket',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'storageKey',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'storageRegion',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Retention policy
          {
            name: 'retentionPeriod',
            type: 'int',
            isNullable: true,
            comment: 'Days',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isArchived',
            type: 'boolean',
            default: false,
          },
          {
            name: 'archivedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Processing
          {
            name: 'processingProgress',
            type: 'int',
            default: 0,
            comment: '0-100',
          },
          {
            name: 'processingError',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          // Transcription (if enabled)
          {
            name: 'isTranscribed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'transcriptionText',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'transcriptionUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'transcriptionData',
            type: 'jsonb',
            isNullable: true,
            comment: 'Stores words array and speakers array with detailed transcription data',
          },
          // Access tracking
          {
            name: 'viewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastViewedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastViewedBy',
            type: 'uuid',
            isNullable: true,
          },
          // Audit
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
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

    // Call recordings indexes
    await queryRunner.createIndex(
      'call_recordings',
      new TableIndex({
        name: 'IDX_call_recordings_callId',
        columnNames: ['callId'],
      }),
    );

    await queryRunner.createIndex(
      'call_recordings',
      new TableIndex({
        name: 'IDX_call_recordings_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'call_recordings',
      new TableIndex({
        name: 'IDX_call_recordings_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'call_recordings',
      new TableIndex({
        name: 'IDX_call_recordings_callId_status',
        columnNames: ['callId', 'status'],
      }),
    );

    // Call recordings foreign keys
    await queryRunner.createForeignKey(
      'call_recordings',
      new TableForeignKey({
        columnNames: ['callId'],
        referencedTableName: 'calls',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_call_recordings_callId',
      }),
    );

    await queryRunner.createForeignKey(
      'call_recordings',
      new TableForeignKey({
        columnNames: ['createdBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_call_recordings_createdBy',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop call recordings table
    await queryRunner.dropForeignKey('call_recordings', 'FK_call_recordings_createdBy');
    await queryRunner.dropForeignKey('call_recordings', 'FK_call_recordings_callId');
    await queryRunner.dropTable('call_recordings');

    // Drop call participants table
    await queryRunner.dropForeignKey('call_participants', 'FK_call_participants_userId');
    await queryRunner.dropForeignKey('call_participants', 'FK_call_participants_callId');
    await queryRunner.dropTable('call_participants');

    // Drop calls table
    await queryRunner.dropForeignKey('calls', 'FK_calls_createdBy');
    await queryRunner.dropForeignKey('calls', 'FK_calls_initiatedBy');
    await queryRunner.dropForeignKey('calls', 'FK_calls_providerId');
    await queryRunner.dropForeignKey('calls', 'FK_calls_patientId');
    await queryRunner.dropTable('calls');
  }
}
