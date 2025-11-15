/**
 * ReshADX - Audit Logs Table Migration
 * Comprehensive audit trail for compliance and security
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    // Primary Key
    table.uuid('log_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Actor (Who performed the action)
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.uuid('api_key_id').references('api_key_id').inTable('api_keys').onDelete('SET NULL');
    table.string('actor_type', 50); // USER, API_KEY, SYSTEM, ADMIN
    table.string('actor_name', 255); // For display
    table.string('actor_email', 255);

    // Action (What was done)
    table.string('action', 100).notNullable(); // CREATE, READ, UPDATE, DELETE, LOGIN, etc.
    table.string('resource_type', 100).notNullable(); // USER, ACCOUNT, TRANSACTION, ITEM, etc.
    table.uuid('resource_id'); // ID of the resource
    table.text('resource_name'); // Name/identifier for display

    // Event Details
    table.enum('event_type', [
      'AUTHENTICATION',
      'AUTHORIZATION',
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'CONFIGURATION_CHANGE',
      'SECURITY_EVENT',
      'COMPLIANCE_EVENT',
      'SYSTEM_EVENT',
    ]).notNullable();
    table.enum('severity', ['INFO', 'WARNING', 'ERROR', 'CRITICAL']).defaultTo('INFO');
    table.text('description'); // Human-readable description
    table.text('summary'); // Short summary

    // Request Information
    table.string('http_method', 10); // GET, POST, PUT, DELETE, etc.
    table.text('endpoint'); // API endpoint called
    table.string('request_id', 255); // Trace ID for correlation
    table.string('session_id', 255);

    // Network Information
    table.string('ip_address', 45); // IPv6 support
    table.string('user_agent', 500);
    table.string('device_id', 255);
    table.string('country', 2);
    table.string('city', 100);
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);

    // Changes (Before/After for auditing)
    table.jsonb('before_state'); // State before the change
    table.jsonb('after_state'); // State after the change
    table.jsonb('changes'); // Specific fields changed
    table.jsonb('metadata'); // Additional context

    // Status & Result
    table.enum('status', ['SUCCESS', 'FAILURE', 'PARTIAL']).notNullable();
    table.text('error_message');
    table.string('error_code', 50);

    // Compliance & Security
    table.boolean('pii_accessed').defaultTo(false); // Personally Identifiable Information
    table.boolean('sensitive_data_accessed').defaultTo(false);
    table.jsonb('compliance_tags'); // ['GDPR', 'NDPR', 'PCI_DSS', etc.]
    table.boolean('requires_review').defaultTo(false);
    table.boolean('suspicious_activity').defaultTo(false);

    // Data Access Tracking (for GDPR/NDPR compliance)
    table.enum('data_access_purpose', [
      'USER_REQUEST',
      'BUSINESS_OPERATION',
      'ANALYTICS',
      'SUPPORT',
      'FRAUD_INVESTIGATION',
      'REGULATORY_COMPLIANCE',
      'SYSTEM_MAINTENANCE',
    ]);
    table.text('access_justification');

    // Retention Policy
    table.timestamp('retention_until'); // When this log can be deleted
    table.boolean('permanent_retention').defaultTo(false); // Never delete

    // Review & Investigation
    table.uuid('reviewed_by'); // Admin user ID
    table.timestamp('reviewed_at');
    table.text('review_notes');
    table.enum('review_status', ['PENDING', 'APPROVED', 'FLAGGED', 'INVESTIGATED']).defaultTo('PENDING');

    // Timestamps
    table.timestamp('occurred_at').notNullable(); // When the event occurred
    table.timestamp('created_at').defaultTo(knex.fn.now()); // When the log was created

    // Indexes for fast querying
    table.index('user_id');
    table.index('action');
    table.index('resource_type');
    table.index('event_type');
    table.index('severity');
    table.index('occurred_at');
    table.index(['user_id', 'occurred_at']);
    table.index(['resource_type', 'resource_id']);
    table.index('pii_accessed');
    table.index('suspicious_activity');
    table.index('requires_review');
    table.index('ip_address');
    table.index('status');
  });

  // Create partitioning comment (implement in production)
  await knex.raw(`
    -- For production, partition this table by occurred_at for better performance
    -- Suggested partitioning: Monthly or quarterly partitions
    -- ALTER TABLE audit_logs PARTITION BY RANGE (occurred_at);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
