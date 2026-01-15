/**
 * ReshADX - Whitelist Table Migration
 * Manage trusted users, IPs, devices, and entities
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('whitelist', (table) => {
    // Primary Key
    table.uuid('whitelist_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Entry Type
    table.enum('entry_type', [
      'USER',
      'IP_ADDRESS',
      'IP_RANGE',
      'DEVICE',
      'EMAIL_DOMAIN',
      'MERCHANT',
      'PARTNER',
      'API_CLIENT',
    ]).notNullable();

    // Entry Value
    table.string('entry_value', 500).notNullable();
    table.string('entry_value_hash', 64);
    table.string('entry_value_normalized', 500);

    // For IP ranges
    table.string('ip_range_start', 45);
    table.string('ip_range_end', 45);
    table.string('ip_cidr', 50);

    // Related User
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');

    // Trust Level
    table.enum('trust_level', ['BASIC', 'ELEVATED', 'HIGH', 'MAXIMUM']).defaultTo('BASIC');

    // Permissions Granted
    table.boolean('skip_fraud_checks').defaultTo(false);
    table.boolean('skip_rate_limiting').defaultTo(false);
    table.boolean('skip_kyc_requirements').defaultTo(false);
    table.integer('elevated_rate_limit'); // Custom rate limit
    table.jsonb('special_permissions');

    // Reason
    table.text('reason').notNullable();
    table.enum('reason_category', [
      'VIP_CUSTOMER',
      'PARTNER',
      'INTERNAL',
      'BETA_TESTER',
      'VERIFIED_BUSINESS',
      'LOW_RISK',
      'OTHER',
    ]).notNullable();

    // Status
    table.enum('status', ['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED']).defaultTo('ACTIVE');
    table.timestamp('status_changed_at');
    table.uuid('status_changed_by');
    table.text('status_change_reason');

    // Validity
    table.timestamp('valid_from').defaultTo(knex.fn.now());
    table.timestamp('valid_until'); // Null for permanent
    table.boolean('is_permanent').defaultTo(false);

    // Review Requirements
    table.boolean('requires_periodic_review').defaultTo(true);
    table.integer('review_interval_days').defaultTo(90);
    table.timestamp('next_review_at');
    table.timestamp('last_reviewed_at');
    table.uuid('last_reviewed_by');

    // Metadata
    table.jsonb('metadata');
    table.text('notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('entry_type');
    table.index('entry_value');
    table.index('entry_value_hash');
    table.index('user_id');
    table.index('status');
    table.index('trust_level');
    table.index(['entry_type', 'status']);
    table.index(['entry_type', 'entry_value']);
    table.index('valid_until');
    table.index('next_review_at');

    // Unique constraint
    table.unique(['entry_type', 'entry_value_hash']);
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_whitelist_updated_at BEFORE UPDATE ON whitelist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('whitelist');
}
