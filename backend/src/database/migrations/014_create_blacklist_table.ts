/**
 * ReshADX - Blacklist Table Migration
 * Manage blocked users, IPs, devices, and entities
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('blacklist', (table) => {
    // Primary Key
    table.uuid('blacklist_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Entry Type
    table.enum('entry_type', [
      'USER',
      'IP_ADDRESS',
      'IP_RANGE',
      'DEVICE',
      'EMAIL',
      'PHONE',
      'CARD_BIN',
      'ACCOUNT_NUMBER',
      'MERCHANT',
      'COUNTRY',
    ]).notNullable();

    // Entry Value
    table.string('entry_value', 500).notNullable(); // The blacklisted value
    table.string('entry_value_hash', 64); // Hashed value for sensitive data
    table.string('entry_value_normalized', 500); // Normalized value for matching

    // For IP ranges
    table.string('ip_range_start', 45);
    table.string('ip_range_end', 45);
    table.string('ip_cidr', 50); // CIDR notation: 192.168.1.0/24

    // Related User (if applicable)
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');

    // Reason & Category
    table.enum('reason_category', [
      'FRAUD',
      'AML',
      'ABUSE',
      'SPAM',
      'POLICY_VIOLATION',
      'SANCTIONS',
      'CHARGEBACK',
      'SUSPICIOUS_ACTIVITY',
      'MANUAL_REVIEW',
      'OTHER',
    ]).notNullable();
    table.text('reason_detail').notNullable(); // Detailed reason
    table.jsonb('evidence'); // Supporting evidence

    // Severity & Impact
    table.enum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('MEDIUM');
    table.boolean('is_permanent').defaultTo(false);
    table.timestamp('expires_at'); // For temporary blacklisting

    // Status
    table.enum('status', ['ACTIVE', 'INACTIVE', 'EXPIRED', 'APPEALED', 'REMOVED']).defaultTo('ACTIVE');
    table.timestamp('status_changed_at');
    table.uuid('status_changed_by'); // Admin who changed status
    table.text('status_change_reason');

    // Source
    table.enum('source', [
      'AUTOMATED',
      'MANUAL',
      'EXTERNAL',
      'SANCTIONS_LIST',
      'PARTNER_REPORT',
      'USER_REPORT',
    ]).notNullable();
    table.string('source_reference', 255); // External reference ID

    // Appeal Information
    table.boolean('appeal_allowed').defaultTo(true);
    table.timestamp('appeal_submitted_at');
    table.text('appeal_reason');
    table.enum('appeal_status', ['PENDING', 'APPROVED', 'REJECTED']);
    table.uuid('appeal_reviewed_by');
    table.timestamp('appeal_reviewed_at');
    table.text('appeal_review_notes');

    // Match Statistics
    table.integer('match_count').defaultTo(0);
    table.timestamp('last_match_at');

    // Metadata
    table.jsonb('metadata');
    table.text('notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by'); // Admin who created entry
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('entry_type');
    table.index('entry_value');
    table.index('entry_value_hash');
    table.index('user_id');
    table.index('status');
    table.index('severity');
    table.index('reason_category');
    table.index(['entry_type', 'status']);
    table.index(['entry_type', 'entry_value']);
    table.index('expires_at');
    table.index('created_at');

    // Unique constraint for type + value
    table.unique(['entry_type', 'entry_value_hash']);
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_blacklist_updated_at BEFORE UPDATE ON blacklist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('blacklist');
}
