/**
 * ReshADX - Items Table Migration
 * Items represent user connections to financial institutions (similar to Plaid's Item)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('items', (table) => {
    // Primary Key
    table.uuid('item_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('institution_id').notNullable().references('institution_id').inTable('institutions').onDelete('RESTRICT');

    // Access Tokens (Encrypted)
    table.text('access_token').notNullable().unique(); // Encrypted token
    table.text('refresh_token'); // Encrypted refresh token
    table.timestamp('access_token_expires_at');
    table.timestamp('refresh_token_expires_at');

    // Link Session Information
    table.string('link_session_id', 255);
    table.string('public_token', 255);
    table.timestamp('public_token_expires_at');

    // Connection Method
    table.enum('connection_method', [
      'CREDENTIALS',
      'OAUTH',
      'USSD',
      'SMS_OTP',
      'BIOMETRIC',
      'AGENT_ASSISTED',
    ]).notNullable();

    // Status
    table.enum('status', [
      'ACTIVE',
      'INACTIVE',
      'REQUIRES_UPDATE',
      'LOGIN_REQUIRED',
      'LOCKED',
      'ERROR',
    ]).defaultTo('ACTIVE');
    table.text('status_message');
    table.text('error_code');
    table.text('error_message');
    table.timestamp('last_status_change');

    // Consent & Permissions
    table.jsonb('granted_scopes'); // ['accounts', 'transactions', 'balance', 'identity', 'payments']
    table.timestamp('consent_granted_at');
    table.timestamp('consent_expires_at');
    table.integer('consent_duration_days').defaultTo(90); // African regulation: typically 90 days
    table.boolean('consent_renewable').defaultTo(true);
    table.integer('renewal_count').defaultTo(0);

    // Webhook Configuration
    table.string('webhook_url', 500);
    table.boolean('webhook_enabled').defaultTo(true);
    table.timestamp('last_webhook_sent');
    table.integer('webhook_failure_count').defaultTo(0);

    // Sync Status
    table.timestamp('last_successful_sync');
    table.timestamp('last_sync_attempt');
    table.integer('consecutive_failures').defaultTo(0);
    table.enum('sync_status', ['SYNCED', 'SYNCING', 'FAILED', 'STALE']).defaultTo('SYNCED');
    table.timestamp('next_scheduled_sync');

    // Mobile Money Specific
    table.string('mm_wallet_number', 20); // Mobile money wallet number
    table.string('mm_wallet_name', 255);
    table.boolean('mm_agent_verified').defaultTo(false);
    table.string('mm_agent_code', 50);

    // Security & Fraud Detection
    table.string('device_id', 255);
    table.string('device_fingerprint', 255);
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.boolean('suspicious_activity').defaultTo(false);
    table.timestamp('last_suspicious_activity');

    // Session Management
    table.boolean('auto_sync_enabled').defaultTo(true);
    table.integer('sync_frequency_hours').defaultTo(24);
    table.timestamp('user_last_accessed');

    // Offline Support
    table.boolean('offline_mode_enabled').defaultTo(false);
    table.timestamp('last_offline_sync');
    table.jsonb('offline_cache'); // Cached data for offline access

    // Statistics
    table.integer('total_accounts').defaultTo(0);
    table.integer('total_transactions').defaultTo(0);
    table.timestamp('first_transaction_date');
    table.timestamp('latest_transaction_date');

    // Metadata
    table.jsonb('metadata');
    table.jsonb('institution_metadata'); // Institution-specific data

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at'); // Soft delete

    // Indexes
    table.index('user_id');
    table.index('institution_id');
    table.index('status');
    table.index(['user_id', 'institution_id']);
    table.index('last_successful_sync');
    table.index('consent_expires_at');
    table.index('created_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('items');
}
