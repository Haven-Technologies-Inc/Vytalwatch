/**
 * ReshADX - API Keys Table Migration
 * Developer API key management
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (table) => {
    // Primary Key
    table.uuid('api_key_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');

    // API Key Details
    table.string('key_name', 255).notNullable(); // User-friendly name
    table.text('key_hash').notNullable().unique(); // SHA-256 hash of the key
    table.string('key_prefix', 20).notNullable(); // First 8 chars for identification
    table.string('key_hint', 10); // Last 4 chars for display

    // Environment
    table.enum('environment', ['SANDBOX', 'DEVELOPMENT', 'PRODUCTION']).defaultTo('SANDBOX');

    // Permissions & Scopes
    table.jsonb('scopes').notNullable(); // ['auth', 'transactions', 'balance', 'identity', 'payments']
    table.jsonb('permissions'); // Granular permissions

    // Product Access
    table.boolean('can_access_auth').defaultTo(true);
    table.boolean('can_access_transactions').defaultTo(true);
    table.boolean('can_access_balance').defaultTo(true);
    table.boolean('can_access_identity').defaultTo(false);
    table.boolean('can_access_investments').defaultTo(false);
    table.boolean('can_access_liabilities').defaultTo(false);
    table.boolean('can_access_payments').defaultTo(false);
    table.boolean('can_access_credit_score').defaultTo(false);
    table.boolean('can_access_risk_api').defaultTo(false);

    // Write Permissions
    table.boolean('can_create_items').defaultTo(true);
    table.boolean('can_delete_items').defaultTo(true);
    table.boolean('can_initiate_payments').defaultTo(false);
    table.boolean('can_create_webhooks').defaultTo(true);

    // Status
    table.enum('status', ['ACTIVE', 'INACTIVE', 'REVOKED', 'EXPIRED']).defaultTo('ACTIVE');
    table.timestamp('status_changed_at');
    table.text('revocation_reason');

    // Rate Limiting
    table.enum('rate_limit_tier', [
      'FREE',
      'STARTUP',
      'GROWTH',
      'BUSINESS',
      'ENTERPRISE',
    ]).defaultTo('FREE');
    table.integer('rate_limit_per_minute'); // Custom rate limit
    table.integer('rate_limit_per_hour');
    table.integer('rate_limit_per_day');

    // Usage Statistics
    table.bigInteger('total_requests').defaultTo(0);
    table.bigInteger('successful_requests').defaultTo(0);
    table.bigInteger('failed_requests').defaultTo(0);
    table.timestamp('last_used_at');
    table.string('last_used_ip', 45);
    table.timestamp('first_used_at');

    // Security
    table.jsonb('allowed_ip_addresses'); // IP whitelist
    table.jsonb('allowed_domains'); // Domain whitelist for CORS
    table.string('webhook_url', 500);
    table.string('webhook_secret', 255); // For webhook signature verification

    // Expiration
    table.timestamp('expires_at');
    table.boolean('auto_rotate').defaultTo(false); // Auto-rotation enabled
    table.integer('rotation_days'); // Rotate every N days

    // Metadata
    table.text('description');
    table.jsonb('metadata');
    table.string('application_name', 255); // Name of app using this key
    table.string('application_url', 500);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at'); // Soft delete

    // Indexes
    table.index('user_id');
    table.index('key_hash');
    table.index('key_prefix');
    table.index('status');
    table.index('environment');
    table.index(['user_id', 'status']);
    table.index('expires_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
}
